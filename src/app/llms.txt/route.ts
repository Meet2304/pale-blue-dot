import { llmsTxt } from "@/lib/discovery";

/** The llms.txt standard: a short map of the site, in Markdown, as plain text. */
export const dynamic = "force-static";

export function GET() {
  return new Response(llmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
