import { createFileRoute } from "@tanstack/react-router";
import { handleAI } from "@/lib/ai.server";

export const Route = createFileRoute("/api/ai")({
  server: { handlers: { POST: ({ request }) => handleAI(request) } },
});
