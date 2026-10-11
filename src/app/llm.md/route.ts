import { llmsTxt } from "@/lib/discovery";

/** The same map as `/llms.txt`, at the name some agents request. */
export const dynamic = "force-static";

export function GET() {
  return new Response(llmsTxt(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
