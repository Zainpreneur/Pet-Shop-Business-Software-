import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: "🏠", end: true },
  { to: "/pos", label: "Point of Sale", icon: "🧾" },
  { to: "/sales", label: "Sales History", icon: "📈" },
  { to: "/products", label: "Inventory", icon: "📦" },
  { to: "/customers", label: "Customers & Pets", icon: "🐾" },
  { to: "/appointments", label: "Appointments", icon: "📅" },
  { to: "/services", label: "Services", icon: "✂️" },
  { to: "/suppliers", label: "Suppliers", icon: "🚚" },
  { to: "/purchase-orders", label: "Purchase Orders", icon: "🧮" },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-50">
      <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-200 bg-white">
        <div className="flex items-center gap-2 border-b border-neutral-200 px-5 py-4">
          <span className="text-2xl">🐶</span>
          <div>
            <p className="text-sm font-semibold leading-tight text-neutral-900">Pawsitive POS</p>
            <p className="text-[11px] text-neutral-500">Pet Shop Business Suite</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-neutral-600 hover:bg-neutral-100"
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-neutral-200 p-3">
          <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-800">{user?.name}</p>
              <p className="truncate text-xs text-neutral-500">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-md px-2 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-200 hover:text-neutral-800"
              title="Log out"
            >
              Log out
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
