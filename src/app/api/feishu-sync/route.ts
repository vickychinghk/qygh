import { requireCurrentUser } from "@/lib/auth";
import { syncFeishuSubmissions } from "@/lib/feishu-sync";

export const dynamic = "force-dynamic";

export async function POST() {
  await requireCurrentUser();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        await syncFeishuSubmissions({
          onProgress: (event) => send(event),
        });
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : "同步失败",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "application/x-ndjson; charset=utf-8",
    },
  });
}
