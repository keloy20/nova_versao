"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminServicosPage() {
  const router = useRouter();
  const [servicos, setServicos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "admin") {
      router.push("/login");
      return;
    }

    carregar();
  }, []);

  async function carregar() {
    try {
      const res = await fetch(
        "https://gerenciador-de-os.onrender.com/projects/admin/all",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const data = await res.json();
      setServicos(data);
    } catch (err) {
      alert("Erro ao carregar serviços");
    } finally {
      setLoading(false);
    }
  }

  async function excluirOS(id: string) {
    const ok = confirm("Tem certeza que deseja EXCLUIR esta OS?");
    if (!ok) return;

    try {
      await fetch(
        `https://gerenciador-de-os.onrender.com/projects/admin/delete/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // remove da lista sem recarregar a página
      setServicos((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      alert("Erro ao excluir OS");
    }
  }

  if (loading) return <p className="p-4">Carregando...</p>;

  return (
    <div className="min-h-screen p-6 bg-gray-100 text-black">
      <h1 className="text-2xl font-bold mb-4">Serviços</h1>

      <div className="grid gap-3">
        {servicos.map((s) => (
          <div
            key={s._id}
            className="bg-white p-4 rounded shadow flex justify-between items-center"
          >
            <div>
              <strong>{s.osNumero}</strong>
              <p>{s.cliente}</p>
              <p className="text-sm text-gray-600">Status: {s.status}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/admin/servicos/${s._id}`)}
                className="bg-gray-800 text-white px-3 py-1 rounded"
              >
                Ver
              </button>

              <button
                onClick={() => excluirOS(s._id)}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
