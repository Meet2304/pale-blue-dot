import { llmsFullTxt } from "@/lib/discovery";

/** The short map plus every piece of work, for an agent that will not open each page. */
export function GET() {
  return new Response(llmsFullTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
