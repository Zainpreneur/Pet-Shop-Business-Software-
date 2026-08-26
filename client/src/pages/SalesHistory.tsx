import { useEffect, useState } from "react";
import { format } from "date-fns";
import { api, apiErrorMessage } from "../api/client";
import { Badge, Button, Card, EmptyState, Spinner, money } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import type { Sale } from "../types";

export default function SalesHistory() {
  const { user } = useAuth();
  const canVoid = user?.role === "ADMIN" || user?.role === "MANAGER";
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await api.get("/sales");
    setSales(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function voidSale(sale: Sale) {
    if (!confirm("Void this sale and restock its items?")) return;
    try {
      await api.post(`/sales/${sale.id}/void`);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  const statusTone: Record<string, "green" | "red" | "amber"> = {
    COMPLETED: "green",
    VOID: "red",
    REFUNDED: "amber",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Sales History</h1>
        <p className="text-sm text-neutral-500">All transactions processed at the register.</p>
      </div>

      <Card className="p-0">
        {loading ? (
          <Spinner />
        ) : sales.length === 0 ? (
          <EmptyState title="No sales yet" />
        ) : (
          <div className="divide-y divide-neutral-100">
            {sales.map((s) => (
              <div key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-neutral-800">
                      {s.customer?.name || "Walk-in customer"} · {money(s.total)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {format(new Date(s.createdAt), "MMM d, yyyy h:mm a")} · {s.paymentMethod} · sold by {s.user?.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone[s.status] || "neutral"}>{s.status}</Badge>
                    <Button variant="ghost" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                      {expanded === s.id ? "Hide" : "Details"}
                    </Button>
                    {canVoid && s.status === "COMPLETED" && (
                      <Button variant="danger" onClick={() => voidSale(s)}>
                        Void
                      </Button>
                    )}
                  </div>
                </div>
                {expanded === s.id && (
                  <div className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm">
                    <table className="w-full">
                      <thead className="text-xs uppercase text-neutral-400">
                        <tr>
                          <th className="pb-1 text-left">Product</th>
                          <th className="pb-1 text-right">Qty</th>
                          <th className="pb-1 text-right">Unit</th>
                          <th className="pb-1 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.items.map((i) => (
                          <tr key={i.id}>
                            <td className="py-0.5">{i.product?.name}</td>
                            <td className="py-0.5 text-right">{i.quantity}</td>
                            <td className="py-0.5 text-right">{money(i.unitPrice)}</td>
                            <td className="py-0.5 text-right">{money(i.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-2 flex justify-end gap-4 border-t border-neutral-200 pt-2 text-xs text-neutral-500">
                      <span>Subtotal {money(s.subtotal)}</span>
                      <span>Discount -{money(s.discount)}</span>
                      <span>Tax {money(s.tax)}</span>
                      <span className="font-semibold text-neutral-800">Total {money(s.total)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
