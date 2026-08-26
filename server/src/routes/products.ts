import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const productsRouter = Router();
productsRouter.use(requireAuth);

productsRouter.get("/", async (req, res) => {
  const q = (req.query.q as string) || "";
  const categoryId = req.query.categoryId as string | undefined;
  const lowStock = req.query.lowStock === "true";

  const products = await prisma.product.findMany({
    where: {
      AND: [
        q ? { OR: [{ name: { contains: q } }, { sku: { contains: q } }] } : {},
        categoryId ? { categoryId } : {},
      ],
    },
    include: { category: true, supplier: true },
    orderBy: { name: "asc" },
  });

  const result = lowStock ? products.filter((p) => p.quantity <= p.reorderLevel) : products;
  res.json(result);
});

productsRouter.get("/:id", async (req, res) => {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      category: true,
      supplier: true,
      stockMovements: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  res.json(product);
});

const productSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  costPrice: z.number().nonnegative(),
  sellPrice: z.number().nonnegative(),
  quantity: z.number().int().nonnegative().default(0),
  reorderLevel: z.number().int().nonnegative().default(5),
  categoryId: z.string().optional().or(z.literal("")),
  supplierId: z.string().optional().or(z.literal("")),
  imageUrl: z.string().optional(),
  active: z.boolean().optional(),
});

productsRouter.post("/", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  const data = productSchema.parse(req.body);
  const product = await prisma.product.create({
    data: {
      ...data,
      categoryId: data.categoryId || null,
      supplierId: data.supplierId || null,
    },
  });
  if (product.quantity > 0) {
    await prisma.stockMovement.create({
      data: { productId: product.id, change: product.quantity, reason: "INITIAL_STOCK" },
    });
  }
  res.status(201).json(product);
});

productsRouter.put("/:id", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  const data = productSchema.partial().parse(req.body);
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: {
      ...data,
      categoryId: data.categoryId || undefined,
      supplierId: data.supplierId || undefined,
    },
  });
  res.json(product);
});

const adjustSchema = z.object({
  change: z.number().int(),
  reason: z.string().min(1).default("ADJUSTMENT"),
});

productsRouter.post("/:id/adjust", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  const { change, reason } = adjustSchema.parse(req.body);
  const [product] = await prisma.$transaction([
    prisma.product.update({
      where: { id: req.params.id },
      data: { quantity: { increment: change } },
    }),
    prisma.stockMovement.create({
      data: { productId: req.params.id, change, reason },
    }),
  ]);
  res.json(product);
});

productsRouter.delete("/:id", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  await prisma.product.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
