/** Small text utilities shared by the deterministic "AI" engines. */

const STOP = new Set(
  "a an the and or of to for in on at with by from is are be can so that this these those it its as we our you your i my me do does did not no yes what which who whom how when where why should could would will about into than then there their them they he she his her has have had was were been being any all some more most also just only".split(
    " ",
  ),
);

export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9à-ÿ#.\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^[.-]+|[.-]+$/g, ""))
    .filter((w) => w.length > 1 && !STOP.has(w));
}

/** Crude stemming so "reservations" matches "reservation" and "checks" matches "check". */
export function stem(w: string): string {
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export function stems(text: string): Set<string> {
  return new Set(tokens(text).map(stem));
}

/** Cosine-style word overlap between two texts (0–1), used for duplicate detection. */
export function similarity(a: string, b: string): number {
  const A = stems(a);
  const B = stems(b);
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared++;
  return shared / Math.sqrt(A.size * B.size);
}

export function includesAny(text: string, words: string[]): boolean {
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w));
}

export function sentenceCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function list(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function plural(n: number, word: string, pluralWord = `${word}s`): string {
  return `${n} ${n === 1 ? word : pluralWord}`;
}
