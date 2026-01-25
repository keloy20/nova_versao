"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

export default function AdminClientesPage() {
  const router = useRouter();

  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // criar cliente
  const [cliente, setCliente] = useState("");
  const [subcliente, setSubcliente] = useState("");
  const [marca, setMarca] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  // editar cliente
  const [clienteEditando, setClienteEditando] = useState<any | null>(null);

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
          marca,
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

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6 text-black">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow p-6 space-y-6">

        {/* TOPO */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Clientes</h1>
          <button
            onClick={() => router.push("/admin")}
            className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
          >
            Voltar
          </button>
        </div>

        {/* CRIAR */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="border p-2 rounded" placeholder="Cliente" value={cliente} onChange={e => setCliente(e.target.value)} />
          <input className="border p-2 rounded" placeholder="Subcliente / Unidade" value={subcliente} onChange={e => setSubcliente(e.target.value)} />
          <input className="border p-2 rounded" placeholder="Marca (opcional – DASA)" value={marca} onChange={e => setMarca(e.target.value)} />
          <input className="border p-2 rounded" placeholder="Endereço" value={endereco} onChange={e => setEndereco(e.target.value)} />
          <input className="border p-2 rounded" placeholder="Telefone" value={telefone} onChange={e => setTelefone(e.target.value)} />
          <input className="border p-2 rounded md:col-span-2" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        <button onClick={criarCliente} className="bg-green-600 text-white px-6 py-3 rounded">
          Salvar Cliente
        </button>

        {/* LISTA */}
        <div className="border-t pt-6 space-y-3">
          {clientes.map(c => (
            <div key={c._id} className="border rounded p-4">
              <b>{c.cliente}{c.subcliente && ` — ${c.subcliente}`}</b>
              {c.marca && <div><b>Marca:</b> {c.marca}</div>}
              {c.endereco && <div><b>Endereço:</b> {c.endereco}</div>}
              {c.telefone && <div><b>Telefone:</b> {c.telefone}</div>}

              <div className="flex gap-2 mt-2">
                <button onClick={() => setClienteEditando(c)} className="bg-blue-600 text-white px-3 py-1 rounded">Editar</button>
                <button onClick={() => excluirCliente(c._id)} className="bg-red-600 text-white px-3 py-1 rounded">Excluir</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL EDITAR */}
      {clienteEditando && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-full max-w-md space-y-3">
            <h2 className="text-xl font-bold">Editar Cliente</h2>

            {["cliente", "subcliente", "marca", "endereco", "telefone"].map((campo) => (
              <div key={campo}>
                <label className="font-semibold capitalize">{campo}</label>
                <input
                  className="border p-2 w-full rounded"
                  value={clienteEditando[campo] || ""}
                  onChange={(e) =>
                    setClienteEditando({ ...clienteEditando, [campo]: e.target.value })
                  }
                />
              </div>
            ))}

            <div className="flex gap-2">
              <button onClick={salvarEdicaoCliente} className="bg-green-600 text-white w-full py-2 rounded">Salvar</button>
              <button onClick={() => setClienteEditando(null)} className="bg-gray-300 w-full py-2 rounded">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

