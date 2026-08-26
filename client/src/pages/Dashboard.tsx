import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Badge, Card, EmptyState, Spinner, StatCard, money } from "../components/ui";
import type { DashboardStats } from "../types";
import { format } from "date-fns";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api.get("/dashboard/stats").then((res) => setStats(res.data));
  }, []);

  if (!stats) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-500">Here's what's happening at the shop today.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Today's Revenue" value={money(stats.todayRevenue)} sub={`${stats.todaySalesCount} sales`} tone="good" />
        <StatCard label="Month Revenue" value={money(stats.monthRevenue)} sub={`${stats.monthSalesCount} sales`} />
        <StatCard label="Customers" value={String(stats.totalCustomers)} />
        <StatCard
          label="Low Stock Items"
          value={String(stats.lowStockCount)}
          sub={`of ${stats.totalProducts} products`}
          tone={stats.lowStockCount > 0 ? "warn" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-800">Upcoming Appointments</h2>
            <Link to="/appointments" className="text-xs font-medium text-brand-700 hover:underline">
              View all
            </Link>
          </div>
          {stats.upcomingAppointments.length === 0 ? (
            <EmptyState title="No upcoming appointments" subtitle="Booked appointments for the next 7 days show up here." />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {stats.upcomingAppointments.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-neutral-800">
                      {a.pet?.name} · {a.service?.name}
                    </p>
                    <p className="text-xs text-neutral-500">{a.customer?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-neutral-700">
                      {format(new Date(a.startAt), "MMM d, h:mm a")}
                    </p>
                    <Badge tone={a.status === "CONFIRMED" ? "green" : "blue"}>{a.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-800">Low Stock Products</h2>
            <Link to="/products" className="text-xs font-medium text-brand-700 hover:underline">
              Manage inventory
            </Link>
          </div>
          {stats.lowStockProducts.length === 0 ? (
            <EmptyState title="All stocked up" subtitle="No products are below their reorder level." />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {stats.lowStockProducts.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-neutral-800">{p.name}</p>
                    <p className="text-xs text-neutral-500">SKU {p.sku}</p>
                  </div>
                  <Badge tone="amber">{p.quantity} left</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-800">Recent Sales</h2>
          <Link to="/sales" className="text-xs font-medium text-brand-700 hover:underline">
            View all
          </Link>
        </div>
        {stats.recentSales.length === 0 ? (
          <EmptyState title="No sales yet" subtitle="Sales made at the POS will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-neutral-400">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Items</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {stats.recentSales.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2 text-neutral-600">{format(new Date(s.createdAt), "MMM d, h:mm a")}</td>
                    <td className="py-2 font-medium text-neutral-800">{s.customer?.name || "Walk-in"}</td>
                    <td className="py-2 text-neutral-500">{s.items.length} item(s)</td>
                    <td className="py-2 text-right font-medium text-neutral-800">{money(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
