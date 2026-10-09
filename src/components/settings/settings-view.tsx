"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { AlertTriangle, Bot, Check, ChevronDown, Database, Download, Loader2, Monitor, Moon, Palette, RotateCcw, Server, Settings, Sun, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchLlmStatus, type LlmStatus } from "@/lib/ai/assistant/provider";
import { SUPPORTED_INTENTS } from "@/lib/ai/assistant/engine";
import { DEMO_USER_IDS, employees } from "@/lib/data/people";
import { me } from "@/lib/selectors";
import { formatDate, toISODate } from "@/lib/time";
import type { PersonaKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";
import { Pill } from "@/components/common/badges";
import { usePageContext, useS } from "@/components/common/hooks";
import { AiBadge, PageHeader, Panel } from "@/components/common/layout";
import { PersonAvatar } from "@/components/common/person-avatar";
import { exportMyData } from "./export";

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "appearance", label: "Appearance" },
  { id: "demo-user", label: "Demo user" },
  { id: "assistant", label: "Assistant" },
  { id: "privacy", label: "Data & privacy" },
  { id: "reset", label: "Reset demo" },
];

const personaInfo: Record<PersonaKind, { label: string; blurb: string }> = {
  intern: { label: "Intern", blurb: "Development projects, learning and the internship logbook." },
  developer: { label: "Developer", blurb: "Repositories, code reviews and issues." },
  lead: { label: "Team lead", blurb: "Team workload, timesheets and access approvals." },
  pm: { label: "Project manager", blurb: "Portfolio, risks, decisions and access approvals." },
};

/** Radio option styled as a card. A native radio keeps arrow-key navigation and screen-reader semantics. */
function OptionCard({ name, value, checked, disabled, onChange, children, testId }: { name: string; value: string; checked: boolean; disabled?: boolean; onChange: () => void; children: React.ReactNode; testId?: string }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition hover:bg-muted/60",
        "has-checked:border-primary/40 has-checked:bg-accent has-checked:hover:bg-accent has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
        "has-disabled:cursor-not-allowed has-disabled:opacity-60 has-disabled:hover:bg-transparent",
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} disabled={disabled} onChange={onChange} className="mt-0.5 size-4 shrink-0 accent-primary" data-testid={testId} />
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}

