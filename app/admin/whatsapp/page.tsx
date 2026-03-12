"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";

type WhatsStatus = {
  provider?: string;
  ready?: boolean;
  initializing?: boolean;
  has_qr?: boolean;
  qr_code?: string | null;
  queue_size?: number;
  last_error?: string | null;
  connected_at?: string | null;
  last_disconnect_at?: string | null;
  connection_state?: string;
  instance_id?: string | null;
  base_url?: string | null;
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
    const interval = window.setInterval(carregarStatus, 5000);
    return () => window.clearInterval(interval);
  }, []);

  async function reiniciarInstancia() {
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
            <h2 className="text-xl font-extrabold text-slate-900">WhatsApp UltraMsg</h2>
            <p className="text-sm text-slate-500">Status da instancia remota usada para enviar mensagens do sistema.</p>
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
              onClick={reiniciarInstancia}
              disabled={restarting}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:bg-slate-400"
            >
              {restarting ? "Reiniciando..." : "Reiniciar instancia"}
            </button>
          </div>
        </div>
      </div>

      {loading && <div className="rounded-2xl border border-slate-200 bg-white p-6">Carregando...</div>}

      {!loading && (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <StatusCard title="Estado" value={formatConnectionState(status)} tone={status?.ready ? "emerald" : status?.has_qr ? "amber" : "slate"} />
            <StatusCard title="Provedor" value="UltraMsg" tone="blue" />
            <StatusCard title="Instancia" value={status?.instance_id || "-"} tone="teal" />
            <StatusCard title="Ultimo erro" value={status?.last_error || "-"} tone="rose" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-extrabold text-slate-900">QR Code</p>
              <p className="mt-1 text-sm text-slate-500">Se a instancia estiver aguardando leitura, escaneie o QR com o celular do admin.</p>

              {status?.qr_code ? (
                <div className="mt-4 flex justify-center rounded-2xl border border-slate-200 bg-white p-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(status.qr_code)}`}
                    alt="QR Code do UltraMsg"
                    className="h-[280px] w-[280px] max-w-full"
                  />
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  {status?.ready ? "Instancia conectada. Nenhum QR pendente." : "Nenhum QR disponivel no momento."}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-extrabold text-slate-900">Diagnostico</p>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <InfoLine label="Pronto" value={status?.ready ? "Sim" : "Nao"} />
                <InfoLine label="Inicializando" value={status?.initializing ? "Sim" : "Nao"} />
                <InfoLine label="Estado atual" value={formatConnectionState(status)} />
                <InfoLine label="Tem QR" value={status?.has_qr ? "Sim" : "Nao"} />
                <InfoLine label="Ultima conexao" value={formatDateTime(status?.connected_at)} />
                <InfoLine label="Ultima queda" value={formatDateTime(status?.last_disconnect_at)} />
                <InfoLine label="Base URL" value={status?.base_url || "-"} />
              </div>

              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                <p className="font-bold">Como usar</p>
                <p className="mt-1">1. Configure `ULTRAMSG_BASE_URL`, `ULTRAMSG_INSTANCE_ID` e `ULTRAMSG_TOKEN` no Render.</p>
                <p>2. Se o UltraMsg pedir QR, escaneie com o celular do numero que vai enviar.</p>
                <p>3. Com a instancia conectada, o sistema envia para tecnico e cliente sem depender do navegador.</p>
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

function formatConnectionState(status: WhatsStatus | null) {
  if (status?.ready) return "Conectado";

  const state = String(status?.connection_state || "").trim().toLowerCase();
  if (state === "authenticated") return "Conectado";
  if (state === "connected") return "Conectado";
  if (state === "online") return "Conectado";
  if (state === "qr") return "Aguardando QR";
  if (state === "waiting_qr") return "Aguardando QR";
  if (state === "scan_qr") return "Aguardando QR";
  if (state === "erro") return "Erro";
  if (state === "nao_configurado") return "Nao configurado";
  if (status?.initializing) return "Conectando";
  if (status?.has_qr) return "Aguardando QR";
  return "Offline";
}
