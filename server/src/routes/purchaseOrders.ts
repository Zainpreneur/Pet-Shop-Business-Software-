import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { badRequest } from "../utils/errors";

export const purchaseOrdersRouter = Router();
purchaseOrdersRouter.use(requireAuth);

purchaseOrdersRouter.get("/", async (req, res) => {
  const status = req.query.status as string | undefined;
  const orders = await prisma.purchaseOrder.findMany({
    where: status ? { status: status as never } : undefined,
    include: { supplier: true, items: { include: { product: true } } },
    orderBy: { orderDate: "desc" },
  });
  res.json(orders);
});

purchaseOrdersRouter.get("/:id", async (req, res) => {
  const order = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { supplier: true, items: { include: { product: true } } },
  });
  res.json(order);
});

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitCost: z.number().nonnegative(),
});

const createSchema = z.object({
  supplierId: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

purchaseOrdersRouter.post("/", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  const data = createSchema.parse(req.body);
  const order = await prisma.purchaseOrder.create({
    data: {
      supplierId: data.supplierId,
      notes: data.notes,
      status: "DRAFT",
      items: { create: data.items },
    },
    include: { items: { include: { product: true } }, supplier: true },
  });
  res.status(201).json(order);
});

const statusSchema = z.object({
  status: z.enum(["DRAFT", "ORDERED", "RECEIVED", "CANCELLED"]),
});

// Transition a purchase order's status. Marking RECEIVED increments stock
// for every line item and logs a StockMovement, in one transaction.
purchaseOrdersRouter.patch("/:id/status", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  const { status } = statusSchema.parse(req.body);
  const order = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { items: true },
  });

  if (order.status === "RECEIVED" && status !== "RECEIVED") {
    throw badRequest("Cannot change status of an already received order");
  }

  if (status === "RECEIVED" && order.status !== "RECEIVED") {
    await prisma.$transaction([
      prisma.purchaseOrder.update({
        where: { id: order.id },
        data: { status: "RECEIVED", receivedAt: new Date() },
      }),
      ...order.items.flatMap((item) => [
        prisma.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity }, costPrice: item.unitCost },
        }),
        prisma.stockMovement.create({
          data: { productId: item.productId, change: item.quantity, reason: "PURCHASE" },
        }),
      ]),
    ]);
  } else {
    await prisma.purchaseOrder.update({ where: { id: order.id }, data: { status } });
  }

  const updated = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id: order.id },
    include: { items: { include: { product: true } }, supplier: true },
  });
  res.json(updated);
});

purchaseOrdersRouter.delete("/:id", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  await prisma.purchaseOrder.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
