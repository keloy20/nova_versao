"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";

type WhatsStatus = {
  provider?: string;
  ready?: boolean;
  initializing?: boolean;
  last_error?: string | null;
  connection_state?: string;
  from_number?: string | null;
  base_url?: string | null;
};

export default function AdminWhatsappPage() {
  const [status, setStatus] = useState<WhatsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Teste enviado pelo sistema SERTECH.");
  const [sendingTest, setSendingTest] = useState(false);

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

  async function enviarTeste() {
    if (!testPhone.trim() || !testMessage.trim()) {
      alert("Informe telefone e mensagem para o teste.");
      return;
    }

    try {
      setSendingTest(true);
      const result = await apiFetch("/admin/whatsapp/test-send", {
        method: "POST",
        body: JSON.stringify({
          to: testPhone,
          message: testMessage,
        }),
      }) as { queued?: boolean; to?: string; reason?: string; raw?: unknown } | null;

      if (result?.queued) {
        alert(`Teste enviado com sucesso para ${result.to || testPhone}.`);
      } else {
        alert(`Teste nao enviado para ${result?.to || testPhone}: ${result?.reason || "falha desconhecida"}${result?.raw ? `\nDetalhe: ${JSON.stringify(result.raw)}` : ""}`);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao enviar teste");
    } finally {
      setSendingTest(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">WhatsApp 2Chat</h2>
            <p className="text-sm text-slate-500">Canal de envio via 2Chat com o numero conectado fora do sistema.</p>
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
            <StatusCard title="Estado" value={status?.ready ? "Configurado" : "Nao configurado"} tone={status?.ready ? "emerald" : "slate"} />
            <StatusCard title="Provedor" value="2Chat" tone="blue" />
            <StatusCard title="Numero origem" value={status?.from_number ? `+${status.from_number}` : "-"} tone="teal" />
            <StatusCard title="Ultimo erro" value={status?.last_error || "-"} tone="rose" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-extrabold text-slate-900">Diagnostico</p>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <InfoLine label="Pronto" value={status?.ready ? "Sim" : "Nao"} />
                <InfoLine label="Estado atual" value={status?.connection_state || "-"} />
                <InfoLine label="Numero origem" value={status?.from_number ? `+${status.from_number}` : "-"} />
                <InfoLine label="Base URL" value={status?.base_url || "-"} />
                <InfoLine label="Ultimo erro" value={status?.last_error || "-"} />
              </div>

              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                <p className="font-bold">Como usar</p>
                <p className="mt-1">1. Configure `TWOCHAT_API_KEY` e `TWOCHAT_FROM_NUMBER` no Render.</p>
                <p>2. Mantenha o canal conectado na 2Chat.</p>
                <p>3. Use o teste abaixo para validar antes de abrir OS reais.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-extrabold text-slate-900">Enviar teste pelo sistema</p>
              <div className="mt-4 grid gap-3">
                <input
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                  placeholder="Telefone com DDD"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
                <textarea
                  className="min-h-28 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                  placeholder="Mensagem"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                />
                <button
                  type="button"
                  onClick={enviarTeste}
                  disabled={sendingTest}
                  className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:bg-blue-400"
                >
                  {sendingTest ? "Enviando..." : "Enviar teste"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatusCard({ title, value, tone }: { title: string; value: string; tone: "emerald" | "slate" | "blue" | "teal" | "rose" }) {
  const tones = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
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
