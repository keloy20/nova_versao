"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { CheckCircle, Clock, AlertCircle, Calendar } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();

  const [servicos, setServicos] = useState<any[]>([]);
  const [servicosFiltrados, setServicosFiltrados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  const [osHoje, setOsHoje] = useState(0);

  // calendário
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // 🔒 PROTEÇÃO TOTAL
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "admin") {
      router.replace("/login");
      return;
    }

    carregarServicos();
  }, []);

  async function carregarServicos() {
    try {
      setLoading(true);

      const data = await apiFetch("/projects/admin/all");

      const ordenado = [...data].sort((a, b) => {
        const osA = a.osNumero || "";
        const osB = b.osNumero || "";
        return osB.localeCompare(osA);
      });

      setServicos(ordenado);
      setServicosFiltrados(ordenado);
      calcularOsHoje(ordenado);
    } catch (err: any) {
      alert(err.message || "Erro ao carregar serviços");
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  function calcularOsHoje(lista: any[]) {
    const hoje = new Date().toISOString().split("T")[0];
    const totalHoje = lista.filter((s) => {
      if (!s.createdAt) return false;
      const data = new Date(s.createdAt).toISOString().split("T")[0];
      return data === hoje;
    }).length;

    setOsHoje(totalHoje);
  }

  async function cancelarServico(id: string) {
    if (!confirm("Deseja cancelar esta OS?")) return;

    try {
      await apiFetch(`/projects/admin/cancelar/${id}`, {
        method: "PUT",
      });
      carregarServicos();
    } catch (err: any) {
      alert(err.message);
    }
  }

  const listaFinal = servicosFiltrados.filter((s) => {
    const cliente = (s.cliente || "").toLowerCase();
    const subcliente = (s.Subcliente || s.subgrupo || "").toLowerCase();
    const buscaLower = busca.toLowerCase();

    const matchBusca =
      cliente.includes(buscaLower) ||
      subcliente.includes(buscaLower);

    const matchStatus = filtroStatus ? s.status === filtroStatus : true;

    return matchBusca && matchStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-black">
      <h1 className="text-3xl font-bold mb-4">Painel do Administrador</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => router.push("/admin/servicos/novo")} className="btn-blue">+ Nova OS</button>
        <button onClick={() => router.push("/admin/tecnicos")} className="btn-dark">Técnicos</button>
        <button onClick={() => router.push("/admin/clientes")} className="btn-indigo">Clientes</button>
        <button onClick={() => setMostrarCalendario(true)} className="btn-purple flex items-center gap-2">
          <Calendar size={16} /> Calendário
        </button>
      </div>

      {listaFinal.length === 0 && <p>Nenhuma OS encontrada.</p>}

      <div className="grid gap-4">
        {listaFinal.map((s) => (
          <div key={s._id} className="bg-white p-4 rounded shadow">
            <b>{s.osNumero}</b>
            <p>Cliente: {s.cliente}</p>
            <p>Status: {s.status}</p>

            <div className="flex gap-2 mt-2">
              <button onClick={() => router.push(`/admin/servicos/${s._id}`)} className="btn-blue">Ver</button>
              <button onClick={() => cancelarServico(s._id)} className="btn-red">Cancelar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
