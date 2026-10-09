import { Fragment } from "react";
import { cn } from "@/lib/utils";

/**
 * Minimal, safe Markdown renderer for assistant output and drafts.
 * Supports paragraphs, "- " bullets, "1. " numbered lists, **bold** and _italic_.
 * Builds React elements directly — never uses dangerouslySetInnerHTML.
 */
function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={`${keyBase}-${i++}`} className="font-semibold text-foreground">{tok.slice(2, -2)}</strong>);
    else out.push(<em key={`${keyBase}-${i++}`} className="text-muted-foreground">{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className={cn("space-y-2.5 text-sm leading-relaxed", className)}>
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        const isBullets = lines.every((l) => /^\s*- /.test(l));
        const isNumbered = lines.every((l) => /^\s*\d+\. /.test(l));
        if (isBullets)
          return (
            <ul key={bi} className="ml-4 list-disc space-y-1 marker:text-muted-foreground/60">
              {lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^\s*- /, ""), `${bi}-${li}`)}</li>
              ))}
            </ul>
          );
        if (isNumbered)
          return (
            <ol key={bi} className="ml-4 list-decimal space-y-1 marker:text-muted-foreground">
              {lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^\s*\d+\. /, ""), `${bi}-${li}`)}</li>
              ))}
            </ol>
          );
        // Mixed block: heading line followed by bullets, etc.
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {/^\s*- /.test(l) ? <span className="ml-1">• {inline(l.replace(/^\s*- /, ""), `${bi}-${li}`)}</span> : inline(l, `${bi}-${li}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
