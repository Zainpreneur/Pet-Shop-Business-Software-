import { useEffect, useMemo, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { Button, Card, Input, Select, money } from "../components/ui";
import type { Customer, PaymentMethod, Product } from "../types";

interface CartLine {
  product: Product;
  quantity: number;
}

const TAX_RATE = 0.08;

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [discount, setDiscount] = useState("0");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/products", { params: { q } }).then((res) => setProducts(res.data.filter((p: Product) => p.active)));
  }, [q]);

  useEffect(() => {
    api.get("/customers").then((res) => setCustomers(res.data));
  }, []);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) return prev;
        return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      if (product.quantity < 1) return prev;
      return [...prev, { product, quantity: 1 }];
    });
  }

  function setQty(productId: string, qty: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.product.id === productId ? { ...l, quantity: Math.max(0, Math.min(qty, l.product.quantity)) } : l))
        .filter((l) => l.quantity > 0)
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  }

  const subtotal = useMemo(() => cart.reduce((sum, l) => sum + l.product.sellPrice * l.quantity, 0), [cart]);
  const discountNum = Math.min(Number(discount) || 0, subtotal);
  const taxable = subtotal - discountNum;
  const tax = Number((taxable * TAX_RATE).toFixed(2));
  const total = Number((taxable + tax).toFixed(2));

  async function checkout() {
    setError("");
    setSuccess("");
    if (cart.length === 0) {
      setError("Cart is empty");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("/sales", {
        customerId: customerId || undefined,
        paymentMethod,
        discount: discountNum,
        taxRate: TAX_RATE,
        items: cart.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      });
      setSuccess(`Sale completed — total ${money(res.data.total)}`);
      setCart([]);
      setDiscount("0");
      const res2 = await api.get("/products", { params: { q } });
      setProducts(res2.data.filter((p: Product) => p.active));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Point of Sale</h1>
          <p className="text-sm text-neutral-500">Tap a product to add it to the cart.</p>
        </div>
        <Input placeholder="Search products by name or SKU..." value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              disabled={p.quantity < 1}
              className="flex flex-col items-start rounded-xl border border-neutral-200 bg-white p-3 text-left shadow-sm transition hover:border-brand-300 hover:shadow disabled:cursor-not-allowed disabled:opacity-40"
            >
              <p className="text-sm font-medium text-neutral-800">{p.name}</p>
              <p className="text-xs text-neutral-400">SKU {p.sku}</p>
              <div className="mt-2 flex w-full items-center justify-between">
                <span className="text-sm font-semibold text-brand-700">{money(p.sellPrice)}</span>
                <span className="text-xs text-neutral-400">{p.quantity} in stock</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Card className="flex h-fit flex-col p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-800">Cart</h2>
        {cart.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">No items yet</p>
        ) : (
          <div className="space-y-2">
            {cart.map((l) => (
              <div key={l.product.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-neutral-800">{l.product.name}</p>
                  <p className="text-xs text-neutral-400">{money(l.product.sellPrice)} each</p>
                </div>
                <input
                  type="number"
                  min={0}
                  max={l.product.quantity}
                  value={l.quantity}
                  onChange={(e) => setQty(l.product.id, Number(e.target.value))}
                  className="w-14 rounded-md border border-neutral-300 px-1.5 py-1 text-center text-sm"
                />
                <p className="w-16 text-right font-medium text-neutral-800">{money(l.product.sellPrice * l.quantity)}</p>
                <button onClick={() => removeLine(l.product.id)} className="text-neutral-400 hover:text-red-500">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="my-4 space-y-2 border-t border-neutral-100 pt-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Customer (optional)</label>
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Walk-in customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Payment</label>
              <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="ONLINE">Online</option>
                <option value="STORE_CREDIT">Store Credit</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Discount ($)</label>
              <Input type="number" min={0} step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="space-y-1 border-t border-neutral-100 pt-3 text-sm">
          <div className="flex justify-between text-neutral-500">
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="flex justify-between text-neutral-500">
            <span>Discount</span>
            <span>-{money(discountNum)}</span>
          </div>
          <div className="flex justify-between text-neutral-500">
            <span>Tax ({(TAX_RATE * 100).toFixed(0)}%)</span>
            <span>{money(tax)}</span>
          </div>
          <div className="flex justify-between pt-1 text-base font-semibold text-neutral-900">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
        </div>

        {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {success && <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

        <Button className="mt-4 w-full" disabled={submitting || cart.length === 0} onClick={checkout}>
          {submitting ? "Processing..." : `Charge ${money(total)}`}
        </Button>
      </Card>
    </div>
  );
}
