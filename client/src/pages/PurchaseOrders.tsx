import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { format } from "date-fns";
import { api, apiErrorMessage } from "../api/client";
import { Badge, Button, Card, EmptyState, Field, Modal, Select, Spinner, money } from "../components/ui";
import type { Product, PurchaseOrder, PurchaseOrderStatus, Supplier } from "../types";

interface DraftLine {
  productId: string;
  quantity: string;
  unitCost: string;
}

const statusTone: Record<PurchaseOrderStatus, "neutral" | "blue" | "green" | "red"> = {
  DRAFT: "neutral",
  ORDERED: "blue",
  RECEIVED: "green",
  CANCELLED: "red",
};

const nextStatus: Record<PurchaseOrderStatus, PurchaseOrderStatus | null> = {
  DRAFT: "ORDERED",
  ORDERED: "RECEIVED",
  RECEIVED: null,
  CANCELLED: null,
};

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([{ productId: "", quantity: "1", unitCost: "" }]);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const [o, s, p] = await Promise.all([api.get("/purchase-orders"), api.get("/suppliers"), api.get("/products")]);
    setOrders(o.data);
    setSuppliers(s.data);
    setProducts(p.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setSupplierId("");
    setLines([{ productId: "", quantity: "1", unitCost: "" }]);
    setError("");
    setModalOpen(true);
  }

  function updateLine(i: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { productId: "", quantity: "1", unitCost: "" }]);
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const items = lines
      .filter((l) => l.productId && Number(l.quantity) > 0)
      .map((l) => ({ productId: l.productId, quantity: Number(l.quantity), unitCost: Number(l.unitCost) || 0 }));
    if (!supplierId || items.length === 0) {
      setError("Choose a supplier and at least one product line");
      return;
    }
    try {
      await api.post("/purchase-orders", { supplierId, items });
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function advance(order: PurchaseOrder) {
    const next = nextStatus[order.status];
    if (!next) return;
    if (next === "RECEIVED" && !confirm("Mark as received? This will add stock for all line items.")) return;
    await api.patch(`/purchase-orders/${order.id}/status`, { status: next });
    await load();
  }

  async function cancelOrder(order: PurchaseOrder) {
    if (!confirm("Cancel this purchase order?")) return;
    await api.patch(`/purchase-orders/${order.id}/status`, { status: "CANCELLED" });
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Purchase Orders</h1>
          <p className="text-sm text-neutral-500">Restock inventory from your suppliers.</p>
        </div>
        <Button onClick={openCreate}>+ New Purchase Order</Button>
      </div>

      <Card className="p-0">
        {loading ? (
          <Spinner />
        ) : orders.length === 0 ? (
          <EmptyState title="No purchase orders yet" />
        ) : (
          <div className="divide-y divide-neutral-100">
            {orders.map((o) => {
              const total = o.items.reduce((sum, i) => sum + i.unitCost * i.quantity, 0);
              const next = nextStatus[o.status];
              return (
                <div key={o.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-neutral-800">{o.supplier?.name}</p>
                      <p className="text-xs text-neutral-500">
                        {format(new Date(o.orderDate), "MMM d, yyyy")} · {o.items.length} line(s) · {money(total)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={statusTone[o.status]}>{o.status}</Badge>
                      {next && (
                        <Button variant="secondary" onClick={() => advance(o)}>
                          Mark {next}
                        </Button>
                      )}
                      {o.status !== "RECEIVED" && o.status !== "CANCELLED" && (
                        <Button variant="danger" onClick={() => cancelOrder(o)}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 overflow-x-auto rounded-lg bg-neutral-50 p-2">
                    <table className="w-full text-sm">
                      <thead className="text-xs uppercase text-neutral-400">
                        <tr>
                          <th className="px-2 py-1 text-left">Product</th>
                          <th className="px-2 py-1 text-right">Qty</th>
                          <th className="px-2 py-1 text-right">Unit Cost</th>
                          <th className="px-2 py-1 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {o.items.map((i) => (
                          <tr key={i.id}>
                            <td className="px-2 py-0.5">{i.product?.name}</td>
                            <td className="px-2 py-0.5 text-right">{i.quantity}</td>
                            <td className="px-2 py-0.5 text-right">{money(i.unitCost)}</td>
                            <td className="px-2 py-0.5 text-right">{money(i.unitCost * i.quantity)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Purchase Order" width="max-w-2xl">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Supplier">
            <Select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Select supplier...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="space-y-2">
            <p className="text-xs font-medium text-neutral-600">Line Items</p>
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-6">
                  <Select
                    value={l.productId}
                    onChange={(e) => {
                      const product = products.find((p) => p.id === e.target.value);
                      updateLine(i, { productId: e.target.value, unitCost: product ? String(product.costPrice) : l.unitCost });
                    }}
                  >
                    <option value="">Select product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min={1}
                    placeholder="Qty"
                    value={l.quantity}
                    onChange={(e) => updateLine(i, { quantity: e.target.value })}
                    className="w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Unit cost"
                    value={l.unitCost}
                    onChange={(e) => updateLine(i, { unitCost: e.target.value })}
                    className="w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm"
                  />
                </div>
                <div className="col-span-1">
                  <button type="button" onClick={() => removeLine(i)} className="text-neutral-400 hover:text-red-500">
                    ✕
                  </button>
                </div>
              </div>
            ))}
            <Button type="button" variant="ghost" onClick={addLine}>
              + Add line
            </Button>
          </div>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Purchase Order</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
