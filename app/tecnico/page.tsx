"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

export default function TecnicoPage() {
  const router = useRouter();

  const [servicos, setServicos] = useState<any[]>([]);
  const [filtro, setFiltro] = useState<
    "aguardando_tecnico" | "em_andamento" | "concluido" | ""
  >("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "tecnico") {
      router.push("/login");
      return;
    }

    carregarServicos();
  }, []);

  async function carregarServicos() {
    try {
      const data = await apiFetch("/projects/tecnico/my");
      setServicos(data);
    } catch (err: any) {
      alert("Erro ao carregar serviços: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function abrirChamado(id: string) {
    try {
      await apiFetch(`/projects/tecnico/abrir/${id}`, {
        method: "PUT",
      });

      alert("Chamado iniciado!");
      carregarServicos();
    } catch (err: any) {
      alert("Erro ao abrir chamado: " + err.message);
    }
  }

  function logout() {
    const ok = confirm("Deseja realmente sair?");
    if (!ok) return;

    localStorage.clear();
    router.push("/login");
  }

  const listaFiltrada = servicos.filter((s) => {
    if (!filtro) return true;
    return s.status === filtro;
  });

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 text-black">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-6">
        {/* TOPO */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Painel do Técnico</h1>
          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Sair
          </button>
        </div>

        {/* FILTROS */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setFiltro("")}
            className={`px-4 py-2 rounded ${
              filtro === "" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            Todos
          </button>

          <button
            onClick={() => setFiltro("aguardando_tecnico")}
            className={`px-4 py-2 rounded ${
              filtro === "aguardando_tecnico"
                ? "bg-orange-500 text-white"
                : "bg-gray-200"
            }`}
          >
            Aguardando
          </button>

          <button
            onClick={() => setFiltro("em_andamento")}
            className={`px-4 py-2 rounded ${
              filtro === "em_andamento"
                ? "bg-yellow-500 text-white"
                : "bg-gray-200"
            }`}
          >
            Em andamento
          </button>

          <button
            onClick={() => setFiltro("concluido")}
            className={`px-4 py-2 rounded ${
              filtro === "concluido"
                ? "bg-green-600 text-white"
                : "bg-gray-200"
            }`}
          >
            Concluídos
          </button>
        </div>

        {/* LISTA */}
        {listaFiltrada.length === 0 && (
          <p className="text-gray-600">Nenhum serviço encontrado.</p>
        )}

        <div className="space-y-4">
          {listaFiltrada.map((s) => (
            <div
              key={s._id}
              className="border rounded-lg p-4 flex flex-col gap-2"
            >
              {/* CABEÇALHO */}
              <div className="flex justify-between items-center">
                <span className="font-bold">{s.osNumero}</span>

                <span
                  className={`text-sm px-3 py-1 rounded-full
                    ${
                      s.status === "aguardando_tecnico"
                        ? "bg-orange-100 text-orange-700"
                        : s.status === "em_andamento"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }
                  `}
                >
                  {s.status === "aguardando_tecnico" && "Aguardando"}
                  {s.status === "em_andamento" && "Em andamento"}
                  {s.status === "concluido" && "Concluído"}
                </span>
              </div>

             {/* INFORMAÇÕES DA OS */}
<div className="space-y-1 text-sm text-gray-700">

  {/* ===== DASA ===== */}
  {s.marca === "DASA" && (
    <>
      <div>
        <b>Cliente:</b> {s.cliente}
      </div>

      {s.marca && (
        <div>
          <b>Marca:</b> {s.marca}
        </div>
      )}

      {s.unidade && (
        <div>
          <b>Unidade:</b> {s.unidade}
        </div>
      )}
    </>
  )}

  {/* ===== NÃO DASA (BRINKS, ETC) ===== */}
  {s.marca !== "DASA" && (s.Subcliente || s.subgrupo) && (
    <div>
      <b>Subcliente:</b> {s.Subcliente || s.subgrupo}
    </div>
  )}

  {/* ===== CAMPOS COMUNS ===== */}
  {s.endereco && (
    <div>
      <b>Endereço:</b> {s.endereco}
    </div>
  )}

  {s.telefone && (
    <div>
      <b>Telefone:</b> {s.telefone}
    </div>
  )}

  {s.detalhamento && (
    <div className="mt-2 p-2 bg-yellow-50 border rounded text-sm">
      <b>Detalhamento:</b>
      <p>{s.detalhamento}</p>
    </div>
  )}
</div>


              {/* AÇÕES */}
              <div className="flex gap-2 mt-2 flex-wrap">
                {s.status === "aguardando_tecnico" && (
                  <button
                    onClick={() => abrirChamado(s._id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  >
                    Abrir chamado
                  </button>
                )}

                {s.status !== "aguardando_tecnico" && (
                  <button
                    onClick={() =>
                      router.push(`/tecnico/servicos/${s._id}`)
                    }
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
                  >
                    Ver
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
