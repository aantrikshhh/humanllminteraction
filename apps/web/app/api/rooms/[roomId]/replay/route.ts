export const dynamic = "force-dynamic";

const roomsBaseUrl = process.env.ROOMS_BASE_URL ?? "http://127.0.0.1:4011";

export async function GET(
  _request: Request,
  context: { params: Promise<{ roomId: string }> },
): Promise<Response> {
  const { roomId } = await context.params;

  try {
    const response = await fetch(`${roomsBaseUrl}/rooms/${roomId}/replay`, {
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
