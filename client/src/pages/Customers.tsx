import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, apiErrorMessage } from "../api/client";
import { Button, Card, EmptyState, Field, Input, Modal, Spinner, Textarea } from "../components/ui";
import type { Customer, Pet } from "../types";

const emptyCustomer = { name: "", email: "", phone: "", address: "", notes: "" };
const emptyPet = { name: "", species: "", breed: "", sex: "", weightKg: "", notes: "" };

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState(emptyCustomer);

  const [petModalOpen, setPetModalOpen] = useState(false);
  const [petCustomerId, setPetCustomerId] = useState<string | null>(null);
  const [petForm, setPetForm] = useState(emptyPet);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await api.get("/customers", { params: q ? { q } : {} });
    setCustomers(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      api.get("/customers", { params: q ? { q } : {} }).then((res) => setCustomers(res.data));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  function openCreateCustomer() {
    setEditingCustomer(null);
    setCustomerForm(emptyCustomer);
    setError("");
    setCustomerModalOpen(true);
  }

  function openEditCustomer(c: Customer) {
    setEditingCustomer(c);
    setCustomerForm({
      name: c.name,
      email: c.email || "",
      phone: c.phone || "",
      address: c.address || "",
      notes: c.notes || "",
    });
    setError("");
    setCustomerModalOpen(true);
  }

  async function submitCustomer(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, customerForm);
      } else {
        await api.post("/customers", customerForm);
      }
      setCustomerModalOpen(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function removeCustomer(c: Customer) {
    if (!confirm(`Delete customer "${c.name}" and their pets?`)) return;
    await api.delete(`/customers/${c.id}`);
    await load();
  }

  function openAddPet(customerId: string) {
    setPetCustomerId(customerId);
    setPetForm(emptyPet);
    setError("");
    setPetModalOpen(true);
  }

  async function submitPet(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/pets", {
        customerId: petCustomerId,
        name: petForm.name,
        species: petForm.species,
        breed: petForm.breed || undefined,
        sex: petForm.sex || undefined,
        weightKg: petForm.weightKg ? Number(petForm.weightKg) : undefined,
        notes: petForm.notes || undefined,
      });
      setPetModalOpen(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function removePet(pet: Pet) {
    if (!confirm(`Remove pet "${pet.name}"?`)) return;
    await api.delete(`/pets/${pet.id}`);
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Customers & Pets</h1>
          <p className="text-sm text-neutral-500">Manage your customer base and their pets.</p>
        </div>
        <Button onClick={openCreateCustomer}>+ New Customer</Button>
      </div>

      <Card className="p-4">
        <Input placeholder="Search by name, email, or phone..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      </Card>

      {loading ? (
        <Spinner />
      ) : customers.length === 0 ? (
        <Card className="p-4">
          <EmptyState title="No customers found" />
        </Card>
      ) : (
        <div className="space-y-3">
          {customers.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-neutral-900">{c.name}</p>
                  <p className="text-xs text-neutral-500">
                    {c.email || "no email"} · {c.phone || "no phone"}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {c.pets?.length || 0} pet(s) · {c._count?.sales || 0} sale(s) · {c._count?.appointments || 0} appointment(s)
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                    {expanded === c.id ? "Hide pets" : "Show pets"}
                  </Button>
                  <Button variant="secondary" onClick={() => openEditCustomer(c)}>
                    Edit
                  </Button>
                  <Button variant="danger" onClick={() => removeCustomer(c)}>
                    Delete
                  </Button>
                </div>
              </div>

              {expanded === c.id && (
                <div className="mt-4 rounded-lg bg-neutral-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase text-neutral-500">Pets</p>
                    <Button variant="ghost" onClick={() => openAddPet(c.id)}>
                      + Add pet
                    </Button>
                  </div>
                  {!c.pets || c.pets.length === 0 ? (
                    <p className="text-sm text-neutral-400">No pets on file yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {c.pets.map((pet) => (
                        <div key={pet.id} className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-neutral-800">{pet.name}</p>
                            <p className="text-xs text-neutral-500">
                              {pet.species}
                              {pet.breed ? ` · ${pet.breed}` : ""}
                            </p>
                          </div>
                          <button
                            onClick={() => removePet(pet)}
                            className="text-xs font-medium text-red-500 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={customerModalOpen} onClose={() => setCustomerModalOpen(false)} title={editingCustomer ? "Edit Customer" : "New Customer"}>
        <form onSubmit={submitCustomer} className="space-y-3">
          <Field label="Full Name">
            <Input required value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <Input type="email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} />
            </Field>
          </div>
          <Field label="Address">
            <Input value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} />
          </Field>
          <Field label="Notes">
            <Textarea rows={3} value={customerForm.notes} onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })} />
          </Field>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCustomerModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingCustomer ? "Save Changes" : "Create Customer"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={petModalOpen} onClose={() => setPetModalOpen(false)} title="Add Pet">
        <form onSubmit={submitPet} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pet Name">
              <Input required value={petForm.name} onChange={(e) => setPetForm({ ...petForm, name: e.target.value })} />
            </Field>
            <Field label="Species">
              <Input required placeholder="Dog, Cat, Bird..." value={petForm.species} onChange={(e) => setPetForm({ ...petForm, species: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Breed">
              <Input value={petForm.breed} onChange={(e) => setPetForm({ ...petForm, breed: e.target.value })} />
            </Field>
            <Field label="Sex">
              <Input value={petForm.sex} onChange={(e) => setPetForm({ ...petForm, sex: e.target.value })} />
            </Field>
          </div>
          <Field label="Weight (kg)">
            <Input type="number" step="0.1" min="0" value={petForm.weightKg} onChange={(e) => setPetForm({ ...petForm, weightKg: e.target.value })} />
          </Field>
          <Field label="Notes">
            <Textarea rows={2} value={petForm.notes} onChange={(e) => setPetForm({ ...petForm, notes: e.target.value })} />
          </Field>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setPetModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Pet</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
