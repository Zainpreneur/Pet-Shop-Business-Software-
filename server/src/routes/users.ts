import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { conflict } from "../utils/errors";

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.get("/", requireRole("ADMIN", "MANAGER"), async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(users);
});

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]).default("STAFF"),
});

usersRouter.post("/", requireRole("ADMIN"), async (req, res) => {
  const data = createSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw conflict("Email already in use");
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash, role: data.role },
  });
  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

usersRouter.patch("/:id", requireRole("ADMIN"), async (req, res) => {
  const data = updateSchema.parse(req.body);
  const updateData: Record<string, unknown> = { ...data };
  delete updateData.password;
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 10);
  }
  const user = await prisma.user.update({ where: { id: req.params.id }, data: updateData });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, active: user.active });
});
