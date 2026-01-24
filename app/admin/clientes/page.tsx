"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";

export default function AdminClientesPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // criar cliente
  const [cliente, setCliente] = useState("");
  const [subcliente, setSubcliente] = useState("");
  const [marca, setMarca] = useState(""); // 🔥 NOVO
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  // editar cliente
  const [clienteEditando, setClienteEditando] = useState<any>(null);

  useEffect(() => {
    carregarClientes();
  }, []);

  async function carregarClientes() {
    try {
      const data = await apiFetch("/clientes");
      setClientes(data);
    } catch {
      alert("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  }

  // ===== CRIAR =====
  async function criarCliente() {
    if (!cliente) {
      alert("Cliente é obrigatório");
      return;
    }

    try {
      await apiFetch("/clientes", {
        method: "POST",
        body: JSON.stringify({
          cliente,
          subcliente,
          marca, // 🔥
          endereco,
          telefone,
          email,
        }),
      });

      alert("Cliente criado com sucesso!");
      setCliente("");
      setSubcliente("");
      setMarca("");
      setEndereco("");
      setTelefone("");
      setEmail("");
      carregarClientes();
    } catch (err: any) {
      alert(err.message);
    }
  }

  // ===== SALVAR EDIÇÃO =====
  async function salvarEdicaoCliente() {
    try {
      await apiFetch(`/clientes/${clienteEditando._id}`, {
        method: "PUT",
        body: JSON.stringify(clienteEditando),
      });

      alert("Cliente atualizado com sucesso!");
      setClienteEditando(null);
      carregarClientes();
    } catch (err: any) {
      alert("Erro ao atualizar cliente: " + err.message);
    }
  }

  // ===== EXCLUIR =====
  async function excluirCliente(id: string) {
    const ok = confirm("Deseja excluir este cliente?");
    if (!ok) return;

    try {
      await apiFetch(`/clientes/${id}`, { method: "DELETE" });
      carregarClientes();
    } catch {
      alert("Erro ao excluir");
    }
  }

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 text-black">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow p-6 space-y-6">

        <h1 className="text-2xl font-bold">Clientes</h1>

        {/* ===== CRIAR CLIENTE ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="border p-2 rounded"
            placeholder="Cliente (ex: DASA, BRINKS)"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
          />

          <input
            className="border p-2 rounded"
            placeholder="Subcliente / Unidade"
            value={subcliente}
            onChange={(e) => setSubcliente(e.target.value)}
          />

          <input
            className="border p-2 rounded"
            placeholder="Marca (opcional – DASA)"
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
          />

          <input
            className="border p-2 rounded"
            placeholder="Endereço"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
          />

          <input
            className="border p-2 rounded"
            placeholder="Telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />

          <input
            className="border p-2 rounded md:col-span-2"
            placeholder="Email (opcional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <button
          onClick={criarCliente}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded"
        >
          Salvar Cliente
        </button>

        {/* ===== LISTA ===== */}
        <div className="border-t pt-6 space-y-3">
          {clientes.map((c) => (
            <div key={c._id} className="border rounded p-4 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div className="font-bold">
                  {c.cliente}
                  {c.subcliente && ` — ${c.subcliente}`}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setClienteEditando(c)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => excluirCliente(c._id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Excluir
                  </button>
                </div>
              </div>

              {c.marca && <div><b>Marca:</b> {c.marca}</div>}
              {c.endereco && <div><b>Endereço:</b> {c.endereco}</div>}
              {c.telefone && <div><b>Telefone:</b> {c.telefone}</div>}
            </div>
          ))}

          {clientes.length === 0 && (
            <p className="text-gray-600">Nenhum cliente cadastrado.</p>
          )}
        </div>
      </div>

      {/* ===== MODAL EDITAR ===== */}
      {clienteEditando && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-3">
            <h2 className="text-xl font-bold">Editar Cliente</h2>

            <input
              className="border p-2 w-full rounded"
              placeholder="Cliente"
              value={clienteEditando.cliente}
              onChange={(e) =>
                setClienteEditando({ ...clienteEditando, cliente: e.target.value })
              }
            />

            <input
              className="border p-2 w-full rounded"
              placeholder="Subcliente / Unidade"
              value={clienteEditando.subcliente || ""}
              onChange={(e) =>
                setClienteEditando({ ...clienteEditando, subcliente: e.target.value })
              }
            />

            <input
              className="border p-2 w-full rounded"
              placeholder="Marca (opcional – DASA)"
              value={clienteEditando.marca || ""}
              onChange={(e) =>
                setClienteEditando({ ...clienteEditando, marca: e.target.value })
              }
            />

            <input
              className="border p-2 w-full rounded"
              placeholder="Endereço"
              value={clienteEditando.endereco || ""}
              onChange={(e) =>
                setClienteEditando({ ...clienteEditando, endereco: e.target.value })
              }
            />

            <input
              className="border p-2 w-full rounded"
              placeholder="Telefone"
              value={clienteEditando.telefone || ""}
              onChange={(e) =>
                setClienteEditando({ ...clienteEditando, telefone: e.target.value })
              }
            />

            <div className="flex gap-2 mt-4">
              <button
                onClick={salvarEdicaoCliente}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded w-full"
              >
                Salvar
              </button>

              <button
                onClick={() => setClienteEditando(null)}
                className="bg-gray-300 px-4 py-2 rounded w-full"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
