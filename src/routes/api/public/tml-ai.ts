import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/tml-ai")({
  server: { handlers: { POST: async ({ request }) => {
    const { handleTmlAi } = await import("@/lib/tml-ai.server");
    return handleTmlAi(request);
  } } },
});