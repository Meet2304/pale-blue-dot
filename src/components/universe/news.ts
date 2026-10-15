import { NEWS, UNITS } from "@/content/work";

/**
 * The latest news (work.ts), as it stands at a moment: which piece of work
 * it is (its index, the same as the map's) and the line to say, or null once
 * it is no longer news. The server can't know the visitor's day, so the page
 * starts from `newsAt(null)`, the line before the turn, and checks the
 * clock once it is running.
 */
export type NewsNow = { unit: number; id: string; line: string };

export function newsAt(now: number | null): NewsNow | null {
  const news = NEWS;
  if (!news) return null;
  const unit = UNITS.findIndex((u) => u.id === news.id);
  if (unit < 0) return null;
  if (now !== null && now >= Date.parse(news.until)) return null;
  const turned = now !== null && now >= Date.parse(news.turn);
  return { unit, id: news.id, line: turned ? news.after : news.before };
}
