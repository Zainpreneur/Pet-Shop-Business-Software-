import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware/auth";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get("/stats", async (_req, res) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    todaySales,
    monthSales,
    totalCustomers,
    totalProducts,
    products,
    upcomingAppointments,
    recentSales,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { createdAt: { gte: startOfToday }, status: "COMPLETED" },
      _sum: { total: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { createdAt: { gte: startOfMonth }, status: "COMPLETED" },
      _sum: { total: true },
      _count: true,
    }),
    prisma.customer.count(),
    prisma.product.count(),
    prisma.product.findMany(),
    prisma.appointment.findMany({
      where: { startAt: { gte: now, lte: in7Days }, status: { in: ["SCHEDULED", "CONFIRMED"] } },
      include: { customer: true, pet: true, service: true },
      orderBy: { startAt: "asc" },
      take: 10,
    }),
    prisma.sale.findMany({
      where: { status: "COMPLETED" },
      include: { customer: true, items: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const lowStockProducts = products.filter((p) => p.quantity <= p.reorderLevel);
  const inventoryValue = products.reduce((sum, p) => sum + p.costPrice * p.quantity, 0);

  res.json({
    todayRevenue: todaySales._sum.total || 0,
    todaySalesCount: todaySales._count,
    monthRevenue: monthSales._sum.total || 0,
    monthSalesCount: monthSales._count,
    totalCustomers,
    totalProducts,
    lowStockCount: lowStockProducts.length,
    lowStockProducts: lowStockProducts.slice(0, 10),
    inventoryValue,
    upcomingAppointments,
    recentSales,
  });
});
