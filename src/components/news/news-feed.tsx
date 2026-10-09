"use client";

import { useState } from "react";
import { Bookmark, FlaskConical, Newspaper, SlidersHorizontal } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { me } from "@/lib/selectors";
import type { NewsCategory, NewsItem } from "@/lib/types";
import { usePageContext, useS } from "@/components/common/hooks";
import { EmptyState, PageHeader } from "@/components/common/layout";
import { ChipRow, FilterChip } from "@/components/knowledge/filter-chip";
import { allNews, CATEGORY_LABEL, forYou, personaNoun } from "./feed";
import { NewsCard } from "./news-card";

type View = "for-you" | "all" | "bookmarked";
const CATEGORIES = Object.keys(CATEGORY_LABEL) as NewsCategory[];

export function NewsFeed() {
  const s = useS();
  const user = me(s);
  usePageContext({ kind: "page", label: "News" });
  const [view, setView] = useState<View>("for-you");
  const [category, setCategory] = useState<NewsCategory | "all">("all");

  const bookmarks = s.bookmarks[s.currentUserId] ?? [];
  const all = allNews(s);
  const lists: Record<View, NewsItem[]> = {
    "for-you": forYou(s),
    all,
    bookmarked: all.filter((n) => bookmarks.includes(n.id)),
  };
  const base = lists[view];
  const items = category === "all" ? base : base.filter((n) => n.category === category);
  const saved = lists.bookmarked;

  return (
    <div className="space-y-6">
      <PageHeader title="News" icon={Newspaper} description={`Announcements, project updates, learning and events, ordered for you as ${user.persona ? personaNoun[user.persona][0] : "employee"}.`} />

      <p role="note" data-testid="news-fictional-label" className="flex items-center gap-2 rounded-lg border border-dashed border-warning/50 bg-warning-soft px-3 py-2 text-sm font-medium text-warning">
        <FlaskConical className="size-4 shrink-0" aria-hidden />
        Fictional demo news — not real announcements
      </p>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Tabs value={view} onValueChange={(v) => setView(v as View)} className="min-w-0 gap-4">
          <div className="flex flex-col gap-3">
            <TabsList className="w-full sm:w-fit">
              <TabsTrigger value="for-you" className="px-3">
                For you
              </TabsTrigger>
              <TabsTrigger value="all" className="px-3">
                All news
              </TabsTrigger>
              <TabsTrigger value="bookmarked" className="px-3">
                Bookmarked
                {saved.length > 0 && <span className="ml-1 text-[10px] tabular opacity-70">{saved.length}</span>}
              </TabsTrigger>
            </TabsList>
            <ChipRow label="Filter by category">
              <FilterChip active={category === "all"} onClick={() => setCategory("all")} count={base.length}>
                All categories
              </FilterChip>
              {CATEGORIES.map((c) => (
                <FilterChip key={c} active={category === c} onClick={() => setCategory(category === c ? "all" : c)} count={base.filter((n) => n.category === c).length}>
                  {CATEGORY_LABEL[c]}
                </FilterChip>
              ))}
            </ChipRow>
          </div>

          {(["for-you", "all", "bookmarked"] as const).map((v) => (
            <TabsContent key={v} value={v} className="space-y-3">
              {items.length === 0 ? (
                <EmptyState
                  icon={v === "bookmarked" ? Bookmark : Newspaper}
                  title={v === "bookmarked" ? "No bookmarks here" : "No news in this category"}
                  description={v === "bookmarked" ? "Use the bookmark button on a news item to save it for later." : "Try another category or look at all news."}
                />
              ) : (
                items.map((n) => <NewsCard key={n.id} s={s} item={n} />)
              )}
            </TabsContent>
          ))}
        </Tabs>

        <aside className="space-y-4">
          <section className="rounded-xl border bg-card p-4 shadow-card" aria-labelledby="news-saved">
            <h2 id="news-saved" className="flex items-center gap-2 text-sm font-semibold">
              <Bookmark className="size-4 text-muted-foreground" aria-hidden /> Saved for later
            </h2>
            {saved.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nothing saved yet.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {saved.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setView("bookmarked");
                        setCategory("all");
                      }}
                      className="w-full truncate rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-muted"
                    >
                      {n.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border bg-card p-4 shadow-card" aria-labelledby="news-how">
            <h2 id="news-how" className="flex items-center gap-2 text-sm font-semibold">
              <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden /> How &ldquo;For you&rdquo; works
            </h2>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
              <li>News about projects you work on comes first.</li>
              <li>Then news meant for your role{user.persona ? ` (${personaNoun[user.persona][1]})` : ""}, then company-wide news.</li>
              <li>News meant only for other roles stays under All news.</li>
              <li>Every item says why you see it. Simple rules, no tracking.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
