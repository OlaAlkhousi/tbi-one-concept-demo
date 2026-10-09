"use client";

import { Suspense, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CircleDot, CircleX, Eye, FolderGit2, GitBranch, GitCommitHorizontal, GitPullRequest, LayoutDashboard, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageContext, useS } from "@/components/common/hooks";
import { PageHeader, StatCard } from "@/components/common/layout";
import { NewIssueDialog } from "@/components/github/new-issue-dialog";
import { IssueSheet } from "@/components/github/issue-sheet";
import { SimulatedBanner } from "@/components/github/shared";
import { CommitsTab, IssuesTab, OverviewTab, PullsTab, ReposTab } from "@/components/github/tabs";
import { me, visibleIssues, visiblePullRequests } from "@/lib/selectors";
import { useActiveTabInView } from "@/components/projects/use-active-tab-in-view";

const TABS = ["overview", "issues", "pulls", "repos", "commits"] as const;
type Tab = (typeof TABS)[number];

export default function GithubPage() {
  return (
    <Suspense fallback={null}>
      <GithubWorkspace />
    </Suspense>
  );
}

function GithubWorkspace() {
  const s = useS();
  const pathname = usePathname();
  const params = useSearchParams();
  const [newIssueOpen, setNewIssueOpen] = useState(false);
  usePageContext({ kind: "page", label: "GitHub" });

  const user = me(s);
  const raw = params.get("tab");
  const tab: Tab = TABS.includes(raw as Tab) ? (raw as Tab) : "overview";
  const tabScroller = useActiveTabInView<HTMLDivElement>(tab);

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    // Native history updates sync with useSearchParams without a router round trip.
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  };

  const issueHref = (issueId: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("issue", issueId);
    return `${pathname}?${next.toString()}`;
  };

  const prs = visiblePullRequests(s);
  const issues = visibleIssues(s);
  const assigned = issues.filter((i) => i.state === "open" && i.assigneeId === s.currentUserId).length;
  const reviews = prs.filter((p) => p.state === "open" && p.reviewerIds.includes(s.currentUserId)).length;
  const myOpen = prs.filter((p) => p.authorId === s.currentUserId && p.state !== "merged").length;
  const failing = prs.filter((p) => p.state !== "merged" && p.checks === "failing");
  const myFailing = failing.filter((p) => p.authorId === s.currentUserId).length;

  const stats = {
    assigned: <StatCard key="assigned" label="Assigned issues" value={assigned} hint="Open issues assigned to you" icon={CircleDot} href="/github?tab=issues&assignee=me" />,
    reviews: <StatCard key="reviews" label="Review requests" value={reviews} hint={reviews ? "Pull requests waiting for you" : "Nothing to review"} icon={Eye} href="/github?tab=pulls&filter=review" tone={reviews ? "warning" : "default"} />,
    mine: <StatCard key="mine" label="My open PRs" value={myOpen} hint="Open and draft" icon={GitPullRequest} href="/github?tab=pulls&filter=mine" />,
    failing: (
      <StatCard
        key="failing"
        label="Failing checks"
        value={failing.length}
        hint={failing.length ? (myFailing ? `${myFailing} on your pull requests` : "In repositories you can see") : "All checks green"}
        icon={CircleX}
        href="/github?tab=pulls&filter=failing"
        tone={failing.length ? "danger" : "success"}
      />
    ),
  };
  const statOrder: (keyof typeof stats)[] = user.persona === "developer" ? ["reviews", "mine", "failing", "assigned"] : user.persona === "intern" ? ["assigned", "mine", "reviews", "failing"] : ["failing", "reviews", "mine", "assigned"];

  const description =
    user.persona === "developer"
      ? "Reviews waiting for you first, then your pull requests and assigned issues."
      : user.persona === "intern"
        ? "Your assigned issues and pull requests across the repositories you can see."
        : "Pull requests, checks and issues across your team's repositories.";

  return (
    <div className="space-y-6">
      <PageHeader
        title="GitHub"
        icon={GitBranch}
        description={description}
        actions={
          <Button onClick={() => setNewIssueOpen(true)} data-testid="new-issue">
            <Plus /> New issue
          </Button>
        }
      />

      <SimulatedBanner />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="GitHub key figures">
        {statOrder.map((k) => stats[k])}
      </section>

      <Tabs value={tab} onValueChange={(v) => window.history.replaceState(null, "", v === "overview" ? pathname : `${pathname}?tab=${v}`)} className="gap-4">
        <div ref={tabScroller} className="-mx-4 overflow-x-auto px-4 scrollbar-thin sm:mx-0 sm:px-0">
          <TabsList className="w-max">
            <TabsTrigger value="overview">
              <LayoutDashboard /> Overview
            </TabsTrigger>
            <TabsTrigger value="issues">
              <CircleDot /> Issues
            </TabsTrigger>
            <TabsTrigger value="pulls">
              <GitPullRequest /> Pull requests
            </TabsTrigger>
            <TabsTrigger value="repos">
              <FolderGit2 /> Repositories
            </TabsTrigger>
            <TabsTrigger value="commits">
              <GitCommitHorizontal /> Commits
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="overview">
          <OverviewTab s={s} issueHref={issueHref} />
        </TabsContent>
        <TabsContent value="issues">
          <IssuesTab s={s} params={params} setParams={setParams} issueHref={issueHref} />
        </TabsContent>
        <TabsContent value="pulls">
          <PullsTab s={s} params={params} setParams={setParams} />
        </TabsContent>
        <TabsContent value="repos">
          <ReposTab s={s} />
        </TabsContent>
        <TabsContent value="commits">
          <CommitsTab s={s} params={params} setParams={setParams} />
        </TabsContent>
      </Tabs>

      <NewIssueDialog open={newIssueOpen} onOpenChange={setNewIssueOpen} />
      <IssueSheet s={s} issueId={params.get("issue")} onClose={() => setParams({ issue: null })} />
    </div>
  );
}
