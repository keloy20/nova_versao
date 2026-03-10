"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Bell, ClipboardList, LayoutDashboard, Menu, Plus, Users, Wrench, X } from "lucide-react";
import { apiFetch } from "@/app/lib/api";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/tecnicos", label: "Tecnicos", icon: Wrench },
  { href: "/admin/terceiros", label: "Terceiros", icon: Users },
  { href: "/admin/catalogo", label: "Catalogo", icon: ClipboardList },
  { href: "/admin/graficos", label: "Graficos", icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifs, setNotifs] = useState<
    Array<{
      _id: string;
      type?: "CLIENT_REQUEST" | "STATUS_CHANGED" | "SYSTEM" | string;
      title: string;
      message: string;
      os_id?: string | { _id?: string } | null;
    }>
  >([]);
  const [showNotifs, setShowNotifs] = useState(false);

  const currentTitle = useMemo(() => {
    if (pathname.startsWith("/admin/servicos")) return "Servicos";
    if (pathname.startsWith("/admin/clientes")) return "Clientes";
    if (pathname.startsWith("/admin/tecnicos")) return "Tecnicos";
    if (pathname.startsWith("/admin/terceiros")) return "Terceiros";
    if (pathname.startsWith("/admin/catalogo")) return "Catalogo";
    if (pathname.startsWith("/admin/graficos")) return "Graficos";
    return "Dashboard";
  }, [pathname]);

  useEffect(() => {
    apiFetch("/admin/notifications?unread=true")
      .then((data) => setNotifs(Array.isArray(data) ? data : []))
      .catch(() => setNotifs([]));
  }, [pathname]);

  async function marcarLida(id: string) {
    try {
      await apiFetch(`/admin/notifications/${id}/read`, { method: "POST" });
      setNotifs((prev) => prev.filter((n) => n._id !== id));
    } catch {
      // noop
    }
  }

  async function abrirNotificacao(notification: { _id: string; os_id?: string | { _id?: string } | null }) {
    try {
      await marcarLida(notification._id);
    } finally {
      setShowNotifs(false);
      const osId =
        typeof notification.os_id === "string"
          ? notification.os_id
          : notification.os_id?._id;
      if (osId) {
        if ((notification as { type?: string }).type === "CLIENT_REQUEST") {
          router.push(`/admin/servicos/${osId}/editar`);
        } else {
          router.push(`/admin/servicos/${osId}`);
        }
      }
    }
  }

  const notificacoesClientes = notifs.filter((n) => n.type === "CLIENT_REQUEST");
  const notificacoesTecnicos = notifs.filter((n) => n.type === "STATUS_CHANGED");
  const outrasNotificacoes = notifs.filter((n) => !["CLIENT_REQUEST", "STATUS_CHANGED"].includes(String(n.type || "")));

  return (
    <div className="min-h-screen text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-slate-200/70 bg-white/90 p-4 backdrop-blur lg:block">
          <SideContent pathname={pathname} onNavigate={() => null} />
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-slate-900/45 lg:hidden" onClick={() => setMobileOpen(false)}>
            <aside
              className="h-full w-72 bg-white p-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <SideContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        <main className="p-4 sm:p-6 lg:p-8">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 lg:hidden"
                aria-label="Abrir menu"
              >
                <Menu size={18} />
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Painel Admin</p>
                <h1 className="text-lg font-extrabold text-slate-900 sm:text-xl">{currentTitle}</h1>
              </div>
            </div>

            <button
              onClick={() => router.push("/admin/servicos/novo")}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800"
            >
              <Plus size={16} />
              Nova OS
            </button>
            <div className="relative">
              <button
                onClick={() => setShowNotifs((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
              >
                <Bell size={16} />
                {notifs.length > 0 ? `${notifs.length}` : "0"}
              </button>
              {showNotifs && (
                <div className="absolute left-0 right-auto z-20 mt-2 w-[calc(100vw-2rem)] max-w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-lg sm:left-auto sm:right-0 sm:w-80">
                  {notifs.length === 0 && <p className="p-2 text-sm text-slate-500">Sem notificações</p>}

                  {notifs.length > 0 && (
                    <>
                      <div className="mb-1 rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-700">
                        Clientes ({notificacoesClientes.length})
                      </div>
                      {notificacoesClientes.length === 0 && (
                        <p className="px-2 pb-2 text-xs text-slate-500">Sem notificações de cliente.</p>
                      )}
                      {notificacoesClientes.map((n) => (
                        <button
                          key={n._id}
                          onClick={() => abrirNotificacao(n)}
                          className="mb-1 w-full rounded-lg border border-blue-100 bg-blue-50/40 px-2 py-2 text-left hover:bg-blue-50"
                        >
                          <p className="text-xs font-bold text-slate-800">{n.title}</p>
                          <p className="text-xs text-slate-600">{n.message}</p>
                        </button>
                      ))}

                      <div className="mb-1 mt-2 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                        Técnicos ({notificacoesTecnicos.length})
                      </div>
                      {notificacoesTecnicos.length === 0 && (
                        <p className="px-2 pb-2 text-xs text-slate-500">Sem notificações de técnico.</p>
                      )}
                      {notificacoesTecnicos.map((n) => (
                        <button
                          key={n._id}
                          onClick={() => abrirNotificacao(n)}
                          className="mb-1 w-full rounded-lg border border-emerald-100 bg-emerald-50/40 px-2 py-2 text-left hover:bg-emerald-50"
                        >
                          <p className="text-xs font-bold text-slate-800">{n.title}</p>
                          <p className="text-xs text-slate-600">{n.message}</p>
                        </button>
                      ))}

                      {outrasNotificacoes.length > 0 && (
                        <>
                          <div className="mb-1 mt-2 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                            Outras ({outrasNotificacoes.length})
                          </div>
                          {outrasNotificacoes.map((n) => (
                            <button
                              key={n._id}
                              onClick={() => abrirNotificacao(n)}
                              className="mb-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-left hover:bg-slate-100"
                            >
                              <p className="text-xs font-bold text-slate-800">{n.title}</p>
                              <p className="text-xs text-slate-600">{n.message}</p>
                            </button>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}

function SideContent({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const router = useRouter();

  return (
    <>
      <div className="mb-6 flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 text-white">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-300">Gerenciador</p>
          <p className="text-lg font-extrabold">Admin</p>
        </div>
        <button
          onClick={onNavigate}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600/70 lg:hidden"
          aria-label="Fechar menu"
        >
          <X size={16} />
        </button>
      </div>

      <nav className="space-y-1">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => {
          localStorage.clear();
          router.push("/login");
          onNavigate();
        }}
        className="mt-6 w-full rounded-xl border border-rose-200 px-3 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50"
      >
        Sair
      </button>
    </>
  );
}
