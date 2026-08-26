import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const servicesRouter = Router();
servicesRouter.use(requireAuth);

servicesRouter.get("/", async (_req, res) => {
  const services = await prisma.service.findMany({ orderBy: { name: "asc" } });
  res.json(services);
});

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  durationMin: z.number().int().positive().default(30),
  active: z.boolean().optional(),
});

servicesRouter.post("/", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  const data = schema.parse(req.body);
  const service = await prisma.service.create({ data });
  res.status(201).json(service);
});

servicesRouter.put("/:id", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  const data = schema.partial().parse(req.body);
  const service = await prisma.service.update({ where: { id: req.params.id }, data });
  res.json(service);
});

servicesRouter.delete("/:id", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  await prisma.service.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
