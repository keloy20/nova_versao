"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, projectOsPath } from "@/app/lib/api";
import { MOTIVOS_NAO_ASSINOU, normalizeStatus, STATUS } from "@/app/lib/os";

type OSTecnico = {
  osNumero?: string;
  status?: string;
};

export default function DepoisPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [os, setOs] = useState<OSTecnico | null>(null);
  const [relatorio, setRelatorio] = useState("");
  const [observacao, setObservacao] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

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
    setFotos((prev) => [...prev, ...novasFotos]);
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

      alert("OS finalizada e enviada para validacao do admin!");
      router.push("/tecnico");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao finalizar OS");
    } finally {
      setSalvando(false);
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

        <p className={`mt-2 text-sm ${fotos.length >= 1 && fotos.length <= 4 ? "text-emerald-700" : "text-rose-700"}`}>
          {fotos.length} / 4 foto{fotos.length !== 1 && "s"}
        </p>

        {fotos.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {fotos.map((f, i) => (
              <div key={i} className="relative">
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
          onClick={salvarDepoisEFinalizar}
          disabled={salvando || fotos.length < 1 || fotos.length > 4}
          className="mt-6 w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {salvando ? "Salvando..." : "Salvar DEPOIS e Enviar para Validacao"}
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
  const drawingRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = Math.max((canvas.parentElement?.clientWidth || 320) - 8, 320);
    const height = Math.max(Math.min(window.innerHeight - 140, 560), 260);
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
      ctx.drawImage(image, 0, 0, width, height);
    };
    image.src = value;
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
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const point = getPoint(event);
    if (!canvas || !ctx || !point) return;

    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    const point = getPoint(event);
    if (!ctx || !point) return;

    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  function stopDrawing() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL("image/png"));
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
          <img src={value} alt={label} className="h-28 w-full rounded-lg object-contain" />
        ) : (
          <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-500">
            Toque para assinar em tela cheia
          </div>
        )}
      </button>
      <p className="text-xs text-slate-500">Toque no quadro para abrir a assinatura em tela cheia.</p>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 p-3 sm:p-6">
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-extrabold text-slate-900 sm:text-base">{label}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onChange("")}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="flex-1 p-4">
              <div className="h-full rounded-2xl border border-slate-300 bg-white p-1">
                <canvas
                  ref={canvasRef}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerLeave={stopDrawing}
                  onPointerCancel={stopDrawing}
                  className="h-full w-full touch-none rounded-xl bg-white"
                />
              </div>
              <p className="mt-3 text-center text-xs text-slate-500">Assine com o dedo por toda a área acima.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
