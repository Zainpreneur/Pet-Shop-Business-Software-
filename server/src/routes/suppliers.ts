import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const suppliersRouter = Router();
suppliersRouter.use(requireAuth);

suppliersRouter.get("/", async (_req, res) => {
  const suppliers = await prisma.supplier.findMany({
    include: { _count: { select: { products: true, purchaseOrders: true } } },
    orderBy: { name: "asc" },
  });
  res.json(suppliers);
});

suppliersRouter.get("/:id", async (req, res) => {
  const supplier = await prisma.supplier.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      products: true,
      purchaseOrders: { orderBy: { orderDate: "desc" }, include: { items: true } },
    },
  });
  res.json(supplier);
});

const schema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
});

suppliersRouter.post("/", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  const data = schema.parse(req.body);
  const supplier = await prisma.supplier.create({ data: { ...data, email: data.email || null } });
  res.status(201).json(supplier);
});

suppliersRouter.put("/:id", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  const data = schema.partial().parse(req.body);
  const supplier = await prisma.supplier.update({
    where: { id: req.params.id },
    data: { ...data, email: data.email || undefined },
  });
  res.json(supplier);
});

suppliersRouter.delete("/:id", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  await prisma.supplier.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
