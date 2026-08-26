import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware/auth";
import { badRequest } from "../utils/errors";

export const salesRouter = Router();
salesRouter.use(requireAuth);

salesRouter.get("/", async (req, res) => {
  const { from, to, customerId } = req.query as Record<string, string | undefined>;
  const sales = await prisma.sale.findMany({
    where: {
      customerId: customerId || undefined,
      createdAt: {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined,
      },
    },
    include: { customer: true, user: true, items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(sales);
});

salesRouter.get("/:id", async (req, res) => {
  const sale = await prisma.sale.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { customer: true, user: true, items: { include: { product: true } } },
  });
  res.json(sale);
});

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const createSaleSchema = z.object({
  customerId: z.string().optional().or(z.literal("")),
  paymentMethod: z.enum(["CASH", "CARD", "ONLINE", "STORE_CREDIT"]).default("CASH"),
  discount: z.number().nonnegative().default(0),
  taxRate: z.number().min(0).max(1).default(0),
  items: z.array(itemSchema).min(1),
});

// Create a POS sale: validates stock, computes totals server-side,
// decrements inventory, and logs stock movements — all atomically.
salesRouter.post("/", async (req, res) => {
  const data = createSaleSchema.parse(req.body);
  const userId = req.user!.sub;

  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  let subtotal = 0;
  const lineItems = data.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) throw badRequest(`Product ${item.productId} not found`);
    if (product.quantity < item.quantity) {
      throw badRequest(`Insufficient stock for "${product.name}" (have ${product.quantity}, need ${item.quantity})`);
    }
    const lineSubtotal = product.sellPrice * item.quantity;
    subtotal += lineSubtotal;
    return {
      productId: product.id,
      quantity: item.quantity,
      unitPrice: product.sellPrice,
      subtotal: lineSubtotal,
    };
  });

  const discount = Math.min(data.discount, subtotal);
  const taxable = subtotal - discount;
  const tax = Number((taxable * data.taxRate).toFixed(2));
  const total = Number((taxable + tax).toFixed(2));

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        customerId: data.customerId || null,
        userId,
        paymentMethod: data.paymentMethod,
        subtotal,
        discount,
        tax,
        total,
        items: { create: lineItems },
      },
      include: { items: { include: { product: true } }, customer: true, user: true },
    });

    for (const item of lineItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { decrement: item.quantity } },
      });
      await tx.stockMovement.create({
        data: { productId: item.productId, change: -item.quantity, reason: "SALE" },
      });
    }

    return created;
  });

  res.status(201).json(sale);
});

// Void a sale and restock its items.
salesRouter.post("/:id/void", async (req, res) => {
  const sale = await prisma.sale.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { items: true },
  });
  if (sale.status !== "COMPLETED") throw badRequest("Only completed sales can be voided");

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({ where: { id: sale.id }, data: { status: "VOID" } });
    for (const item of sale.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { increment: item.quantity } },
      });
      await tx.stockMovement.create({
        data: { productId: item.productId, change: item.quantity, reason: "RETURN" },
      });
    }
  });

  res.json({ ok: true });
});
