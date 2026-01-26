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

  // ===== IMAGEM =====
  function resolveImageSrc(foto: any) {
    if (!foto || typeof foto !== "string") return "";

    if (foto.startsWith("/uploads")) return `${API_URL}${foto}`;
    if (foto.startsWith("data:image")) return foto;

    return `data:image/jpeg;base64,${foto}`;
  }

  // ===== PDF PROFISSIONAL =====
  async function gerarPDF() {
    if (!os) return;

    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let y = 20;
    const margin = 15;

    const dataExecucao = new Date(os.updatedAt || os.createdAt).toLocaleDateString("pt-BR");

    // ===== CABEÇALHO =====
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("ORDEM DE SERVIÇO", pageWidth / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`OS Nº: ${os.osNumero}`, margin, y);
    doc.text(`Data: ${dataExecucao}`, pageWidth - margin, y, { align: "right" });
    y += 8;

    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // ===== DADOS =====
    const linha = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(value || "-", margin + 35, y);
      y += 6;
    };

    linha("Cliente:", os.cliente);
    linha("Marca:", os.marca);
    linha("Unidade:", os.unidade || "-");
    linha("Endereço:", os.endereco || "-");
    linha("Técnico:", os.tecnico?.nome || "-");

    y += 6;

    // ===== FUNÇÃO TEXTO LONGO =====
    const textoLongo = (titulo: string, texto: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(titulo, margin, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      const linhas = doc.splitTextToSize(texto || "-", pageWidth - margin * 2);
      doc.text(linhas, margin, y);
      y += linhas.length * 6 + 4;
    };

    // ===== DETALHAMENTO =====
    textoLongo("Detalhamento do Serviço:", os.detalhamento);

    // ===== ANTES =====
    textoLongo("Relatório - Antes:", os.antes?.relatorio);

    if (os.antes?.fotos?.length) {
      for (const foto of os.antes.fotos) {
        if (y + 70 > pageHeight - 30) {
          doc.addPage();
          y = 20;
        }
        doc.addImage(resolveImageSrc(foto), "JPEG", margin, y, 60, 60);
        y += 70;
      }
    }

    // ===== DEPOIS =====
    textoLongo("Relatório - Depois:", os.depois?.relatorio);

    if (os.depois?.fotos?.length) {
      for (const foto of os.depois.fotos) {
        if (y + 70 > pageHeight - 30) {
          doc.addPage();
          y = 20;
        }
        doc.addImage(resolveImageSrc(foto), "JPEG", margin, y, 60, 60);
        y += 70;
      }
    }

    // ===== RODAPÉ =====
    const totalPages = doc.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(100);
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
        <p><b>Marca:</b> {os.marca || "-"}</p>
      </div>
    </div>
  );
}
