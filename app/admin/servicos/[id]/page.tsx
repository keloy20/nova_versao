"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

const API_URL = "https://gerenciador-de-os.onrender.com";

export default function DetalheOSPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [os, setOs] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarOS();
  }, []);

  async function carregarOS() {
    try {
      const data = await apiFetch(`/projects/admin/view/${id}`);
      setOs(data);
    } catch (err: any) {
      alert("Erro ao carregar OS: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // ================= IMAGEM =================
  function resolveImageSrc(foto?: string) {
    if (!foto) return "";
    if (foto.startsWith("/uploads")) return `${API_URL}${foto}`;
    if (foto.startsWith("data:image")) return foto;
    return `data:image/jpeg;base64,${foto}`;
  }

  // ================= TEXTO =================
  function formatarTexto(texto?: string) {
    if (!texto) return "-";
    return texto.replace(/\\n/g, "\n");
  }

  // 🔥 OBS ROBUSTO (PEGA QUALQUER NOME)
  function pegarObs(bloco: any) {
    if (!bloco) return "-";

    return (
      bloco.obs ||
      bloco.observacao ||
      bloco.observacoes ||
      bloco.obsAntes ||
      bloco.obsDepois ||
      "-"
    );
  }

  // ================= PDF =================
  async function gerarPDF() {
    if (!os) return;

    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = 20;

    const dataExecucao = new Date(
      os.updatedAt || os.createdAt
    ).toLocaleDateString("pt-BR");

    // ----- CABEÇALHO -----
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("ORDEM DE SERVIÇO", pageWidth / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`OS Nº: ${os.osNumero}`, margin, y);
    doc.text(`Data: ${dataExecucao}`, pageWidth - margin, y, { align: "right" });
    y += 8;

    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // ----- DADOS -----
    const linha = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(value || "-", margin + 40, y);
      y += 6;
    };

   linha(
  "Cliente:",
  os.Subcliente ? `${os.cliente} - ${os.Subcliente}` : os.cliente
);

if (os.cliente?.toLowerCase() === "dasa") {
  linha("Marca:", os.marca || "-");
  linha("Unidade:", os.unidade || "-");
} else {
  if (os.marca) linha("Marca:", os.marca);
  if (os.unidade) linha("Unidade:", os.unidade);
}

linha("Endereço:", os.endereco || "-");
linha("Técnico:", os.tecnico?.nome || "-");


    y += 4;

    const blocoTexto = (titulo: string, texto?: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(titulo, margin, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      const linhas = doc.splitTextToSize(
        formatarTexto(texto),
        pageWidth - margin * 2
      );
      doc.text(linhas, margin, y);
      y += linhas.length * 5 + 2;
    };

    blocoTexto("Detalhamento do Serviço:", os.detalhamento);

    // ----- ANTES -----
    blocoTexto("Relatório - Antes:", os.antes?.relatorio);
    blocoTexto("Observações - Antes:", pegarObs(os.antes));

    if (os.antes?.fotos?.length) {
      for (const foto of os.antes.fotos) {
        if (y + 55 > pageHeight - 25) {
          doc.addPage();
          y = 20;
        }
        doc.addImage(resolveImageSrc(foto), "JPEG", margin, y, 50, 50);
        y += 58;
      }
    }

    // ----- DEPOIS -----
    blocoTexto("Relatório - Depois:", os.depois?.relatorio);
    blocoTexto("Observações - Depois:", pegarObs(os.depois));

    if (os.depois?.fotos?.length) {
      for (const foto of os.depois.fotos) {
        if (y + 55 > pageHeight - 25) {
          doc.addPage();
          y = 20;
        }
        doc.addImage(resolveImageSrc(foto), "JPEG", margin, y, 50, 50);
        y += 58;
      }
    }

    // ----- RODAPÉ -----
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(
        "Documento gerado eletronicamente • Válido sem assinatura",
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
      doc.text(
        `Página ${i} de ${totalPages}`,
        pageWidth - margin,
        pageHeight - 10,
        { align: "right" }
      );
    }

    doc.save(`OS-${os.osNumero}.pdf`);
  }

  if (loading) return <p className="p-6">Carregando...</p>;
  if (!os) return <p className="p-6">OS não encontrada</p>;

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex justify-center text-black">
      <div className="bg-white max-w-xl w-full p-6 rounded-xl shadow">

        <div className="flex gap-2 mb-4">
          <button onClick={gerarPDF} className="bg-blue-600 text-white px-4 py-2 rounded">
            Gerar PDF
          </button>
          <button
            onClick={() => router.push(`/admin/servicos/${id}/editar`)}
            className="bg-yellow-500 text-white px-4 py-2 rounded"
          >
            Editar
          </button>
          <button onClick={() => router.back()} className="bg-gray-300 px-4 py-2 rounded">
            Voltar
          </button>
        </div>

      <p><b>Cliente:</b> {os.cliente}</p>

{os.cliente?.toLowerCase() === "dasa" ? (
  <>
    <p><b>Marca:</b> {os.marca || "-"}</p>
    <p><b>Unidade:</b> {os.unidade || "-"}</p>
  </>
) : (
  <>
    {os.marca && <p><b>Marca:</b> {os.marca}</p>}
    {os.unidade && <p><b>Unidade:</b> {os.unidade}</p>}
  </>
)}


        <h3 className="mt-4 font-bold">ANTES</h3>
        <b>Relatório:</b>
        <pre className="whitespace-pre-wrap bg-gray-100 p-2 rounded">
          {formatarTexto(os.antes?.relatorio)}
        </pre>

        <b>Observações:</b>
        <pre className="whitespace-pre-wrap bg-gray-100 p-2 rounded">
          {formatarTexto(pegarObs(os.antes))}
        </pre>

        <div className="grid grid-cols-2 gap-2 mt-2">
          {os.antes?.fotos?.map((f: string, i: number) => (
            <img key={i} src={resolveImageSrc(f)} className="h-32 w-full object-cover rounded border" />
          ))}
        </div>

        <h3 className="mt-6 font-bold">DEPOIS</h3>
        <b>Relatório:</b>
        <pre className="whitespace-pre-wrap bg-gray-100 p-2 rounded">
          {formatarTexto(os.depois?.relatorio)}
        </pre>

        <b>Observações:</b>
        <pre className="whitespace-pre-wrap bg-gray-100 p-2 rounded">
          {formatarTexto(pegarObs(os.depois))}
        </pre>

        <div className="grid grid-cols-2 gap-2 mt-2">
          {os.depois?.fotos?.map((f: string, i: number) => (
            <img key={i} src={resolveImageSrc(f)} className="h-32 w-full object-cover rounded border" />
          ))}
        </div>

      </div>
    </div>
  );
}
