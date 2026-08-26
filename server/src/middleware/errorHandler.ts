import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/errors";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  // Prisma known error codes
  const anyErr = err as { code?: string; meta?: Record<string, unknown> };
  if (anyErr?.code === "P2002") {
    return res.status(409).json({ error: "A record with this value already exists", meta: anyErr.meta });
  }
  if (anyErr?.code === "P2025") {
    return res.status(404).json({ error: "Record not found" });
  }
  if (anyErr?.code === "P2003") {
    return res.status(409).json({ error: "Operation violates a related record constraint", meta: anyErr.meta });
  }

  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}
