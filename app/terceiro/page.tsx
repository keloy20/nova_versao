"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

export default function TerceiroPage() {
  const router = useRouter();
  const [solicitanteNome, setSolicitanteNome] = useState("");
  const [detalhamento, setDetalhamento] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "terceiro") {
      router.replace("/login");
      return;
    }
    const nome = localStorage.getItem("nome") || "";
    if (nome) setSolicitanteNome(nome);
  }, [router]);

  async function solicitarOS() {
    if (!solicitanteNome.trim() || !detalhamento.trim()) {
      alert("Preencha solicitante e descricao");
      return;
    }

    setEnviando(true);
    try {
      const nomeTerceiro = localStorage.getItem("nome") || "TERCEIRO";
      const formData = new FormData();
      formData.append("cliente", `TERCEIRO - ${nomeTerceiro}`);
      formData.append("solicitante_nome", solicitanteNome.trim());
      formData.append("detalhamento", detalhamento.trim());
      if (foto) formData.append("foto", foto);

      await apiFetch("/projects/open", { method: "POST", body: formData });
      alert("Solicitacao enviada para o admin.");
      setSolicitanteNome("");
      setDetalhamento("");
      setFoto(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao solicitar OS");
    } finally {
      setEnviando(false);
    }
  }

  function sair() {
    localStorage.clear();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#dbeafe,transparent_50%),radial-gradient(circle_at_bottom_left,#eff6ff,transparent_55%)] p-4 sm:p-6">
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/60 bg-white/85 p-6 shadow-xl backdrop-blur">
        <div className="mb-5 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Portal do Cliente</p>
            <h1 className="text-2xl font-extrabold text-slate-900">Solicitar Ordem de Servico</h1>
          </div>
          <button
            onClick={sair}
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100"
          >
            Sair
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Solicitante</span>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              value={solicitanteNome}
              onChange={(e) => setSolicitanteNome(e.target.value)}
              placeholder="Nome do solicitante"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Descricao</span>
            <textarea
              rows={5}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              value={detalhamento}
              onChange={(e) => setDetalhamento(e.target.value)}
              placeholder="Descreva o que precisa ser feito"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Foto (opcional)</span>
            <input
              type="file"
              accept="image/*"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              onChange={(e) => setFoto(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        <button
          onClick={solicitarOS}
          disabled={enviando}
          className="mt-5 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {enviando ? "Enviando..." : "Solicitar OS"}
        </button>
      </div>
    </div>
  );
}
