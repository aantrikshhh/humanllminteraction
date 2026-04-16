export const dynamic = "force-dynamic";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:4010";

export async function GET(
  _request: Request,
  context: { params: Promise<{ roomId: string }> },
): Promise<Response> {
  const { roomId } = await context.params;
  return proxyApiRequest(`/matches/rooms/${encodeURIComponent(roomId)}`);
}

async function proxyApiRequest(path: string): Promise<Response> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
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
        error: "api_proxy_unavailable",
        message: error instanceof Error ? error.message : "api service is unavailable",
      },
      {
        status: 502,
      },
    );
  }
}
