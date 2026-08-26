import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { signToken, Role } from "../utils/jwt";
import { badRequest, unauthorized, conflict } from "../utils/errors";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) throw unauthorized("Invalid email or password");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw unauthorized("Invalid email or password");

  const token = signToken({ sub: user.id, role: user.role as Role, name: user.name, email: user.email });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]).optional(),
});

// First user ever created becomes ADMIN automatically (bootstrap).
// After that, only an authenticated ADMIN may create more users via /users route.
authRouter.post("/register", async (req, res) => {
  const data = registerSchema.parse(req.body);
  const existingCount = await prisma.user.count();
  if (existingCount > 0) {
    throw badRequest("Registration is closed. Ask an admin to create your account.");
  }
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw conflict("Email already in use");

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash, role: "ADMIN" },
  });
  const token = signToken({ sub: user.id, role: user.role as Role, name: user.name, email: user.email });
  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user) throw unauthorized();
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});
