import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, money } from "../components/ui";
import type { Category, Product, Supplier } from "../types";

const emptyForm = {
  sku: "",
  name: "",
  description: "",
  costPrice: "",
  sellPrice: "",
  quantity: "0",
  reorderLevel: "5",
  categoryId: "",
  supplierId: "",
};

export default function Products() {
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "MANAGER";
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [newCategory, setNewCategory] = useState("");

  async function load() {
    setLoading(true);
    const [p, c, s] = await Promise.all([
      api.get("/products", { params: q ? { q } : {} }),
      api.get("/categories"),
      api.get("/suppliers"),
    ]);
    setProducts(p.data);
    setCategories(c.data);
    setSuppliers(s.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      api.get("/products", { params: q ? { q } : {} }).then((res) => setProducts(res.data));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      sku: p.sku,
      name: p.name,
      description: p.description || "",
      costPrice: String(p.costPrice),
      sellPrice: String(p.sellPrice),
      quantity: String(p.quantity),
      reorderLevel: String(p.reorderLevel),
      categoryId: p.categoryId || "",
      supplierId: p.supplierId || "",
    });
    setError("");
    setModalOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const payload = {
      sku: form.sku,
      name: form.name,
      description: form.description || undefined,
      costPrice: Number(form.costPrice),
      sellPrice: Number(form.sellPrice),
      quantity: Number(form.quantity),
      reorderLevel: Number(form.reorderLevel),
      categoryId: form.categoryId,
      supplierId: form.supplierId,
    };
    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
      } else {
        await api.post("/products", payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function addCategory() {
    if (!newCategory.trim()) return;
    const res = await api.post("/categories", { name: newCategory.trim() });
    setCategories((prev) => [...prev, res.data]);
    setForm((f) => ({ ...f, categoryId: res.data.id }));
    setNewCategory("");
  }

  async function adjustStock(p: Product) {
    const input = prompt(`Adjust stock for "${p.name}" (current: ${p.quantity}). Enter +/- amount:`, "0");
    if (!input) return;
    const change = Number(input);
    if (!Number.isFinite(change) || change === 0) return;
    await api.post(`/products/${p.id}/adjust`, { change, reason: "ADJUSTMENT" });
    await load();
  }

  async function remove(p: Product) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/products/${p.id}`);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Inventory</h1>
          <p className="text-sm text-neutral-500">Manage products, pricing, and stock levels.</p>
        </div>
        {canEdit && <Button onClick={openCreate}>+ New Product</Button>}
      </div>

      <Card className="p-4">
        <Input placeholder="Search by name or SKU..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      </Card>

      <Card className="p-0">
        {loading ? (
          <Spinner />
        ) : products.length === 0 ? (
          <EmptyState title="No products found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Cost</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-800">{p.name}</p>
                      <p className="text-xs text-neutral-500">SKU {p.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{p.category?.name || "—"}</td>
                    <td className="px-4 py-3 text-neutral-600">{money(p.costPrice)}</td>
                    <td className="px-4 py-3 font-medium text-neutral-800">{money(p.sellPrice)}</td>
                    <td className="px-4 py-3">
                      {p.quantity <= p.reorderLevel ? (
                        <Badge tone="amber">{p.quantity} low</Badge>
                      ) : (
                        <Badge tone="green">{p.quantity}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {canEdit && (
                          <>
                            <Button variant="ghost" onClick={() => adjustStock(p)}>
                              Adjust
                            </Button>
                            <Button variant="secondary" onClick={() => openEdit(p)}>
                              Edit
                            </Button>
                            <Button variant="danger" onClick={() => remove(p)}>
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Product" : "New Product"}>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="SKU">
              <Input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </Field>
            <Field label="Name">
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
          </div>
          <Field label="Description">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cost Price">
              <Input type="number" step="0.01" min="0" required value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
            </Field>
            <Field label="Sell Price">
              <Input type="number" step="0.01" min="0" required value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity">
              <Input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} disabled={!!editing} />
            </Field>
            <Field label="Reorder Level">
              <Input type="number" min="0" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
            </Field>
          </div>
          <Field label="Category">
            <div className="flex gap-2">
              <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="mt-1.5 flex gap-2">
              <Input placeholder="Add new category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
              <Button type="button" variant="secondary" onClick={addCategory}>
                Add
              </Button>
            </div>
          </Field>
          <Field label="Supplier">
            <Select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">— None —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? "Save Changes" : "Create Product"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
