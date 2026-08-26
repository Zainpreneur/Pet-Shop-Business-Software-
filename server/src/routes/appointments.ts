import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware/auth";

export const appointmentsRouter = Router();
appointmentsRouter.use(requireAuth);

appointmentsRouter.get("/", async (req, res) => {
  const { from, to, status, staffId } = req.query as Record<string, string | undefined>;
  const appointments = await prisma.appointment.findMany({
    where: {
      status: (status as never) || undefined,
      staffId: staffId || undefined,
      startAt: {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined,
      },
    },
    include: { customer: true, pet: true, service: true, staff: true },
    orderBy: { startAt: "asc" },
  });
  res.json(appointments);
});

appointmentsRouter.get("/:id", async (req, res) => {
  const appointment = await prisma.appointment.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { customer: true, pet: true, service: true, staff: true },
  });
  res.json(appointment);
});

const schema = z.object({
  customerId: z.string().min(1),
  petId: z.string().min(1),
  serviceId: z.string().min(1),
  staffId: z.string().optional().or(z.literal("")),
  startAt: z.string().datetime(),
  notes: z.string().optional(),
});

appointmentsRouter.post("/", async (req, res) => {
  const data = schema.parse(req.body);
  const appointment = await prisma.appointment.create({
    data: {
      customerId: data.customerId,
      petId: data.petId,
      serviceId: data.serviceId,
      staffId: data.staffId || null,
      startAt: new Date(data.startAt),
      notes: data.notes,
    },
    include: { customer: true, pet: true, service: true, staff: true },
  });
  res.status(201).json(appointment);
});

const updateSchema = schema.partial().extend({
  status: z.enum(["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
});

appointmentsRouter.put("/:id", async (req, res) => {
  const data = updateSchema.parse(req.body);
  const appointment = await prisma.appointment.update({
    where: { id: req.params.id },
    data: {
      ...data,
      staffId: data.staffId || undefined,
      startAt: data.startAt ? new Date(data.startAt) : undefined,
    },
    include: { customer: true, pet: true, service: true, staff: true },
  });
  res.json(appointment);
});

appointmentsRouter.delete("/:id", async (req, res) => {
  await prisma.appointment.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
