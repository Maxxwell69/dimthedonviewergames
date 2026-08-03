import {
  getJustInCaseSnapshot,
  justInCaseRoomExists,
  subscribeJustInCase,
} from "@/lib/just-in-case-sync";

type Params = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  if (!(await justInCaseRoomExists(token))) {
    return new Response("Not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  let cleanup: () => void = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      void getJustInCaseSnapshot(token).then((snapshot) => {
        send("ready", { ok: true });
        if (snapshot.state) {
          send("state", {
            state: snapshot.state,
            updatedAt: snapshot.updatedAt,
          });
        }
      });

      cleanup = subscribeJustInCase(token, (payload) => {
        send("state", payload);
      });

      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 15000);
    },
    cancel() {
      cleanup();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
