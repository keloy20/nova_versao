"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import jsPDF from "jspdf";

const API_URL = "https://gerenciador-de-os.onrender.com";

export default function DetalheOSPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

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

  async function cancelarOS() {
    const ok = confirm("Tem certeza que deseja cancelar esta OS?");
    if (!ok) return;

    try {
      await apiFetch(`/projects/admin/cancelar/${id}`, { method: "PUT" });
      alert("OS cancelada com sucesso!");
      carregarOS();
    } catch (err: any) {
      alert("Erro ao cancelar: " + err.message);
    }
  }

  // 🔥 converte imagem da API em base64 (PDF)
  async function imageToBase64(url: string) {
    const res = await fetch(url);
    const blob = await res.blob();

    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }

  async function gerarPDF() {
    if (!os) return;

    const doc = new jsPDF();
    let y = 10;

    doc.setFontSize(14);
    doc.text(`Ordem de Serviço - ${os.osNumero}`, 10, y);
    y += 10;

    doc.setFontSize(10);
    doc.text(`Cliente: ${os.cliente}`, 10, y); y += 6;
    doc.text(`Marca: ${os.marca || "-"}`, 10, y); y += 6;
    doc.text(`Unidade: ${os.unidade || "-"}`, 10, y); y += 6;
    doc.text(`Endereço: ${os.endereco || "-"}`, 10, y); y += 6;
    doc.text(`Técnico: ${os.tecnico?.nome || "-"}`, 10, y); y += 10;

    doc.text("DETALHAMENTO:", 10, y); y += 6;
    doc.text(os.detalhamento || "-", 10, y, { maxWidth: 180 });
    y += 10;

    // ===== ANTES =====
    doc.text("ANTES:", 10, y); y += 6;
    doc.text(os.antes?.relatorio || "-", 10, y, { maxWidth: 180 });
    y += 6;

    if (os.antes?.fotos?.length) {
      for (const foto of os.antes.fotos) {
        const base64 = await imageToBase64(`${API_URL}${foto}`);
        doc.addImage(base64, "JPEG", 10, y, 60, 60);
        y += 70;

        if (y > 260) {
          doc.addPage();
          y = 10;
        }
      }
    }

    y += 10;

    // ===== DEPOIS =====
    doc.text("DEPOIS:", 10, y); y += 6;
    doc.text(os.depois?.relatorio || "-", 10, y, { maxWidth: 180 });
    y += 6;

    if (os.depois?.fotos?.length) {
      for (const foto of os.depois.fotos) {
        const base64 = await imageToBase64(`${API_URL}${foto}`);
        doc.addImage(base64, "JPEG", 10, y, 60, 60);
        y += 70;

        if (y > 260) {
          doc.addPage();
          y = 10;
        }
      }
    }

    doc.save(`OS-${os.osNumero}.pdf`);
  }

  if (loading) return <p className="p-6">Carregando...</p>;
  if (!os) return <p className="p-6">OS não encontrada</p>;

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex justify-center">
      <div className="bg-white max-w-xl w-full p-6 rounded-xl shadow">

        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={gerarPDF} className="bg-blue-600 text-white px-4 py-2 rounded">
            Gerar PDF
          </button>
          <button onClick={() => router.back()} className="bg-gray-300 px-4 py-2 rounded">
            Voltar
          </button>
        </div>

        <p><b>Cliente:</b> {os.cliente}</p>
        <p><b>Marca:</b> {os.marca || "-"}</p>
        <p><b>Unidade:</b> {os.unidade || "-"}</p>

        {/* ANTES */}
        <h3 className="mt-4 font-bold">ANTES</h3>
        <p>{os.antes?.relatorio || "-"}</p>

        <div className="grid grid-cols-2 gap-2 mt-2">
          {os.antes?.fotos?.map((foto: string, i: number) => (
            <img
              key={i}
              src={`${API_URL}${foto}`}
              className="h-32 w-full object-cover rounded border"
            />
          ))}
        </div>

        {/* DEPOIS */}
        <h3 className="mt-4 font-bold">DEPOIS</h3>
        <p>{os.depois?.relatorio || "-"}</p>

        <div className="grid grid-cols-2 gap-2 mt-2">
          {os.depois?.fotos?.map((foto: string, i: number) => (
            <img
              key={i}
              src={`${API_URL}${foto}`}
              className="h-32 w-full object-cover rounded border"
            />
          ))}
        </div>

      </div>
    </div>
  );
}
