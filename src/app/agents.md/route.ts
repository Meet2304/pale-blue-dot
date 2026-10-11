import { agentsMd } from "@/lib/discovery";

/**
 * Public notes for agents fetching the site. The repo's AGENTS.md is a
 * different file: it tells coding agents about this Next.js app.
 */
export function GET() {
  return new Response(agentsMd(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
