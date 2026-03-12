"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";

type WhatsStatus = {
  ready?: boolean;
  initializing?: boolean;
  has_qr?: boolean;
  qr_code?: string | null;
  qr_ascii?: string | null;
  queue_size?: number;
  last_error?: string | null;
  connected_at?: string | null;
  last_disconnect_at?: string | null;
};

export default function AdminWhatsappPage() {
  const [status, setStatus] = useState<WhatsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState(false);

  async function carregarStatus() {
    try {
      const data = await apiFetch("/admin/whatsapp/status");
      setStatus((data || null) as WhatsStatus | null);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarStatus();
    const interval = window.setInterval(carregarStatus, 10000);
    return () => window.clearInterval(interval);
  }, []);

  async function reiniciarWhats() {
    try {
      setRestarting(true);
      await apiFetch("/admin/whatsapp/restart", { method: "POST" });
      await carregarStatus();
    } finally {
      setRestarting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">WhatsApp</h2>
            <p className="text-sm text-slate-500">Conexao, QR Code, fila de envio e diagnostico.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={carregarStatus}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Atualizar
            </button>
            <button
              type="button"
              onClick={reiniciarWhats}
              disabled={restarting}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:bg-slate-400"
            >
              {restarting ? "Reiniciando..." : "Reiniciar Zap"}
            </button>
          </div>
        </div>
      </div>

      {loading && <div className="rounded-2xl border border-slate-200 bg-white p-6">Carregando...</div>}

      {!loading && (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <StatusCard
              title="Estado"
              value={status?.ready ? "Conectado" : status?.has_qr ? "Aguardando QR" : status?.initializing ? "Conectando" : "Offline"}
              tone={status?.ready ? "emerald" : status?.has_qr ? "amber" : "slate"}
            />
            <StatusCard title="Fila" value={String(status?.queue_size ?? 0)} tone="blue" />
            <StatusCard title="Ultima conexao" value={formatDateTime(status?.connected_at)} tone="teal" />
            <StatusCard title="Ultima queda" value={formatDateTime(status?.last_disconnect_at)} tone="rose" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-extrabold text-slate-900">QR Code</p>
              <p className="mt-1 text-sm text-slate-500">
                Se estiver aguardando QR, abra o WhatsApp no celular e escaneie este codigo.
              </p>

              {status?.qr_code ? (
                <div className="mt-4 space-y-4">
                  <div className="flex justify-center rounded-2xl border border-slate-200 bg-white p-4">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(status.qr_code)}`}
                      alt="QR Code do WhatsApp"
                      className="h-[280px] w-[280px] max-w-full"
                    />
                  </div>
                  {status.qr_ascii ? (
                    <pre className="overflow-auto rounded-2xl bg-slate-950 p-4 text-[7px] leading-[7px] text-white sm:text-[8px] sm:leading-[8px]">
                      {status.qr_ascii}
                    </pre>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  {status?.ready ? "WhatsApp ja conectado. Nenhum QR pendente." : "Nenhum QR disponivel no momento."}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-extrabold text-slate-900">Diagnostico</p>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <InfoLine label="Pronto" value={status?.ready ? "Sim" : "Nao"} />
                <InfoLine label="Inicializando" value={status?.initializing ? "Sim" : "Nao"} />
                <InfoLine label="Tem QR" value={status?.has_qr ? "Sim" : "Nao"} />
                <InfoLine label="Fila de envio" value={String(status?.queue_size ?? 0)} />
                <InfoLine label="Ultimo erro" value={status?.last_error || "-"} />
              </div>

              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                <p className="font-bold">Como usar</p>
                <p className="mt-1">1. Se aparecer QR, escaneie com o celular.</p>
                <p>2. Quando ficar conectado, as mensagens saem direto pelo backend.</p>
                <p>3. Nao precisa abrir WhatsApp Web nem clicar em `wa.me`.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatusCard({ title, value, tone }: { title: string; value: string; tone: "emerald" | "amber" | "slate" | "blue" | "teal" | "rose" }) {
  const tones = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    teal: "border-teal-200 bg-teal-50 text-teal-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{title}</p>
      <p className="mt-2 text-sm font-extrabold">{value || "-"}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-semibold text-slate-800">{value || "-"}</p>
    </div>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