function ProfileSection() {
  const s = useS();
  const user = me(s);
  const persona = user.persona ? personaInfo[user.persona] : undefined;
  return (
    <Panel id="profile" title="Profile" icon={UserRound} className="scroll-mt-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <PersonAvatar person={user} size="xl" showStatus className="self-start sm:self-center" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-base font-semibold">
            {user.name}
            {persona && <Pill tone="primary">Demo persona: {persona.label}</Pill>}
          </p>
          <p className="text-sm text-foreground/80">{user.role}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {user.department} · {user.location} · {user.email} (fictional)
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href={`/people?person=${user.id}`}>
            <Users /> View in People
          </Link>
        </Button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Profiles are fictional and read-only in this demo. In production they would come from Microsoft Entra ID and the HR system.</p>
    </Panel>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const current = theme ?? "system";
  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;
  return (
    <Panel id="appearance" title="Appearance" icon={Palette} className="scroll-mt-20">
      <fieldset>
        <legend className="mb-3 text-sm text-muted-foreground">Theme for this browser.</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {options.map((o) => (
            <OptionCard key={o.value} name="theme" value={o.value} checked={current === o.value} onChange={() => setTheme(o.value)} testId={`theme-${o.value}`}>
              <span className="flex items-center gap-2 text-sm font-medium">
                <o.icon className="size-4 text-muted-foreground" aria-hidden /> {o.label}
              </span>
              {o.value === "system" && <span className="mt-0.5 block text-xs text-muted-foreground">Follows your device setting</span>}
            </OptionCard>
          ))}
        </div>
      </fieldset>
    </Panel>
  );
}

function DemoUserSection() {
  const s = useS();
  const switchUser = useWorkspace((x) => x.switchUser);
  return (
    <Panel id="demo-user" title="Demo user" icon={Users} className="scroll-mt-20" description="Switch persona to see how TBI ONE adapts">
      <p className="text-sm text-muted-foreground">
        The switcher in the top bar (your avatar) changes who you are in the demo. Each persona has its own dashboard, tasks, inbox and permissions. This is not real sign-in: in production, identity comes from Microsoft Entra ID.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {DEMO_USER_IDS.map((id) => {
          const e = employees.find((x) => x.id === id)!;
          const info = e.persona ? personaInfo[e.persona] : undefined;
          const current = id === s.currentUserId;
          return (
            <li key={id} className={cn("flex items-start gap-3 rounded-lg border p-3", current && "border-primary/40 bg-accent")}>
              <PersonAvatar person={e} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{e.name}</p>
                <p className="text-xs text-muted-foreground">{e.role}</p>
                {info && <p className="mt-1 text-xs text-muted-foreground">{info.blurb}</p>}
              </div>
              {current ? (
                <Pill tone="primary" icon={Check}>
                  Current
                </Pill>
              ) : (
                <Button
                  size="xs"
                  variant="outline"
                  aria-label={`Switch to ${e.name}`}
                  data-testid={`settings-switch-${id}`}
                  onClick={() => {
                    switchUser(id);
                    toast(`Now viewing as ${e.name}`, { description: e.role });
                  }}
                >
                  Switch
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function AssistantSection() {
  const assistantMode = useWorkspace((x) => x.assistantMode);
  const setAssistantMode = useWorkspace((x) => x.setAssistantMode);
  const [status, setStatus] = useState<LlmStatus | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchLlmStatus().then((st) => {
      if (alive) setStatus(st);
    });
    return () => {
      alive = false;
    };
  }, []);

  const choose = (mode: "demo" | "llm") => {
    setAssistantMode(mode);
    toast.success(mode === "demo" ? "Assistant uses the demo engine" : "Assistant uses the language model", { description: mode === "demo" ? "Runs locally, no network." : "Answers are still grounded in your permitted workspace data." });
  };

  return (
    <Panel id="assistant" title="Assistant" icon={Bot} className="scroll-mt-20" action={<AiBadge engine={assistantMode === "llm" && status?.enabled ? "llm" : "demo"} />}>
      <p className="flex items-center gap-2 text-sm" aria-live="polite">
        <Server className="size-4 text-muted-foreground" aria-hidden />
        {status === null ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden /> Checking the server…
          </span>
        ) : status.enabled ? (
          <span>
            Language model available: <span className="font-medium">{status.provider}</span>
            {status.model && <span className="text-muted-foreground"> · {status.model}</span>}
          </span>
        ) : (
          <span className="text-muted-foreground">No language model is configured on the server.</span>
        )}
      </p>

      <fieldset className="mt-4">
        <legend className="mb-2 text-xs font-medium text-muted-foreground">Assistant mode</legend>
        <div className="grid gap-2 md:grid-cols-2">
          <OptionCard name="assistant-mode" value="demo" checked={assistantMode === "demo"} onChange={() => choose("demo")} testId="mode-demo">
            <span className="block text-sm font-medium">Demo engine (default, offline)</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">Deterministic answers from workspace data. Runs in your browser, no API key, no network.</span>
          </OptionCard>
          <OptionCard name="assistant-mode" value="llm" checked={assistantMode === "llm"} disabled={!status?.enabled} onChange={() => choose("llm")} testId="mode-llm">
            <span className="block text-sm font-medium">Language model (server-side)</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {status?.enabled ? "The model rephrases the demo engine's grounded answer. It never sees raw workspace data." : "Unavailable until the server is configured (see below)."}
            </span>
          </OptionCard>
        </div>
      </fieldset>

      {assistantMode === "llm" && status && !status.enabled && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
          Language model mode is selected but not configured, so answers come from the demo engine.
          <Button size="xs" variant="outline" onClick={() => choose("demo")}>
            Use demo engine
          </Button>
        </div>
      )}

      <details className="group mt-4 rounded-lg border">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
          How to enable the language model
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-3 border-t px-3 py-3 text-xs leading-relaxed text-muted-foreground">
          <p>
            Add these variables to <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">.env.local</code> in the project root (never commit that file), then restart the dev server.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-[11px] leading-relaxed text-foreground">
            {`ASSISTANT_PROVIDER=anthropic
ANTHROPIC_API_KEY=<your API key>
# optional: choose the model
ASSISTANT_MODEL=<model id>`}
          </pre>
          <p>The key stays on the server. The model only receives the demo engine&apos;s grounded, permission-filtered answer and source titles, and it never performs actions: you still confirm every proposed task, issue or draft.</p>
        </div>
      </details>

      <div className="mt-4">
        <p className="text-xs font-medium text-muted-foreground">What the demo engine understands ({SUPPORTED_INTENTS.length} intents)</p>
        <ul className="mt-2 flex flex-wrap gap-1.5" data-testid="supported-intents">
          {SUPPORTED_INTENTS.map((i) => (
            <li key={i} className="rounded-md bg-ai-soft px-1.5 py-0.5 font-mono text-[11px] text-ai">
              {i}
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

function PrivacySection() {
  const s = useS();
  const user = me(s);

  function download() {
    const data = exportMyData(useWorkspace.getState(), new Date());
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const filename = `tbi-one-demo-${user.firstName.toLowerCase()}-${toISODate()}.json`;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    toast.success("Export ready", { description: filename });
  }

  return (
    <Panel id="privacy" title="Data & privacy" icon={Database} className="scroll-mt-20">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border p-3">
          <dt className="text-xs font-medium text-muted-foreground">Where your data lives</dt>
          <dd className="mt-1">
            Only in this browser&apos;s localStorage, under <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">tbi-one-demo</code>. No account, no server database.
          </dd>
        </div>
        <div className="rounded-lg border p-3">
          <dt className="text-xs font-medium text-muted-foreground">What leaves the browser</dt>
          <dd className="mt-1">Nothing in demo mode. With the optional language model on, only the assistant&apos;s grounded answer text goes to this app&apos;s own server.</dd>
        </div>
        <div className="rounded-lg border p-3">
          <dt className="text-xs font-medium text-muted-foreground">Demo data seeded on</dt>
          <dd className="mt-1">
            <time dateTime={s.seededAt}>{formatDate(s.seededAt, "EEEE d MMMM yyyy, HH:mm")}</time>
            <span className="block text-xs text-muted-foreground">Dates in the demo are relative to this moment (Europe/Amsterdam).</span>
          </dd>
        </div>
        <div className="rounded-lg border p-3">
          <dt className="text-xs font-medium text-muted-foreground">Who sees what</dt>
          <dd className="mt-1">Each persona sees only their own messages, hours, logbook and assistant conversation. Managers included.</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button variant="outline" size="sm" className="w-fit" onClick={download} data-testid="export-data">
          <Download /> Export my demo data (JSON)
        </Button>
        <p className="text-xs text-muted-foreground">Contains {user.firstName}&apos;s own records only, not the other personas&apos; data.</p>
      </div>
    </Panel>
  );
}

function ResetSection() {
  const router = useRouter();
  const resetDemo = useWorkspace((x) => x.resetDemo);
  const [open, setOpen] = useState(false);

  function reset() {
    resetDemo();
    setOpen(false);
    toast.success("Demo data reset", { description: "All fictional data is back to its starting point for this week." });
    router.push("/");
  }

  return (
    <Panel id="reset" title="Reset demo data" icon={RotateCcw} className="scroll-mt-20 border-danger/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Start fresh: restores the original fictional data for every persona and dates it to today. Tasks, replies, hours, logbook entries, requests and conversations you made are removed.</p>
        <Button variant="destructive" size="sm" className="w-fit shrink-0" onClick={() => setOpen(true)} data-testid="reset-demo">
          <RotateCcw /> Reset demo data
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset all demo data?</DialogTitle>
            <DialogDescription>
              Everything you changed in this browser is replaced by the original fictional data, for all four personas. The current demo user and assistant mode are kept. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={reset} data-testid="confirm-reset">
              <RotateCcw /> Reset demo data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

export function SettingsView() {
  usePageContext({ kind: "page", label: "Settings" });
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" icon={Settings} description="Your demo profile, appearance, the assistant and the data this demo keeps in your browser." />
      <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="hidden lg:block">
          <ul className="sticky top-20 space-y-0.5">
            {SECTIONS.map((sec) => (
              <li key={sec.id}>
                <a href={`#${sec.id}`} className="block rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground">
                  {sec.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 space-y-6">
          <ProfileSection />
          <AppearanceSection />
          <DemoUserSection />
          <AssistantSection />
          <PrivacySection />
          <ResetSection />
        </div>
      </div>
    </div>
  );
}
