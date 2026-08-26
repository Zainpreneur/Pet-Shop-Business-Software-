import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Button, Card, EmptyState, Field, Input, Modal, Spinner, Textarea, money } from "../components/ui";
import type { Service } from "../types";

const emptyForm = { name: "", description: "", price: "", durationMin: "30" };

export default function Services() {
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "MANAGER";
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await api.get("/services");
    setServices(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  }

  function openEdit(s: Service) {
    setEditing(s);
    setForm({ name: s.name, description: s.description || "", price: String(s.price), durationMin: String(s.durationMin) });
    setError("");
    setModalOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const payload = {
      name: form.name,
      description: form.description || undefined,
      price: Number(form.price),
      durationMin: Number(form.durationMin),
    };
    try {
      if (editing) {
        await api.put(`/services/${editing.id}`, payload);
      } else {
        await api.post("/services", payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function remove(s: Service) {
    if (!confirm(`Delete service "${s.name}"?`)) return;
    try {
      await api.delete(`/services/${s.id}`);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Services</h1>
          <p className="text-sm text-neutral-500">Grooming, vet, and other bookable services.</p>
        </div>
        {canEdit && <Button onClick={openCreate}>+ New Service</Button>}
      </div>

      {loading ? (
        <Spinner />
      ) : services.length === 0 ? (
        <Card className="p-4">
          <EmptyState title="No services yet" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-neutral-900">{s.name}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{s.durationMin} min</p>
                </div>
                <span className="text-base font-semibold text-brand-700">{money(s.price)}</span>
              </div>
              {s.description && <p className="mt-2 text-sm text-neutral-500">{s.description}</p>}
              {canEdit && (
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" onClick={() => openEdit(s)}>
                    Edit
                  </Button>
                  <Button variant="danger" onClick={() => remove(s)}>
                    Delete
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Service" : "New Service"}>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Description">
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price ($)">
              <Input type="number" step="0.01" min="0" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </Field>
            <Field label="Duration (min)">
              <Input type="number" min="1" required value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} />
            </Field>
          </div>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? "Save Changes" : "Create Service"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
