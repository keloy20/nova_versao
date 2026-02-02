"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import jsPDF from "jspdf";

export default function DetalheOSPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [os, setOs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    carregarOS();
    setUserRole(localStorage.getItem("role"));
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

  async function cancelarOS() {
    const ok = confirm("Tem certeza que deseja cancelar esta OS?");
    if (!ok) return;

    try {
      await apiFetch(`/projects/admin/cancelar/${id}`, { method: "PUT" });
      alert("OS cancelada com sucesso!");
      await carregarOS();
    } catch (err: any) {
      alert("Erro ao cancelar: " + err.message);
    }
  }

  async function excluirOS() {
    const ok = confirm(
      "⚠️ ATENÇÃO!\n\nEssa ação NÃO pode ser desfeita.\nDeseja excluir esta OS definitivamente?"
    );
    if (!ok) return;

    try {
      await apiFetch(`/projects/admin/delete/${id}`, { method: "DELETE" });
      alert("OS excluída com sucesso!");
      router.push("/admin");
    } catch (err: any) {
      alert("Erro ao excluir OS: " + err.message);
    }
  }

  /* =====================================================
     PDF — 2 PÁGINAS FIXAS (ANTES / DEPOIS)
  ===================================================== */
function gerarPDF() {
  if (!os) return;

  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = 210;
  const margin = 15;

  const imgW = 80;
  const imgH = 55;
  const gap = 5;

  function titulo(txt: string, y: number) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(txt, margin, y);
    doc.setFont("helvetica", "normal");
  }

  function texto(txt: string, y: number) {
    doc.setFontSize(10);
    const linhas = doc.splitTextToSize(
      txt || "-",
      pageWidth - margin * 2
    );
    doc.text(linhas, margin, y);
    return y + linhas.length * 5 + 3;
  }

  function fotosGrid(fotos: string[], startY: number) {
    const baseX = margin;
    const pos = [
      { x: baseX, y: startY },
      { x: baseX + imgW + gap, y: startY },
      { x: baseX, y: startY + imgH + gap },
      { x: baseX + imgW + gap, y: startY + imgH + gap },
    ];

    fotos.slice(0, 4).forEach((foto, i) => {
      doc.addImage(
        `data:image/jpeg;base64,${foto}`,
        "JPEG",
        pos[i].x,
        pos[i].y,
        imgW,
        imgH
      );
    });
  }

  /* ================= PÁGINA 1 — ANTES ================= */
  let y = margin;

  // 🔹 LOGO SERTECH (CANTO SUPERIOR DIREITO)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(31, 79, 163); // azul #1f4fa3
  doc.text("SERTECH", pageWidth - margin, y, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Serviços tecnológicos",
    pageWidth - margin,
    y + 5,
    { align: "right" }
  );

  doc.setTextColor(0, 0, 0); // volta para preto
  y += 12;

  doc.setFontSize(16);
  doc.text("ORDEM DE SERVIÇO", pageWidth / 2, y, { align: "center" });
  y += 10;

  y = texto(`OS: ${os.osNumero}`, y);
  y = texto(`Status: ${os.status}`, y);
  y = texto(`Cliente: ${os.cliente}`, y);

  if (os.cliente === "DASA") {
    y = texto(`Unidade: ${os.unidade || "-"}`, y);
    y = texto(`Marca: ${os.marca || "-"}`, y);
  } else {
    y = texto(
      `Subcliente: ${os.subcliente || os.Subcliente || os.subgrupo || "-"}`,
      y
    );
  }

  y = texto(`Endereço: ${os.endereco || "-"}`, y);
  y = texto(`Telefone: ${os.telefone || "-"}`, y);
  y = texto(`Técnico: ${os.tecnico?.nome || "-"}`, y);

  y += 5;
  titulo("RELATÓRIO INICIAL (ANTES)", y);
  y += 6;
  y = texto(os.antes?.relatorio, y);

  titulo("OBSERVAÇÃO INICIAL (ANTES)", y);
  y += 6;
  y = texto(os.antes?.observacao, y);

  titulo("FOTOS – ANTES", y);
  y += 6;
  fotosGrid(os.antes?.fotos || [], y);

  /* ================= PÁGINA 2 — DEPOIS ================= */
  doc.addPage();
  y = margin;

  // 🔹 LOGO SERTECH (PÁGINA 2)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(31, 79, 163);
  doc.text("SERTECH", pageWidth - margin, y, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Automação Eletrônica",
    pageWidth - margin,
    y + 5,
    { align: "right" }
  );

  doc.setTextColor(0, 0, 0);
  y += 12;

  titulo("RELATÓRIO FINAL (DEPOIS)", y);
  y += 6;
  y = texto(os.depois?.relatorio, y);

  titulo("OBSERVAÇÃO FINAL (DEPOIS)", y);
  y += 6;
  y = texto(os.depois?.observacao, y);

  titulo("FOTOS – DEPOIS", y);
  y += 6;
  fotosGrid(os.depois?.fotos || [], y);

  doc.save(`OS-${os.osNumero}.pdf`);
}



  /* ===================================================== */

  if (loading) {
    return <div className="p-6 text-center">Carregando...</div>;
  }

  if (!os) {
    return <div className="p-6 text-center text-red-600">OS não encontrada</div>;
  }

  const statusColor =
    os.status === "cancelado"
      ? "bg-red-100 text-red-700"
      : os.status === "concluido"
      ? "bg-green-100 text-green-700"
      : os.status === "em_andamento"
      ? "bg-blue-100 text-blue-700"
      : "bg-yellow-100 text-yellow-700";

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex justify-center">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-6">

        {/* TOPO */}
        <div className="flex flex-wrap justify-between gap-2 mb-6">
          <h1 className="text-2xl font-bold">Detalhes da OS</h1>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={gerarPDF}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              Gerar PDF
            </button>

            {userRole === "admin" && (
              <>
                <button
                  onClick={() => router.push(`/admin/servicos/${id}/editar`)}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm"
                >
                  ✏️ Alterar
                </button>

                <button
                  onClick={cancelarOS}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  ❌ Cancelar
                </button>

                <button
                  onClick={excluirOS}
                  className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg text-sm"
                >
                  🗑️ Excluir OS
                </button>
              </>
            )}

            <button
              onClick={() => router.back()}
              className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded-lg text-sm"
            >
              Voltar
            </button>
          </div>
        </div>

        {/* DADOS */}
        <div className="space-y-4 text-sm">
          <Info label="Número da OS" value={os.osNumero} />

          <div>
            <p className="text-xs font-semibold text-gray-600">Status</p>
            <span className={`inline-block px-3 py-1 rounded-full ${statusColor}`}>
              {os.status}
            </span>
          </div>

          <Info label="Cliente" value={os.cliente} />

          {os.cliente === "DASA" ? (
            <>
              <Info label="Unidade" value={os.unidade} />
              <Info label="Marca" value={os.marca} />
            </>
          ) : (
            <Info
              label="Subcliente"
              value={os.subcliente || os.Subcliente || os.subgrupo}
            />
          )}

          <Info label="Endereço" value={os.endereco} />
          <Info label="Telefone" value={os.telefone} />
          <Info label="Técnico" value={os.tecnico?.nome} />

          <div className="bg-blue-50 p-3 rounded-lg border">
            <p className="text-xs font-semibold text-blue-700 mb-1">
              Detalhamento do Serviço
            </p>
            <p className="whitespace-pre-line">
              {os.detalhamento || "-"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: any) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-600">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}
