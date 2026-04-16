export const dynamic = "force-dynamic";

const roomsBaseUrl = process.env.ROOMS_BASE_URL ?? "http://127.0.0.1:4011";

export async function GET(): Promise<Response> {
  return proxyRoomsRequest("/rooms", {
    method: "GET",
  });
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.text();

  return proxyRoomsRequest("/rooms/bootstrap", {
    method: "POST",
    body,
    headers: {
      "content-type": request.headers.get("content-type") ?? "application/json; charset=utf-8",
    },
  });
}

async function proxyRoomsRequest(path: string, init: RequestInit): Promise<Response> {
  try {
    const response = await fetch(`${roomsBaseUrl}${path}`, {
      ...init,
      cache: "no-store",
    });

    return new Response(await response.text(), {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: "rooms_proxy_unavailable",
        message: error instanceof Error ? error.message : "rooms service is unavailable",
      },
      {
        status: 502,
      },
    );
  }
}
