"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, projectOsPath } from "@/app/lib/api";
import { MOTIVOS_NAO_ASSINOU, normalizeStatus, STATUS } from "@/app/lib/os";

type OSTecnico = {
  osNumero?: string;
  status?: string;
  feedback_admin?: string;
  antes?: {
    relatorio?: string;
    observacao?: string;
    fotos?: string[];
  };
  depois?: {
    relatorio?: string;
    observacao?: string;
    fotos?: string[];
  };
  assinatura_tecnico?: string;
  assinatura_cliente?: string;
  cliente_nome?: string;
  cliente_funcao?: string;
  cliente_nao_assinou?: boolean;
  motivo_nao_assinou?: string;
  materiais_solicitados?: Array<{
    nome?: string;
    fabricante?: string;
    modelo?: string;
    quantidade?: number;
    unidade?: string;
    observacao?: string;
  }>;
};

export default function DepoisPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [os, setOs] = useState<OSTecnico | null>(null);
  const [relatorio, setRelatorio] = useState("");
  const [observacao, setObservacao] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [fotosExistentes, setFotosExistentes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [revisando, setRevisando] = useState(false);

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
      const antesFeito = Boolean(data.antes?.relatorio?.trim() || data.antes?.observacao?.trim() || data.antes?.fotos?.length);

      if (!antesFeito || ![STATUS.EM_ATENDIMENTO, STATUS.PAUSADA, STATUS.DEVOLVIDA_PARA_AJUSTE].includes(status as typeof STATUS.EM_ATENDIMENTO)) {
        router.replace(`/tecnico/servicos/${id}`);
        return;
      }

      setOs(data);
      setRelatorio(data.depois?.relatorio || "");
      setObservacao(data.depois?.observacao || "");
      setFotosExistentes(Array.isArray(data.depois?.fotos) ? data.depois.fotos : []);
      setAssinaturaTecnico(data.assinatura_tecnico || "");
      setAssinaturaCliente(data.assinatura_cliente || "");
      setClienteNome(data.cliente_nome || "");
      setClienteFuncao(data.cliente_funcao || "");
      setClienteNaoAssinou(Boolean(data.cliente_nao_assinou));
      setMotivoNaoAssinou(data.motivo_nao_assinou || "");
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
    setFotos((prev) => [...prev, ...novasFotos]);
  }

  function removerFoto(index: number) {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  }

  function removerFotoExistente(index: number) {
    setFotosExistentes((prev) => prev.filter((_, i) => i !== index));
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

  async function salvarDepoisRascunho() {
    setSalvando(true);

    try {
      const formData = new FormData();
      formData.append("relatorio", relatorio);
      formData.append("observacao", observacao);
      formData.append("fotos_existentes", JSON.stringify(fotosExistentes));
      formData.append("materiais_solicitados", JSON.stringify(os?.materiais_solicitados || []));
      fotos.forEach((f) => formData.append("fotos", f));

      await apiFetch(`/projects/tecnico/depois/${id}`, {
        method: "PUT",
        body: formData,
      });
      return true;
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao salvar DEPOIS");
      return false;
    } finally {
      setSalvando(false);
    }
  }

  async function enviarAoAdmin() {
    if (!validarFinalizacao()) return;

    const salvo = await salvarDepoisRascunho();
    if (!salvo) return;

    setSalvando(true);

    try {
      await apiFetch(projectOsPath(`/${id}/finish`), {
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

      alert("OS finalizada e enviada para validação do admin. Agora o admin já pode atuar nela.");
      router.push("/tecnico");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao finalizar OS");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <div className="p-6">Carregando...</div>;
  if (!os) return <div className="p-6">OS não encontrada</div>;

  if (revisando) {
    return (
      <div className="min-h-screen p-4 text-slate-900 sm:p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold">Revisar antes de enviar - {os.osNumero}</h1>
          <div className="mt-5 space-y-4 text-sm text-slate-700">
            {os.feedback_admin && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
                <p className="font-bold">Correção pedida pelo admin</p>
                <p>{os.feedback_admin}</p>
              </div>
            )}
            <ResumoBloco titulo="Parecer inicial" texto={os.antes?.relatorio} />
            <ResumoBloco titulo="Observações iniciais" texto={os.antes?.observacao} />
            {(os.antes?.fotos || []).length > 0 && (
              <ResumoFotos titulo="Fotos do ANTES" fotos={os.antes?.fotos || []} />
            )}
            <ResumoBloco titulo="Parecer final" texto={relatorio} />
            <ResumoBloco titulo="Observações finais" texto={observacao} />
            <ResumoBloco titulo="Assinatura do técnico" imagem={assinaturaTecnico} />
            {!clienteNaoAssinou ? (
              <ResumoBloco titulo="Assinatura do cliente" imagem={assinaturaCliente} />
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-800">Cliente não assinou</p>
                <p>Nome: {clienteNome || "-"}</p>
                <p>Função: {clienteFuncao || "-"}</p>
                <p>Motivo: {formatMotivoNaoAssinou(motivoNaoAssinou) || "-"}</p>
              </div>
            )}
            {fotos.length > 0 || fotosExistentes.length > 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 font-semibold text-slate-800">Fotos do DEPOIS</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {fotosExistentes.map((foto, i) => (
                    <img key={`existente-${i}`} src={`data:image/jpeg;base64,${foto}`} alt={`Foto existente ${i + 1}`} className="h-28 w-full rounded-lg object-cover" />
                  ))}
                  {fotos.map((f, i) => (
                    <img key={`nova-${i}`} src={URL.createObjectURL(f)} alt={`Foto ${i + 1}`} className="h-28 w-full rounded-lg object-cover" />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => setRevisando(false)} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100">
              Editar antes de enviar
            </button>
            <button onClick={enviarAoAdmin} disabled={salvando} className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:bg-slate-400">
              {salvando ? "Enviando..." : "Enviar para o admin"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-2">
          <h1 className="text-2xl font-extrabold">DEPOIS e Finalização - {os.osNumero}</h1>
          <button
            type="button"
            onClick={() => router.push(`/tecnico/servicos/${id}`)}
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

        <p className={`mt-2 text-sm ${fotosExistentes.length + fotos.length >= 1 && fotosExistentes.length + fotos.length <= 4 ? "text-emerald-700" : "text-rose-700"}`}>
          {fotosExistentes.length + fotos.length} / 4 foto{fotosExistentes.length + fotos.length !== 1 && "s"}
        </p>

        {(fotosExistentes.length > 0 || fotos.length > 0) && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {fotosExistentes.map((foto, i) => (
              <div key={`existente-${i}`} className="relative">
                <img src={`data:image/jpeg;base64,${foto}`} alt={`Preview DEPOIS existente ${i + 1}`} className="h-28 w-full rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => removerFotoExistente(i)}
                  className="absolute right-1 top-1 rounded bg-rose-600 px-2 text-xs font-bold text-white"
                >
                  X
                </button>
              </div>
            ))}
            {fotos.map((f, i) => (
              <div key={`nova-${i}`} className="relative">
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

          {os.feedback_admin && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <p className="font-bold">Admin pediu correção</p>
              <p>{os.feedback_admin}</p>
            </div>
          )}

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
                    {formatMotivoNaoAssinou(motivo)}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        <button
          onClick={async () => {
            const salvo = await salvarDepoisRascunho();
            if (salvo) setRevisando(true);
          }}
          disabled={salvando || fotosExistentes.length + fotos.length < 1 || fotosExistentes.length + fotos.length > 4}
          className="mt-6 w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {salvando ? "Salvando..." : "Revisar antes de enviar ao admin"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/tecnico/servicos/${id}`)}
          className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
        >
          Voltar para o serviço
        </button>
      </div>
    </div>
  );
}

function SignaturePad({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(value);
  const [isPortraitViewport, setIsPortraitViewport] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const modalElement = modalRef.current;

    const atualizarViewport = () => {
      if (typeof window === "undefined") return;
      const viewport = window.visualViewport;
      const width = viewport?.width || window.innerWidth;
      const height = viewport?.height || window.innerHeight;
      setIsPortraitViewport(height > width);
    };

    const prepararAssinatura = async () => {
      setDraftValue(value);
      atualizarViewport();
      await abrirEmTelaCheiaPaisagem(modalElement);
      if (cancelled) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const container = canvas.parentElement;
      const viewport = window.visualViewport;
      const viewportWidth = viewport?.width || window.innerWidth;
      const viewportHeight = viewport?.height || window.innerHeight;
      const containerRect = container?.getBoundingClientRect();
      const width = Math.max(Math.floor((containerRect?.width || container?.clientWidth || viewportWidth) - 4), 320);
      const height = Math.max(Math.floor((containerRect?.height || container?.clientHeight || viewportHeight) - 4), 220);
      const ratio = Math.max(window.devicePixelRatio || 1, 1);

      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#0f172a";

      if (!value) return;

      const image = new Image();
      image.onload = () => {
        if (!cancelled) ctx.drawImage(image, 0, 0, width, height);
      };
      image.src = value;
    };

    void prepararAssinatura();
    window.addEventListener("resize", atualizarViewport);
    window.visualViewport?.addEventListener("resize", atualizarViewport);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", atualizarViewport);
      window.visualViewport?.removeEventListener("resize", atualizarViewport);
      void sairDaTelaCheiaPaisagem(modalElement);
    };
  }, [isOpen, value]);

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const point = getPoint(event);
    if (!canvas || !ctx || !point) return;

    drawingRef.current = true;
    activePointerIdRef.current = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    if (!drawingRef.current) return;
    if (activePointerIdRef.current !== event.pointerId) return;
    const ctx = canvasRef.current?.getContext("2d");
    const point = getPoint(event);
    if (!ctx || !point) return;

    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  function stopDrawing(event?: React.PointerEvent<HTMLCanvasElement>) {
    event?.preventDefault();
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (event && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    activePointerIdRef.current = null;
    setDraftValue(canvas.toDataURL("image/png"));
  }

  function limparAssinatura() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      setDraftValue("");
      return;
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setDraftValue("");
  }

  function salvarAssinatura() {
    onChange(draftValue);
    setIsOpen(false);
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full rounded-xl border border-slate-300 bg-white p-3 text-left hover:bg-slate-50"
      >
        {value ? (
          <img src={value} alt={label} className="h-28 w-full rounded-lg object-contain" style={{ transform: "scaleX(1)" }} />
        ) : (
          <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-500">
            Toque para assinar em tela cheia
          </div>
        )}
      </button>
      <p className="text-xs text-slate-500">Toque no quadro para abrir a assinatura em tela cheia.</p>

      {isOpen && (
        <div ref={modalRef} className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 p-0 touch-none select-none sm:p-0">
          <div
            className={`bg-white shadow-2xl ${
              isPortraitViewport
                ? "absolute left-1/2 top-1/2 flex h-[100vw] w-[100dvh] -translate-x-1/2 -translate-y-1/2 rotate-90 flex-col"
                : "flex h-full w-full flex-col"
            }`}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-extrabold text-slate-900 sm:text-base">{label}</p>
                <p className="text-xs text-slate-500">A assinatura fica em modo horizontal e ocupa praticamente a tela toda ate voce tocar em Salvar.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={limparAssinatura}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={salvarAssinatura}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Salvar
                </button>
              </div>
            </div>

            <div className="flex-1 p-2 sm:p-3">
              <div className="h-full rounded-2xl border border-slate-300 bg-white p-0.5 touch-none">
                <canvas
                  ref={canvasRef}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerCancel={stopDrawing}
                  onContextMenu={(event) => event.preventDefault()}
                  className="h-full w-full touch-none rounded-xl bg-white"
                />
              </div>
              <p className="mt-2 text-center text-xs text-slate-500">Use toda a area acima para assinar. Pode fazer varios traços e a tela so volta ao normal quando salvar.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

async function abrirEmTelaCheiaPaisagem(element: HTMLDivElement | null) {
  if (!element || typeof document === "undefined") return;

  try {
    if (document.fullscreenElement !== element && element.requestFullscreen) {
      await element.requestFullscreen();
    }
  } catch {
    // Alguns navegadores bloqueiam fullscreen sem interação adicional.
  }

  try {
    if (screen.orientation?.lock) {
      await screen.orientation.lock("landscape");
    }
  } catch {
    // A rotação automática não é suportada em todos os dispositivos.
  }
}

async function sairDaTelaCheiaPaisagem(element: HTMLDivElement | null) {
  try {
    if (screen.orientation?.unlock) {
      screen.orientation.unlock();
    }
  } catch {
    // noop
  }

  try {
    if (typeof document !== "undefined" && document.fullscreenElement === element) {
      await document.exitFullscreen();
    }
  } catch {
    // noop
  }
}

function ResumoBloco({ titulo, texto, imagem }: { titulo: string; texto?: string; imagem?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="mb-2 font-semibold text-slate-800">{titulo}</p>
      {imagem ? (
        <img src={imagem} alt={titulo} className="h-32 w-full rounded-lg object-contain bg-white" style={{ transform: "scaleX(1)" }} />
      ) : (
        <p className="whitespace-pre-line">{texto || "-"}</p>
      )}
    </div>
  );
}

function ResumoFotos({ titulo, fotos }: { titulo: string; fotos: string[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="mb-2 font-semibold text-slate-800">{titulo}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {fotos.map((foto, index) => (
          <img
            key={`${titulo}-${index}`}
            src={`data:image/jpeg;base64,${foto}`}
            alt={`${titulo} ${index + 1}`}
            className="h-28 w-full rounded-lg object-cover"
          />
        ))}
      </div>
    </div>
  );
}

function formatMotivoNaoAssinou(value?: string | null) {
  return String(value || "")
    .trim()
    .replace(/_/g, " ")
    .toLowerCase();
}
