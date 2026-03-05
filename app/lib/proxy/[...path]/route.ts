import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.VITE_API_URL ||
  "http://127.0.0.1:3001";

type ProxyContext = {
  params: {
    path: string[];
  };
};

export async function GET(req: NextRequest, { params }: ProxyContext) {
  return forward(req, params);
}

export async function POST(req: NextRequest, { params }: ProxyContext) {
  return forward(req, params);
}

export async function PUT(req: NextRequest, { params }: ProxyContext) {
  return forward(req, params);
}

export async function DELETE(req: NextRequest, { params }: ProxyContext) {
  return forward(req, params);
}

async function forward(req: NextRequest, params: ProxyContext["params"]) {
  const token = req.headers.get("authorization");
  const path = params.path.join("/");

  const body =
    req.method === "GET" || req.method === "DELETE"
      ? undefined
      : await req.text();

  const res = await fetch(`${API_URL}/${path}`, {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
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
}
