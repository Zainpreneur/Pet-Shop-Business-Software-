import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware/auth";

export const customersRouter = Router();
customersRouter.use(requireAuth);

customersRouter.get("/", async (req, res) => {
  const q = (req.query.q as string) || "";
  const customers = await prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
          ],
        }
      : undefined,
    include: { pets: true, _count: { select: { sales: true, appointments: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(customers);
});

customersRouter.get("/:id", async (req, res) => {
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      pets: true,
      sales: { orderBy: { createdAt: "desc" }, take: 10, include: { items: { include: { product: true } } } },
      appointments: { orderBy: { startAt: "desc" }, take: 10, include: { service: true, pet: true } },
    },
  });
  res.json(customer);
});

const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

customersRouter.post("/", async (req, res) => {
  const data = customerSchema.parse(req.body);
  const customer = await prisma.customer.create({ data: { ...data, email: data.email || null } });
  res.status(201).json(customer);
});

customersRouter.put("/:id", async (req, res) => {
  const data = customerSchema.partial().parse(req.body);
  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: { ...data, email: data.email || undefined },
  });
  res.json(customer);
});

customersRouter.delete("/:id", async (req, res) => {
  await prisma.customer.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
