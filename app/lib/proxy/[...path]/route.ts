import { NextRequest, NextResponse } from "next/server";

const API_URL_RAW =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:10000";

const API_URL = API_URL_RAW.replace("://localhost", "://127.0.0.1");

type ProxyContext = {
  params: Promise<{
    path: string[];
  }>;
};

export async function GET(req: NextRequest, { params }: ProxyContext) {
  return forward(req, await params);
}

export async function POST(req: NextRequest, { params }: ProxyContext) {
  return forward(req, await params);
}

export async function PUT(req: NextRequest, { params }: ProxyContext) {
  return forward(req, await params);
}

export async function DELETE(req: NextRequest, { params }: ProxyContext) {
  return forward(req, await params);
}

async function forward(req: NextRequest, params: { path: string[] }) {
  try {
    const token = req.headers.get("authorization");
    const path = params.path.join("/");
    const search = req.nextUrl.search || "";

    const body =
      req.method === "GET" || req.method === "DELETE"
        ? undefined
        : await req.arrayBuffer();

    const contentType = req.headers.get("content-type");
    const res = await fetch(`${API_URL}/${path}${search}`, {
      method: req.method,
      headers: {
        ...(contentType ? { "Content-Type": contentType } : {}),
        ...(token ? { Authorization: token } : {}),
      },
      body,
    });

    const text = await res.text();

    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "application/json",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Backend indisponivel. Inicie a API local na porta 10000.";

    return NextResponse.json(
      {
        error: "Falha de conexao com o backend local",
        message,
      },
      { status: 503 }
    );
  }
}
