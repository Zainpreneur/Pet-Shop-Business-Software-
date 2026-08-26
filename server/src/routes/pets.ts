import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware/auth";

export const petsRouter = Router();
petsRouter.use(requireAuth);

petsRouter.get("/", async (req, res) => {
  const customerId = req.query.customerId as string | undefined;
  const pets = await prisma.pet.findMany({
    where: customerId ? { customerId } : undefined,
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(pets);
});

petsRouter.get("/:id", async (req, res) => {
  const pet = await prisma.pet.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      customer: true,
      appointments: { orderBy: { startAt: "desc" }, include: { service: true } },
    },
  });
  res.json(pet);
});

const petSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(1),
  species: z.string().min(1),
  breed: z.string().optional(),
  sex: z.string().optional(),
  dob: z.string().datetime().optional().or(z.literal("")),
  weightKg: z.number().optional(),
  notes: z.string().optional(),
});

petsRouter.post("/", async (req, res) => {
  const data = petSchema.parse(req.body);
  const pet = await prisma.pet.create({
    data: { ...data, dob: data.dob ? new Date(data.dob) : null },
  });
  res.status(201).json(pet);
});

petsRouter.put("/:id", async (req, res) => {
  const data = petSchema.partial().parse(req.body);
  const pet = await prisma.pet.update({
    where: { id: req.params.id },
    data: { ...data, dob: data.dob ? new Date(data.dob) : undefined },
  });
  res.json(pet);
});

petsRouter.delete("/:id", async (req, res) => {
  await prisma.pet.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
