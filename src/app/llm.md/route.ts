import { llmsTxt } from "@/lib/discovery";

/** The same map as `/llms.txt`, at the name some agents request. */
export function GET() {
  return new Response(llmsTxt(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
