"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BookOpen, FileSearch, Layers, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { documents } from "@/lib/data/catalog";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";
import { usePageContext, useS } from "@/components/common/hooks";
import { EmptyState, PageHeader } from "@/components/common/layout";
import { AskBox } from "./ask-box";
import { categoryIcon, DocCard } from "./doc-card";
import { DocPreview } from "./doc-preview";
import { ChipRow, FilterChip } from "./filter-chip";
import { CATEGORIES, categoryCounts, filterDocuments, popularTags, type DocCategory } from "./filter";

export function KnowledgeHub() {
  const s = useS();
  const router = useRouter();
  const params = useSearchParams();
  const askAssistant = useWorkspace((x) => x.askAssistant);
  const docId = params.get("doc");
  const focus = params.get("focus") === "1";
  const searchRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DocCategory | "all">("all");
  const [tag, setTag] = useState<string | null>(null);
  const [related, setRelated] = useState(false);

  const openDoc = documents.find((d) => d.id === docId);
  usePageContext(openDoc ? { kind: "document", id: openDoc.id, label: openDoc.title } : { kind: "page", label: "Knowledge" });

  useEffect(() => {
    if (focus) searchRef.current?.focus();
  }, [focus]);

  const results = filterDocuments(s, { query, category, tag, related });
  const counts = categoryCounts(s, { query, tag, related });
  const tags = popularTags(s, 12);
  const filtered = Boolean(query.trim() || tag || related || category !== "all");

  const show = (id: string) => router.push(`/knowledge?doc=${id}`, { scroll: false });
  const close = () => router.push("/knowledge", { scroll: false });
  const reset = () => {
    setQuery("");
    setCategory("all");
    setTag(null);
    setRelated(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge"
        icon={BookOpen}
        description="Guidelines, procedures, reports and handbooks in one place. You only see the content you're allowed to read."
      />

      <AskBox
        title="Ask the knowledge base"
        description="The assistant searches the documents you can read and links its sources."
        placeholder="e.g. How do I borrow a VR headset?"
        suggestions={["Where can I find the Development Guidelines?", "How do I borrow a VR headset?", "What should I know before starting?"]}
      />

      <div className="grid gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
        <nav aria-label="Document categories" className="min-w-0">
          <p className="mb-2 hidden px-2.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase lg:block">Categories</p>
          <ul className="scrollbar-thin -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
            {(["all", ...CATEGORIES] as const).map((c) => {
              const Icon = c === "all" ? Layers : categoryIcon[c];
              const active = category === c;
              return (
                <li key={c} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategory(c)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm whitespace-nowrap transition focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none lg:border-transparent",
                      active ? "border-primary/30 bg-accent font-medium text-accent-foreground" : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground lg:bg-transparent",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="flex-1 text-left">{c === "all" ? "All documents" : c}</span>
                    <span className="ml-2 text-xs tabular opacity-70">{counts[c]}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section aria-label="Documents" className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Label htmlFor="doc-search" className="sr-only">
                Search documents
              </Label>
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                ref={searchRef}
                id="doc-search"
                data-testid="doc-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search titles, tags and content…"
                className="h-9 bg-card pl-8"
                autoComplete="off"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="doc-related" checked={related} onCheckedChange={setRelated} />
              <Label htmlFor="doc-related" className="text-sm font-normal whitespace-nowrap">
                Related to my projects
              </Label>
            </div>
          </div>

          <ChipRow label="Filter by tag">
            {tags.map((t) => (
              <FilterChip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
                #{t}
              </FilterChip>
            ))}
          </ChipRow>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {results.length} {results.length === 1 ? "document" : "documents"}
              {category !== "all" && ` in ${category}`}
              {tag && ` tagged #${tag}`}
            </p>
            {filtered && (
              <Button variant="ghost" size="xs" onClick={reset}>
                Clear filters
              </Button>
            )}
          </div>

          {results.length === 0 ? (
            <EmptyState
              icon={FileSearch}
              title="No documents found"
              description="Try fewer words, another category, or ask the knowledge base above."
              action={
                <Button variant="outline" size="sm" onClick={reset}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {results.map((r) => (
                <DocCard key={r.doc.id} s={s} result={r} onOpen={() => show(r.doc.id)} />
              ))}
            </div>
          )}
        </section>
      </div>

      <p className="border-t pt-4 text-xs text-muted-foreground">
        Placeholder documents written for this demo. In production, content would come from SharePoint/Microsoft Graph with the user&apos;s own permissions.
      </p>

      <Sheet open={Boolean(openDoc)} onOpenChange={(o) => !o && close()}>
        <SheetContent side="right" className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
          {openDoc && (
            <DocPreview
              s={s}
              doc={openDoc}
              onAsk={() => {
                close();
                askAssistant(`Where can I find ${openDoc.title}?`);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
