import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const categoriesRouter = Router();
categoriesRouter.use(requireAuth);

categoriesRouter.get("/", async (_req, res) => {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
  res.json(categories);
});

const schema = z.object({ name: z.string().min(1) });

categoriesRouter.post("/", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  const data = schema.parse(req.body);
  const category = await prisma.category.create({ data });
  res.status(201).json(category);
});

categoriesRouter.put("/:id", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  const data = schema.parse(req.body);
  const category = await prisma.category.update({ where: { id: req.params.id }, data });
  res.json(category);
});

categoriesRouter.delete("/:id", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  await prisma.category.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
