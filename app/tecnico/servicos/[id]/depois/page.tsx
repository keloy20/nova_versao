"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Check, FilePenLine, Send } from "lucide-react";
import { apiFetch } from "@/app/lib/api";
import SignaturePad from "@/app/components/SignaturePad";
import { MOTIVOS_NAO_ASSINOU, normalizeStatus, STATUS } from "@/app/lib/os";

type OSTecnico = {
  osNumero?: string;
  status?: string;
  detalhamento?: string;
  antes?: {
    relatorio?: string;
    observacao?: string;
    fotos?: string[];
  } | null;
  materiais_solicitados?: Array<{
    nome?: string;
    fabricante?: string;
    modelo?: string;
    quantidade?: number;
    unidade?: string;
    observacao?: string;
  }>;
};

function normalizePreviewImageSrc(value?: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("data:image")) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^file:\/\//i.test(raw)) return raw;
  return `data:image/jpeg;base64,${raw.replace(/\s+/g, "")}`;
}

export default function DepoisPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const returnTo = searchParams.get("returnTo");

  const [os, setOs] = useState<OSTecnico | null>(null);
  const [relatorio, setRelatorio] = useState("");
  const [observacao, setObservacao] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [assinaturaTecnico, setAssinaturaTecnico] = useState("");
  const [assinaturaCliente, setAssinaturaCliente] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteFuncao, setClienteFuncao] = useState("");
  const [clienteNaoAssinou, setClienteNaoAssinou] = useState(false);
  const [motivoNaoAssinou, setMotivoNaoAssinou] = useState("");

  useEffect(() => {
    carregarOS();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarOS() {
    try {
      const data = (await apiFetch(`/projects/tecnico/view/${id}`)) as OSTecnico;
      const status = normalizeStatus(data.status);

      if (status !== STATUS.EM_ATENDIMENTO && status !== STATUS.PAUSADA) {
        router.replace(`/tecnico/servicos/${id}`);
        return;
      }

      setOs(data);
    } catch {
      setOs(null);
    } finally {
      setLoading(false);
    }
  }

  async function comprimirImagem(file: File): Promise<File> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > 1200) {
            height = (height * 1200) / width;
            width = 1200;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            resolve(new File([blob!], file.name, { type: "image/jpeg" }));
          }, "image/jpeg", 0.7);
        };
      };
    });
  }

  async function handleFotosChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const novasFotos = await Promise.all(Array.from(e.target.files).map((f) => comprimirImagem(f)));
    setFotos((prev) => [...prev, ...novasFotos].slice(0, 4));
  }

  function removerFoto(index: number) {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  }

  function validarFinalizacao() {
    if (!assinaturaTecnico.trim()) {
      alert("Informe a assinatura do técnico");
      return false;
    }

    if (clienteNaoAssinou) {
      if (!clienteNome.trim()) {
        alert("Informe o nome do cliente quando ele não assinar");
        return false;
      }
      if (!motivoNaoAssinou) {
        alert("Selecione o motivo de não assinatura");
        return false;
      }
    } else if (!assinaturaCliente.trim()) {
      alert("Informe a assinatura do cliente ou marque que ele não assinou");
      return false;
    }

    return true;
  }

  function abrirPreview() {
    if (!relatorio.trim()) {
      alert("Preencha o parecer final");
      return;
    }

    if (fotos.length < 1 || fotos.length > 4) {
      alert("Adicione de 1 a 4 fotos para finalizar");
      return;
    }

    if (!validarFinalizacao()) return;
    setPreviewOpen(true);
  }

  function fecharPreview() {
    if (salvando) return;
    setPreviewOpen(false);
  }

  async function salvarDepoisEFinalizar() {
    if (!validarFinalizacao()) return;

    setSalvando(true);

    try {
      const formData = new FormData();
      formData.append("relatorio", relatorio);
      formData.append("observacao", observacao);
      fotos.forEach((f) => formData.append("fotos", f));

      await apiFetch(`/projects/tecnico/depois/${id}`, {
        method: "PUT",
        body: formData,
      });

      await apiFetch(`/os/${id}/finish`, {
        method: "POST",
        body: JSON.stringify({
          tech_signature_url: assinaturaTecnico,
          client_signature_url: clienteNaoAssinou ? null : assinaturaCliente,
          client_signed_name: clienteNome || null,
          client_signed_role: clienteFuncao || null,
          client_did_not_sign: clienteNaoAssinou,
          client_did_not_sign_reason: clienteNaoAssinou ? motivoNaoAssinou : null,
        }),
      });

      alert("OS enviada para o admin com sucesso!");
      router.push(returnTo || "/tecnico");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao finalizar OS");
    } finally {
      setSalvando(false);
      setPreviewOpen(false);
    }
  }

  if (loading) return <div className="p-6">Carregando...</div>;
  if (!os) return <div className="p-6">OS não encontrada</div>;

  return (
    <div className="min-h-screen p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-2">
          <h1 className="text-2xl font-extrabold">DEPOIS e Finalização - {os.osNumero}</h1>
          <button
            type="button"
            onClick={() => router.push(`/tecnico/servicos/${id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
          >
            Voltar
          </button>
        </div>

        <label className="mb-1 block text-sm font-semibold">Parecer final</label>
        <textarea className="mb-4 w-full rounded-xl border border-slate-200 p-2.5" value={relatorio} onChange={(e) => setRelatorio(e.target.value)} />

        <label className="mb-1 block text-sm font-semibold">Observações finais</label>
        <textarea className="mb-4 w-full rounded-xl border border-slate-200 p-2.5" value={observacao} onChange={(e) => setObservacao(e.target.value)} />

        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
          Adicionar fotos (1 a 4)
          <input type="file" accept="image/*" multiple hidden onChange={handleFotosChange} />
        </label>

        <p className={`mt-2 text-sm ${fotos.length >= 1 && fotos.length <= 4 ? "text-emerald-700" : "text-rose-700"}`}>
          {fotos.length} / 4 foto{fotos.length !== 1 && "s"}
        </p>

        {fotos.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {fotos.map((f, i) => (
              <div key={`${f.name}-${i}`} className="relative">
                <img src={URL.createObjectURL(f)} alt={`Preview DEPOIS ${i + 1}`} className="h-28 w-full rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => removerFoto(i)}
                  className="absolute right-1 top-1 rounded bg-rose-600 px-2 text-xs font-bold text-white"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-extrabold text-slate-800">Assinaturas da finalização</p>

          <SignaturePad label="Assinatura do técnico" value={assinaturaTecnico} onChange={setAssinaturaTecnico} />

          <div className="flex items-center gap-2 text-sm">
            <input
              id="clienteNaoAssinou"
              type="checkbox"
              checked={clienteNaoAssinou}
              onChange={(e) => setClienteNaoAssinou(e.target.checked)}
            />
            <label htmlFor="clienteNaoAssinou">Cliente não assinou</label>
          </div>

          {!clienteNaoAssinou && (
            <SignaturePad label="Assinatura do cliente" value={assinaturaCliente} onChange={setAssinaturaCliente} />
          )}

          {clienteNaoAssinou && (
            <>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm"
                placeholder="Nome do cliente"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
              />

              <input
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm"
                placeholder="Função do cliente"
                value={clienteFuncao}
                onChange={(e) => setClienteFuncao(e.target.value)}
              />

              <select
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm"
                value={motivoNaoAssinou}
                onChange={(e) => setMotivoNaoAssinou(e.target.value)}
              >
                <option value="">Selecione o motivo</option>
                {MOTIVOS_NAO_ASSINOU.map((motivo) => (
                  <option key={motivo} value={motivo}>
                    {motivo}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        <button
          onClick={abrirPreview}
          disabled={salvando || fotos.length < 1 || fotos.length > 4 || !relatorio.trim()}
          className="mt-6 w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {salvando ? "Enviando..." : "Finalizar e revisar envio"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/tecnico/servicos/${id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`)}
          className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
        >
          Voltar para o serviço
        </button>
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/60 p-3 sm:items-center sm:p-6">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Preview final</p>
                <h2 className="text-lg font-extrabold text-slate-900">Conferir antes de enviar para o admin</h2>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                {os.osNumero}
              </span>
            </div>

            <div className="space-y-5 px-5 py-5">
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-extrabold text-slate-800">OS inicial e ANTES</p>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Detalhamento inicial da OS</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{os.detalhamento || "Nao informado"}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Parecer inicial</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{os.antes?.relatorio || "Nao informado"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Observacoes iniciais</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{os.antes?.observacao || "Nao informado"}</p>
                    </div>
                  </div>

                  {Array.isArray(os.antes?.fotos) && os.antes.fotos.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Relatório fotográfico inicial</p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {os.antes.fotos.map((foto, index) => (
                          <div key={`antes-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <img
                              src={normalizePreviewImageSrc(foto)}
                              alt={`Foto inicial ${index + 1}`}
                              className="h-28 w-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {Array.isArray(os.materiais_solicitados) && os.materiais_solicitados.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Materiais solicitados no ANTES</p>
                      <div className="space-y-2">
                        {os.materiais_solicitados.map((material, index) => (
                          <div key={`${material.nome || "material"}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                            <p className="font-semibold text-slate-800">{material.nome || "-"}</p>
                            <p>
                              {(material.quantidade ?? 0)} {material.unidade || "un"}
                              {material.fabricante ? ` | ${material.fabricante}` : ""}
                              {material.modelo ? ` | ${material.modelo}` : ""}
                            </p>
                            {material.observacao ? <p>{material.observacao}</p> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-extrabold text-slate-800">DEPOIS</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Parecer final</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{relatorio || "Nao informado"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Observacoes finais</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{observacao || "Nao informado"}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Relatorio fotografico final</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {fotos.map((foto, index) => (
                      <div key={`${foto.name}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <img src={URL.createObjectURL(foto)} alt={`Foto final ${index + 1}`} className="h-28 w-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-3 text-sm font-extrabold text-slate-800">Assinaturas e validacao</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Assinatura do tecnico</p>
                    <div className="rounded-xl border border-slate-200 bg-white p-2">
                      <img src={assinaturaTecnico} alt="Assinatura do tecnico" className="h-28 w-full object-contain" />
                    </div>
                  </div>

                  {!clienteNaoAssinou ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Assinatura do cliente</p>
                      <div className="rounded-xl border border-slate-200 bg-white p-2">
                        <img src={assinaturaCliente} alt="Assinatura do cliente" className="h-28 w-full object-contain" />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      <p className="font-extrabold">Cliente nao assinou</p>
                      <p className="mt-2">
                        <span className="font-semibold">Nome:</span> {clienteNome || "Nao informado"}
                      </p>
                      <p>
                        <span className="font-semibold">Funcao:</span> {clienteFuncao || "Nao informada"}
                      </p>
                      <p>
                        <span className="font-semibold">Motivo:</span> {motivoNaoAssinou || "Nao informado"}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Ao confirmar, a OS sera enviada para o admin validar e a notificacao aparecera no painel do admin.</p>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={fecharPreview}
                disabled={salvando}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FilePenLine size={16} />
                Editar
              </button>
              <button
                type="button"
                onClick={salvarDepoisEFinalizar}
                disabled={salvando}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                <Send size={16} />
                {salvando ? "Enviando..." : "Enviar para o admin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
