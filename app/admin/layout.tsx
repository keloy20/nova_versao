"use client";
// layout admin ativo

import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, Wrench, LayoutDashboard, Menu } from "lucide-react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-gray-100 text-black">
      {/* SIDEBAR */}
      <aside
        className={`bg-white shadow-lg transition-all duration-300 ${open ? "w-64" : "w-16"}`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <span className={`font-bold text-lg ${!open && "hidden"}`}>Admin</span>
          <button onClick={() => setOpen(!open)}>
            <Menu size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-2">
          <SidebarButton icon={<LayoutDashboard />} label="Dashboard" open={open} onClick={() => router.push("/admin")} />
          <SidebarButton icon={<Users />} label="Clientes" open={open} onClick={() => router.push("/admin/clientes")} />
          <SidebarButton icon={<Wrench />} label="Técnicos" open={open} onClick={() => router.push("/admin/tecnicos")} />
        </nav>
      </aside>

      {/* CONTEÚDO */}
      <main className="flex-1 p-6">
        {/* BOTÃO NOVA OS GLOBAL */}
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => router.push("/admin/servicos/novo")}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded shadow"
          >
            <Plus size={18} /> Nova OS
          </button>
        </div>

        {children}
      </main>
    </div>
  );
}

function SidebarButton({
  icon,
  label,
  open,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded hover:bg-gray-100 text-left"
    >
      {icon}
      {open && <span>{label}</span>}
    </button>
  );
}
