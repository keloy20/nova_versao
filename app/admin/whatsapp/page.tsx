"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";

type WhatsStatus = {
  provider?: string;
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

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">WhatsApp Twilio</h2>
            <p className="text-sm text-slate-500">Status da integracao oficial por API, sem QR Code e sem WhatsApp Web.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={carregarStatus}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Atualizar
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
              value={status?.ready ? "Conectado" : "Offline"}
              tone={status?.ready ? "emerald" : "slate"}
            />
            <StatusCard title="Provedor" value="Twilio" tone="blue" />
            <StatusCard title="Fila" value={String(status?.queue_size ?? 0)} tone="blue" />
            <StatusCard title="Configurado" value={status?.ready ? "Sim" : "Nao"} tone="teal" />
            <StatusCard title="Ultimo erro" value={status?.last_error || "-"} tone="rose" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-extrabold text-slate-900">Diagnostico</p>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <InfoLine label="Pronto" value={status?.ready ? "Sim" : "Nao"} />
                <InfoLine label="Provedor" value="Twilio" />
                <InfoLine label="Fila de envio" value={String(status?.queue_size ?? 0)} />
                <InfoLine label="Ultimo erro" value={status?.last_error || "-"} />
              </div>

              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                <p className="font-bold">Como usar</p>
                <p className="mt-1">1. Configure as variaveis `TWILIO_*` no Render.</p>
                <p>2. O numero de destino precisa ter feito o join do sandbox.</p>
                <p>3. As mensagens saem direto pela API da Twilio.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-extrabold text-slate-900">Variaveis necessarias</p>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <InfoLine label="TWILIO_ACCOUNT_SID" value={status?.ready ? "Configurado" : "Obrigatorio"} />
                <InfoLine label="TWILIO_AUTH_TOKEN" value={status?.ready ? "Configurado" : "Obrigatorio"} />
                <InfoLine label="TWILIO_WHATSAPP_FROM" value="whatsapp:+14155238886" />
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
