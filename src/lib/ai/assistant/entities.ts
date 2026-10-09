import { documents } from "../../data/catalog";
import { employees } from "../../data/people";
import type { S } from "../../selectors";
import { addDaysISO, toISODate } from "../../time";
import type { Employee, ISODate, Project } from "../../types";

/** Entity detection for the demo assistant: which project, person, skill or day is meant. */

export function detectProject(s: S, text: string): Project | undefined {
  const t = ` ${text.toLowerCase()} `;
  let best: { p: Project; len: number } | undefined;
  for (const p of s.projects) {
    for (const term of [p.name.toLowerCase(), p.code.toLowerCase(), ...p.aliases]) {
      const re = new RegExp(`[^a-z]${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^a-z]`);
      if (re.test(t) && (!best || term.length > best.len)) best = { p, len: term.length };
    }
  }
  return best?.p;
}

export function detectPerson(text: string, excludeId?: string): Employee | undefined {
  const t = text.toLowerCase();
  return employees.find((e) => e.id !== excludeId && (t.includes(e.name.toLowerCase()) || new RegExp(`\\b${e.firstName.toLowerCase()}\\b`).test(t)));
}

/** Synonyms that map everyday words to skills in the directory. */
const SKILL_SYNONYMS: Record<string, string[]> = {
  azure: ["Microsoft Azure", "Azure Functions", "Azure IoT Hub", "Azure", "Bicep"],
  cloud: ["Microsoft Azure", "Azure Functions", "Bicep"],
  github: ["GitHub Actions", "Git", "Code review", "CI/CD"],
  git: ["Git", "GitHub Actions", "Code review"],
  "ci/cd": ["CI/CD", "GitHub Actions"],
  pipeline: ["CI/CD", "GitHub Actions"],
  deploy: ["CI/CD", "GitHub Actions", "Terraform"],
  equipment: ["Equipment management", "VR hardware"],
  vr: ["VR hardware", "Equipment management"],
  headset: ["VR hardware"],
  security: ["Cybersecurity", "Access governance", "Security awareness"],
  access: ["Access governance", "Entra ID"],
  "entra": ["Entra ID"],
  login: ["Entra ID"],
  authentication: ["Entra ID"],
  ux: ["UX design", "Figma", "User research"],
  design: ["UX design", "Figma", "Design systems"],
  accessibility: ["Accessibility"],
  data: ["Power BI", "SQL", "Data modelling"],
  "power bi": ["Power BI"],
  sql: ["SQL", "PostgreSQL"],
  database: ["PostgreSQL", "SQL"],
  typescript: ["TypeScript"],
  "next.js": ["Next.js"],
  nextjs: ["Next.js"],
  react: ["React"],
  testing: ["Testing"],
  tests: ["Testing"],
  iot: ["IoT", "Azure IoT Hub"],
  sensor: ["IoT", "Azure IoT Hub"],
  automation: ["Power Automate", "Logic Apps", "Approval workflows"],
  "power automate": ["Power Automate"],
  approval: ["Approval workflows"],
  internship: ["Internships"],
  learning: ["Learning design", "Career development"],
  sustainability: ["Sustainability reporting"],
  architecture: ["Architecture"],
  ai: ["AI-assisted development"],
};

export function detectSkill(text: string): { term: string; skills: string[] } | undefined {
  const t = text.toLowerCase();
  const keys = Object.keys(SKILL_SYNONYMS).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (new RegExp(`(^|[^a-z])${k.replace(/[./]/g, (c) => `\\${c}`)}([^a-z]|$)`).test(t)) return { term: k, skills: SKILL_SYNONYMS[k] };
  }
  // Fall back to any skill named literally in the question.
  for (const e of employees) for (const sk of e.skills) if (t.includes(sk.toLowerCase())) return { term: sk, skills: [sk] };
  return undefined;
}

export function detectDay(text: string, now = new Date()): { date: ISODate; label: string } | undefined {
  const t = text.toLowerCase();
  const today = toISODate(now);
  if (/\btomorrow\b/.test(t)) return { date: addDaysISO(today, 1), label: "tomorrow" };
  if (/\byesterday\b/.test(t)) return { date: addDaysISO(today, -1), label: "yesterday" };
  if (/\btoday\b/.test(t)) return { date: today, label: "today" };
  return undefined;
}

export function detectDocumentHint(text: string) {
  const t = text.toLowerCase();
  return documents.filter((d) => d.tags.some((tag) => t.includes(tag)) || t.includes(d.title.toLowerCase()));
}
