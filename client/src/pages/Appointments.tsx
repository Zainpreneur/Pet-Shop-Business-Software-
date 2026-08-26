import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { format } from "date-fns";
import { api, apiErrorMessage } from "../api/client";
import { Badge, Button, Card, EmptyState, Field, Modal, Select, Spinner } from "../components/ui";
import type { Appointment, AppointmentStatus, Customer, Pet, Service, User } from "../types";

const statusTone: Record<AppointmentStatus, "blue" | "green" | "neutral" | "red" | "amber"> = {
  SCHEDULED: "blue",
  CONFIRMED: "green",
  COMPLETED: "neutral",
  CANCELLED: "red",
  NO_SHOW: "amber",
};

const emptyForm = { customerId: "", petId: "", serviceId: "", staffId: "", date: "", time: "", notes: "" };

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const [a, c, s, u] = await Promise.all([
      api.get("/appointments"),
      api.get("/customers"),
      api.get("/services"),
      api.get("/users").catch(() => ({ data: [] as User[] })),
    ]);
    setAppointments(a.data);
    setCustomers(c.data);
    setServices(s.data);
    setStaff(u.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!form.customerId) {
      setPets([]);
      return;
    }
    api.get("/pets", { params: { customerId: form.customerId } }).then((res) => setPets(res.data));
  }, [form.customerId]);

  function openCreate() {
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.date || !form.time) {
      setError("Please choose a date and time");
      return;
    }
    const startAt = new Date(`${form.date}T${form.time}:00`).toISOString();
    try {
      await api.post("/appointments", {
        customerId: form.customerId,
        petId: form.petId,
        serviceId: form.serviceId,
        staffId: form.staffId || undefined,
        startAt,
        notes: form.notes || undefined,
      });
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function updateStatus(a: Appointment, status: AppointmentStatus) {
    await api.put(`/appointments/${a.id}`, { status });
    await load();
  }

  async function remove(a: Appointment) {
    if (!confirm("Cancel and remove this appointment?")) return;
    await api.delete(`/appointments/${a.id}`);
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Appointments</h1>
          <p className="text-sm text-neutral-500">Grooming, vet visits, and other bookings.</p>
        </div>
        <Button onClick={openCreate}>+ New Appointment</Button>
      </div>

      <Card className="p-0">
        {loading ? (
          <Spinner />
        ) : appointments.length === 0 ? (
          <EmptyState title="No appointments yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Customer / Pet</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {appointments.map((a) => (
                  <tr key={a.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 text-neutral-700">{format(new Date(a.startAt), "MMM d, yyyy h:mm a")}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-800">{a.pet?.name}</p>
                      <p className="text-xs text-neutral-500">{a.customer?.name}</p>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{a.service?.name}</td>
                    <td className="px-4 py-3 text-neutral-600">{a.staff?.name || "—"}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={a.status}
                        onChange={(e) => updateStatus(a, e.target.value as AppointmentStatus)}
                        className="w-36"
                      >
                        {(["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as AppointmentStatus[]).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                      <div className="mt-1">
                        <Badge tone={statusTone[a.status]}>{a.status}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="danger" onClick={() => remove(a)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Appointment">
        <form onSubmit={submit} className="space-y-3">
          <Field label="Customer">
            <Select required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value, petId: "" })}>
              <option value="">Select customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Pet">
            <Select required value={form.petId} onChange={(e) => setForm({ ...form, petId: e.target.value })} disabled={!form.customerId}>
              <option value="">{form.customerId ? "Select pet..." : "Choose a customer first"}</option>
              {pets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.species})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Service">
            <Select required value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}>
              <option value="">Select service...</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — ${s.price}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Staff (optional)">
            <Select value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })}>
              <option value="">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </Field>
            <Field label="Time">
              <input
                type="time"
                required
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </Field>
          </div>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Book Appointment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
