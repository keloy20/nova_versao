"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { normalizeStatus, STATUS } from "@/app/lib/os";

type Metrics = {
  month?: string;
  total_abertas?: number;
  total_em_atendimento?: number;
  total_pausadas?: number;
  total_finalizadas_tecnico?: number;
  total_fechadas?: number;
  total_pendentes?: number;
};

type OSItem = {
  cliente?: string;
  subcliente?: string;
  unidade?: string;
  marca?: string;
  status?: string;
  createdAt?: string;
  data_abertura?: string;
};

export default function AdminGraficosPage() {
  const router = useRouter();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [osList, setOsList] = useState<OSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [subclienteFiltro, setSubclienteFiltro] = useState("");
  const [marcaFiltro, setMarcaFiltro] = useState("");
  const [unidadeFiltro, setUnidadeFiltro] = useState("");

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setMetrics(buildMetricsFromList(osList, month, {
      cliente: clienteFiltro,
      subcliente: subclienteFiltro,
      marca: marcaFiltro,
      unidade: unidadeFiltro,
    }));
  }, [osList, month, clienteFiltro, subclienteFiltro, marcaFiltro, unidadeFiltro]);

  async function carregar() {
    try {
      setLoading(true);
      const list = await apiFetch("/projects/admin/all");
      setOsList(Array.isArray(list) ? list : []);
    } catch {
      setOsList([]);
    } finally {
      setLoading(false);
    }
  }

  const clientes = useMemo(() => {
    return Array.from(new Set(osList.map((item) => String(item.cliente || "").trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );
  }, [osList]);

  const clienteFiltroNormalizado = normalizeFilterText(clienteFiltro);
  const clienteEhDasa = clienteFiltroNormalizado.includes("dasa");
  const subclienteFiltroNormalizado = normalizeFilterText(subclienteFiltro);
  const marcaFiltroNormalizado = normalizeFilterText(marcaFiltro);
  const unidadeFiltroNormalizado = normalizeFilterText(unidadeFiltro);

  const clientesSugestoes = useMemo(() => {
    if (!clienteFiltroNormalizado) return clientes;
    return clientes.filter((cliente) => normalizeFilterText(cliente).includes(clienteFiltroNormalizado));
  }, [clientes, clienteFiltroNormalizado]);

  const subclientes = useMemo(() => {
    if (!clienteFiltro || clienteEhDasa) return [];
    return Array.from(
      new Set(
        osList
          .filter((item) => normalizeFilterText(item.cliente).includes(clienteFiltroNormalizado))
          .map((item) => String(item.subcliente || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [osList, clienteFiltro, clienteEhDasa, clienteFiltroNormalizado]);

  const subclientesSugestoes = useMemo(() => {
    if (!subclienteFiltroNormalizado) return subclientes;
    return subclientes.filter((subcliente) => normalizeFilterText(subcliente).includes(subclienteFiltroNormalizado));
  }, [subclientes, subclienteFiltroNormalizado]);

  const marcas = useMemo(() => {
    if (!clienteEhDasa) return [];
    return Array.from(
      new Set(
        osList
          .filter((item) => normalizeFilterText(item.cliente).includes(clienteFiltroNormalizado))
          .filter((item) => !unidadeFiltro || normalizeFilterText(item.unidade) === normalizeFilterText(unidadeFiltro))
          .map((item) => String(item.marca || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [osList, clienteEhDasa, clienteFiltroNormalizado, unidadeFiltro]);

  const marcasSugestoes = useMemo(() => {
    if (!marcaFiltroNormalizado) return marcas;
    return marcas.filter((marca) => normalizeFilterText(marca).includes(marcaFiltroNormalizado));
  }, [marcas, marcaFiltroNormalizado]);

  const unidades = useMemo(() => {
    if (!clienteEhDasa) return [];
    return Array.from(
      new Set(
        osList
          .filter((item) => normalizeFilterText(item.cliente).includes(clienteFiltroNormalizado))
          .filter((item) => !marcaFiltro || normalizeFilterText(item.marca) === normalizeFilterText(marcaFiltro))
          .map((item) => String(item.unidade || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [osList, clienteEhDasa, clienteFiltroNormalizado, marcaFiltro]);

  const unidadesSugestoes = useMemo(() => {
    if (!unidadeFiltroNormalizado) return unidades;
    return unidades.filter((unidade) => normalizeFilterText(unidade).includes(unidadeFiltroNormalizado));
  }, [unidades, unidadeFiltroNormalizado]);

  const slices = useMemo(
    () => [
      { key: "Abertas", value: Number(metrics?.total_abertas || 0), color: "#f59e0b" },
      { key: "Em andamento", value: Number(metrics?.total_em_atendimento || 0), color: "#0284c7" },
      { key: "Pausadas", value: Number(metrics?.total_pausadas || 0), color: "#9333ea" },
      {
        key: "Finalizadas",
        value: Number(metrics?.total_finalizadas_tecnico || 0) + Number(metrics?.total_fechadas || 0),
        color: "#0f766e",
      },
    ],
    [metrics]
  );

  const total = slices.reduce((acc, s) => acc + s.value, 0) || 1;
  const radius = 80;
  const stroke = 40;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
        >
          Voltar
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700">Mes</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700">Cliente</label>
            <input
              list="clientes-grafico"
              value={clienteFiltro}
              onChange={(e) => {
                setClienteFiltro(e.target.value);
                setSubclienteFiltro("");
                setMarcaFiltro("");
                setUnidadeFiltro("");
              }}
              placeholder="Pesquise ou selecione o cliente"
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
            <datalist id="clientes-grafico">
              {clientesSugestoes.map((cliente) => (
                <option key={cliente} value={cliente} />
              ))}
            </datalist>
          </div>
          {Boolean(clienteFiltro) && !clienteEhDasa && (
            <div>
              <label className="block text-sm font-semibold text-slate-700">Subcliente</label>
              <input
                list="subclientes-grafico"
                value={subclienteFiltro}
                onChange={(e) => setSubclienteFiltro(e.target.value)}
                placeholder="Pesquise ou selecione o subcliente"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
              <datalist id="subclientes-grafico">
                {subclientesSugestoes.map((subcliente) => (
                  <option key={subcliente} value={subcliente} />
                ))}
              </datalist>
            </div>
          )}
          {Boolean(clienteFiltro) && clienteEhDasa && (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Marca</label>
                <input
                  list="marcas-grafico"
                  value={marcaFiltro}
                  onChange={(e) => {
                    setMarcaFiltro(e.target.value);
                    setUnidadeFiltro("");
                  }}
                  placeholder="Pesquise ou selecione a marca"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
                <datalist id="marcas-grafico">
                  {marcasSugestoes.map((marca) => (
                    <option key={marca} value={marca} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Unidade</label>
                <input
                  list="unidades-grafico"
                  value={unidadeFiltro}
                  onChange={(e) => setUnidadeFiltro(e.target.value)}
                  placeholder="Pesquise ou selecione a unidade"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
                <datalist id="unidades-grafico">
                  {unidadesSugestoes.map((unidade) => (
                    <option key={unidade} value={unidade} />
                  ))}
                </datalist>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-600">Carregando metricas...</p>
        ) : (
          <div className="space-y-5">
            <div className="mx-auto flex justify-center">
              <svg width="220" height="220" viewBox="0 0 220 220" aria-label="Grafico de pizza">
                <circle cx="110" cy="110" r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
                {slices.map((item) => {
                  const frac = item.value / total;
                  const dash = frac * circumference;
                  const offset = circumference - cumulative;
                  cumulative += dash;
                  return (
                    <circle
                      key={item.key}
                      cx="110"
                      cy="110"
                      r={radius}
                      fill="none"
                      stroke={item.color}
                      strokeWidth={stroke}
                      strokeDasharray={`${dash} ${circumference - dash}`}
                      strokeDashoffset={offset}
                      transform="rotate(-90 110 110)"
                      strokeLinecap="butt"
                    />
                  );
                })}
                <circle cx="110" cy="110" r="46" fill="#ffffff" />
                <text x="110" y="104" textAnchor="middle" className="fill-slate-500 text-[12px] font-semibold">
                  Total
                </text>
                <text x="110" y="124" textAnchor="middle" className="fill-slate-800 text-[18px] font-extrabold">
                  {total}
                </text>
              </svg>
            </div>

            <div className="grid gap-2">
              {slices.map((item) => {
                const pct = Math.round((item.value / total) * 100);
                return (
                  <div key={item.key} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold text-slate-700">{item.key}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">{item.value}</p>
                      <p className="text-xs text-slate-500">{pct}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function buildMetricsFromList(
  list: OSItem[],
  month: string,
  filtros?: { cliente?: string; subcliente?: string; marca?: string; unidade?: string }
): Metrics {
  const filtered = list.filter((item) => {
    const cliente = normalizeFilterText(item.cliente);
    const subcliente = normalizeFilterText(item.subcliente);
    const marca = normalizeFilterText(item.marca);
    const unidade = normalizeFilterText(item.unidade);

    if (filtros?.cliente && !cliente.includes(normalizeFilterText(filtros.cliente))) return false;
    if (filtros?.subcliente && !subcliente.includes(normalizeFilterText(filtros.subcliente))) return false;
    if (filtros?.marca && !marca.includes(normalizeFilterText(filtros.marca))) return false;
    if (filtros?.unidade && !unidade.includes(normalizeFilterText(filtros.unidade))) return false;

    const rawDate = item.data_abertura || item.createdAt;
    if (!rawDate) return false;
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return false;
    return date.toISOString().slice(0, 7) === month;
  });

  const total_abertas = filtered.filter((o) => normalizeStatus(o.status) === STATUS.ABERTA).length;
  const total_em_atendimento = filtered.filter((o) => normalizeStatus(o.status) === STATUS.EM_ATENDIMENTO).length;
  const total_pausadas = filtered.filter((o) => normalizeStatus(o.status) === STATUS.PAUSADA).length;
  const total_finalizadas_tecnico = filtered.filter(
    (o) => normalizeStatus(o.status) === STATUS.FINALIZADA_PELO_TECNICO
  ).length;
  const total_fechadas = filtered.filter((o) => normalizeStatus(o.status) === STATUS.VALIDADA_PELO_ADMIN).length;

  return {
    month,
    total_abertas,
    total_em_atendimento,
    total_pausadas,
    total_finalizadas_tecnico,
    total_fechadas,
    total_pendentes: total_abertas + total_em_atendimento + total_pausadas,
  };
}

function normalizeFilterText(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
