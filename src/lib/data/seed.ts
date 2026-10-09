import { addDaysISO, formatDate, mondayOf, toISODate, zonedISO } from "../time";
import type {
  AccessGrant,
  AccessRequest,
  Activity,
  Commit,
  DashboardLayout,
  GithubIssue,
  HoursEntry,
  ISODate,
  LearningProfile,
  LogbookEntry,
  Meeting,
  Message,
  NewsItem,
  Notification,
  Project,
  PullRequest,
  Task,
  WidgetId,
} from "../types";
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "../time";

export interface SeedData {
  seededAt: string;
  projects: Project[];
  tasks: Task[];
  meetings: Meeting[];
  messages: Message[];
  issues: GithubIssue[];
  pullRequests: PullRequest[];
  commits: Commit[];
  learning: LearningProfile[];
  logbook: LogbookEntry[];
  hours: HoursEntry[];
  accessRequests: AccessRequest[];
  accessGrants: AccessGrant[];
  news: NewsItem[];
  notifications: Notification[];
  activity: Activity[];
  bookmarks: Record<string, string[]>;
  layouts: Record<string, DashboardLayout>;
}

export const defaultLayouts: Record<string, WidgetId[]> = {
  "u-ola": ["briefing", "priorities", "meetings", "messages", "hours", "learning", "projects", "github", "activity"],
  "u-daan": ["briefing", "priorities", "github", "meetings", "messages", "projects", "hours", "activity"],
  "u-sanne": ["briefing", "approvals", "team", "projects", "meetings", "messages", "hours", "activity"],
  "u-marco": ["briefing", "projects", "approvals", "priorities", "meetings", "messages", "activity"],
};

function isWeekend(date: ISODate): boolean {
  const dow = Number(formatInTimeZone(new Date(`${date}T12:00:00Z`), TZ, "i"));
  return dow >= 6;
}

/**
 * Builds the complete fictional workspace relative to `now`, so the demo always
 * looks current: "yesterday's meeting" really was yesterday (the previous working day).
 */
export function createSeed(now: Date = new Date()): SeedData {
  const today = toISODate(now);

  /** Date `n` working days from today (negative = in the past). */
  const wd = (n: number): ISODate => {
    let d = today;
    let left = Math.abs(n);
    const step = n < 0 ? -1 : 1;
    while (left > 0) {
      d = addDaysISO(d, step);
      if (!isWeekend(d)) left--;
    }
    return d;
  };
  const at = (n: number, time: string) => zonedISO(wd(n), time);
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60000).toISOString();

  // ─── Projects ──────────────────────────────────────────────────────────────
  const projects: Project[] = [
    {
      id: "p-portal",
      name: "Innovation Projects Portal",
      code: "INP",
      description: "One place for every innovation idea: from intake form to project board and status reporting for management.",
      ownerId: "u-lisa",
      teamIds: ["u-lisa", "u-ola", "u-daan", "u-emma"],
      status: "on-track",
      priority: "high",
      progress: 0,
      technologies: ["Next.js", "TypeScript", "Azure Static Web Apps", "Entra ID", "GitHub Actions"],
      objectives: [
        "Give every innovation idea one place from intake to result",
        "Make project status visible to management without manual reporting",
        "Let project members sign in with their work account",
      ],
      features: ["Project intake form", "Project board", "Project detail pages"],
      milestones: [
        { id: "ms-p1", title: "Intake form live", due: wd(-8), done: true },
        { id: "ms-p2", title: "Project board", due: wd(-2), done: true },
        { id: "ms-p3", title: "Status overview for management", due: wd(8), done: false },
        { id: "ms-p4", title: "Sign-in with work account", due: wd(18), done: false },
      ],
      risks: [
        { id: "rk-p1", title: "App registration for sign-in needs a change request", severity: "medium", mitigation: "Priya prepares the request; Sanne submits it." },
      ],
      decisions: [
        { id: "dc-p1", title: "Store project data as Markdown in Git", rationale: "Keeps history and review in GitHub without a database for the pilot.", date: wd(-15), status: "decided" },
        { id: "dc-p2", title: "Status overview shows only aggregated data", rationale: "Management needs trends, not individual tasks.", date: wd(-3), status: "decided", meetingId: "m-portal-planning" },
      ],
      start: wd(-45),
      end: wd(40),
      visibility: "internal",
      approverId: "u-sanne",
      repoIds: ["r-portal"],
      aliases: ["portal", "innovation portal", "intake", "innovatie"],
      hue: 262,
    },
    {
      id: "p-vr",
      name: "VR Equipment Lending Service",
      code: "VRL",
      description: "Lets employees reserve VR headsets and demo equipment without email back-and-forth, and gives Facility Services a live overview.",
      ownerId: "u-marco",
      teamIds: ["u-marco", "u-ola", "u-daan", "u-emma", "u-lucas"],
      status: "at-risk",
      priority: "high",
      progress: 0,
      technologies: ["Next.js", "TypeScript", "Azure Functions", "PostgreSQL", "Microsoft Graph"],
      objectives: [
        "Reserve equipment in under a minute without emailing the lending desk",
        "Prevent double bookings and reservations of equipment in maintenance",
        "Confirm every reservation so employees know it is booked",
        "Require approval for long or expensive loans",
      ],
      features: ["Equipment catalogue", "Catalogue filters", "Reservation calendar"],
      milestones: [
        { id: "ms-v1", title: "Equipment catalogue", due: wd(-10), done: true },
        { id: "ms-v2", title: "Reservation calendar", due: wd(-1), done: true },
        { id: "ms-v3", title: "Prototype review", due: wd(2), done: false },
        { id: "ms-v4", title: "Pilot with Facility Services", due: wd(15), done: false },
      ],
      risks: [
        { id: "rk-v1", title: "Availability check ignores maintenance periods", severity: "high", mitigation: "Read the maintenance schedule before confirming a reservation.", isBlocker: true },
        { id: "rk-v2", title: "Users re-book because they receive no confirmation", severity: "medium" },
        { id: "rk-v3", title: "Facility Services capacity during pilot", severity: "low", mitigation: "Lucas plans two pilot weeks." },
      ],
      decisions: [
        { id: "dc-v1", title: "Model equipment as bookable calendar resources", rationale: "Reuses Microsoft Graph calendars instead of building our own scheduling.", date: wd(-12), status: "decided" },
        { id: "dc-v2", title: "Approval required for loans longer than 3 working days", rationale: "Matches the Equipment Lending Procedure.", date: wd(-1), status: "decided", meetingId: "m-vr-discussion" },
        { id: "dc-v3", title: "Who approves loans when the manager is absent?", rationale: "Needs input from Facility Services and HR.", date: wd(-1), status: "open", meetingId: "m-vr-discussion" },
      ],
      start: wd(-30),
      end: wd(30),
      visibility: "internal",
      approverId: "u-marco",
      repoIds: ["r-vr"],
      aliases: ["vr", "lending", "equipment", "headset", "reservation", "vr lending"],
      hue: 199,
    },
    {
      id: "p-smart",
      name: "Smart Building Platform",
      code: "SBP",
      description: "Connects building sensors to a digital twin for comfort, energy and alarm monitoring at client sites.",
      ownerId: "u-thomas",
      teamIds: ["u-thomas", "u-priya", "u-bram", "u-daan"],
      status: "on-track",
      priority: "urgent",
      progress: 0,
      technologies: ["Azure IoT Hub", "Python", "TypeScript", "Azure Functions", "Power BI"],
      objectives: ["Monitor comfort and energy per floor", "Route critical alarms within 60 seconds", "Reuse one sensor standard across sites"],
      features: ["Sensor ingestion", "Digital twin model", "Alarm routing"],
      milestones: [
        { id: "ms-s1", title: "Sensor ingestion pilot site", due: wd(-20), done: true },
        { id: "ms-s2", title: "Alarm routing", due: wd(6), done: false },
      ],
      risks: [{ id: "rk-s1", title: "Gateway firmware differs per site", severity: "medium" }],
      decisions: [{ id: "dc-s1", title: "One gateway image for all sites", rationale: "Simplifies patching.", date: wd(-9), status: "decided" }],
      start: wd(-80),
      end: wd(60),
      visibility: "restricted",
      approverId: "u-sanne",
      repoIds: ["r-smart"],
      aliases: ["smart building", "iot", "sensor", "digital twin", "building"],
      hue: 210,
    },
    {
      id: "p-ux",
      name: "Real Estate Usability Improvements",
      code: "REU",
      description: "Improves the usability and accessibility of the internal real estate applications, based on user research.",
      ownerId: "u-ruben",
      teamIds: ["u-ruben", "u-emma"],
      status: "planning",
      priority: "medium",
      progress: 0,
      technologies: ["React", "TypeScript", "Figma", "WCAG 2.2"],
      objectives: ["Make the top 5 real estate tasks faster", "Meet WCAG 2.2 AA on key screens"],
      features: ["Usability test round 1"],
      milestones: [
        { id: "ms-u1", title: "Usability test round 1", due: wd(4), done: false },
        { id: "ms-u2", title: "Design system focus styles", due: wd(14), done: false },
      ],
      risks: [],
      decisions: [],
      start: wd(-10),
      end: wd(50),
      visibility: "internal",
      approverId: "u-sanne",
      repoIds: ["r-ui"],
      aliases: ["real estate", "usability", "ux", "accessibility"],
      hue: 15,
    },
    {
      id: "p-sustain",
      name: "Sustainability Analytics Dashboard",
      code: "SAD",
      description: "Brings energy, materials and CO₂ data together in one dashboard for sustainability reporting.",
      ownerId: "u-femke",
      teamIds: ["u-femke", "u-bram"],
      status: "blocked",
      priority: "high",
      progress: 0,
      technologies: ["Power BI", "Python", "Azure Data Factory", "SQL"],
      objectives: ["Report CO₂ per project monthly", "Automate supplier data imports"],
      features: ["Energy dashboard", "Manual CSV import"],
      milestones: [
        { id: "ms-d1", title: "Energy dashboard", due: wd(-12), done: true },
        { id: "ms-d2", title: "Automated supplier import", due: wd(-1), done: false },
      ],
      risks: [{ id: "rk-d1", title: "Supplier data delivery delayed", severity: "high", isBlocker: true, mitigation: "Escalation meeting planned." }],
      decisions: [],
      start: wd(-60),
      end: wd(25),
      visibility: "internal",
      approverId: "u-sanne",
      repoIds: ["r-sustain"],
      aliases: ["sustainability", "co2", "energy", "dashboard"],
      hue: 170,
    },
    {
      id: "p-automation",
      name: "Internal Process Automation",
      code: "IPA",
      description: "Automates repetitive internal processes with a reusable approval workflow engine.",
      ownerId: "u-marco",
      teamIds: ["u-marco", "u-anouk", "u-bram"],
      status: "on-track",
      priority: "medium",
      progress: 0,
      technologies: ["Power Automate", "Logic Apps", "SharePoint", "TypeScript"],
      objectives: ["Replace email approvals with a reusable approval flow", "Automate facility ticket creation"],
      features: ["Approval workflow engine", "Approval connector for internal apps", "Facility ticket automation"],
      milestones: [
        { id: "ms-a1", title: "Approval workflow engine", due: wd(-2), done: true },
        { id: "ms-a2", title: "Connector for internal apps", due: wd(9), done: false },
      ],
      risks: [],
      decisions: [{ id: "dc-a1", title: "Expose approvals through one connector", rationale: "Other apps can reuse approvals instead of building their own.", date: wd(-2), status: "decided", meetingId: "m-automation-demo" }],
      start: wd(-50),
      end: wd(35),
      visibility: "internal",
      approverId: "u-marco",
      repoIds: ["r-automation"],
      aliases: ["automation", "process", "approval flow", "power automate", "workflow"],
      hue: 60,
    },
  ];

  // ─── Tasks ─────────────────────────────────────────────────────────────────
  const t = (
    id: string,
    title: string,
    projectId: string | undefined,
    assigneeId: string,
    status: Task["status"],
    priority: Task["priority"],
    dueIn: number | undefined,
    extra: Partial<Task> = {},
  ): Task => ({
    id,
    title,
    description: extra.description ?? "",
    projectId,
    assigneeId,
    creatorId: extra.creatorId ?? assigneeId,
    status,
    priority,
    due: dueIn === undefined ? undefined : wd(dueIn),
    createdAt: extra.createdAt ?? at(-6, "09:00"),
    completedAt: status === "done" ? (extra.completedAt ?? at(-2, "16:00")) : undefined,
    source: extra.source ?? { type: "manual" },
    githubIssueId: extra.githubIssueId,
    tags: extra.tags ?? [],
  });

  const tasks: Task[] = [
    // Ola
    t("t-ola-1", "Add validation to the intake form", "p-portal", "u-ola", "in-progress", "high", 1, {
      description: "Required fields, length limits and friendly error messages. Use Zod for the schema.",
      githubIssueId: "i-portal-15",
      creatorId: "u-lisa",
      tags: ["frontend", "forms"],
    }),
    t("t-ola-2", "Fix timezone display in reservation overview", "p-vr", "u-ola", "in-progress", "urgent", 0, {
      description: "Reservations are shown in UTC. Show Europe/Amsterdam time everywhere.",
      githubIssueId: "i-vr-38",
      creatorId: "u-daan",
      tags: ["bug"],
    }),
    t("t-ola-3", "Write unit tests for the project markdown generator", "p-portal", "u-ola", "todo", "medium", 3, { tags: ["testing"] }),
    t("t-ola-4", "Review Emma's reservation confirmation wireframes", "p-vr", "u-ola", "todo", "medium", 1, { creatorId: "u-emma", tags: ["review"] }),
    t("t-ola-5", "Complete the Security Awareness module", undefined, "u-ola", "todo", "high", -1, {
      description: "Mandatory for all new employees within the first month.",
      creatorId: "u-sanne",
      tags: ["learning", "mandatory"],
    }),
    t("t-ola-6", "Prepare mid-term internship reflection", undefined, "u-ola", "todo", "medium", 5, { creatorId: "u-noor", tags: ["internship"] }),
    t("t-ola-7", "Add equipment catalogue filters", "p-vr", "u-ola", "done", "medium", -3, { githubIssueId: "i-vr-36", completedAt: at(-3, "15:40"), tags: ["frontend"] }),
    t("t-ola-8", "Implement project board columns", "p-portal", "u-ola", "done", "high", -1, { completedAt: at(-1, "16:10"), tags: ["frontend"] }),
    t("t-ola-9", "Set up local environment for VR Lending", "p-vr", "u-ola", "done", "low", -6, { completedAt: at(-6, "11:00") }),
    // Daan
    t("t-daan-1", "Exclude maintenance periods from availability check", "p-vr", "u-daan", "in-progress", "urgent", 1, { githubIssueId: "i-vr-39", tags: ["backend", "blocker"] }),
    t("t-daan-2", "Review Ola's intake form pull request", "p-portal", "u-daan", "todo", "high", 0, { tags: ["review"] }),
    t("t-daan-3", "Status overview API for management", "p-portal", "u-daan", "todo", "medium", 6, { githubIssueId: "i-portal-16" }),
    t("t-daan-4", "Fix failing alarm routing test", "p-smart", "u-daan", "review", "high", 2),
    t("t-daan-5", "Upgrade Next.js in vr-lending", "p-vr", "u-daan", "done", "low", -2, { completedAt: at(-2, "10:30") }),
    // Sanne
    t("t-sanne-1", "Approve Q4 team capacity plan", undefined, "u-sanne", "todo", "high", 1),
    t("t-sanne-2", "Prepare internship check-in with Ola", undefined, "u-sanne", "todo", "medium", 0),
    t("t-sanne-3", "Submit change request for portal app registration", "p-portal", "u-sanne", "in-progress", "high", 2),
    // Marco
    t("t-marco-1", "Prepare steering committee status update", undefined, "u-marco", "in-progress", "urgent", 1),
    t("t-marco-2", "Decide who approves loans when a manager is absent", "p-vr", "u-marco", "todo", "high", 3),
    t("t-marco-3", "Stakeholder update for Facility Services", "p-vr", "u-marco", "todo", "medium", 2),
    t("t-marco-4", "Plan connector roll-out with Anouk", "p-automation", "u-marco", "done", "medium", -1, { completedAt: at(-1, "14:00") }),
    // Other colleagues (team overview, project progress)
    t("t-emma-1", "Reservation confirmation wireframes", "p-vr", "u-emma", "review", "high", 0),
    t("t-emma-2", "Usability test script for real estate", "p-ux", "u-emma", "in-progress", "medium", 3),
    t("t-emma-3", "Accessibility audit of key screens", "p-ux", "u-emma", "todo", "medium", 9),
    t("t-ruben-1", "Prioritise top 5 real estate tasks", "p-ux", "u-ruben", "done", "high", -4, { completedAt: at(-4, "12:00") }),
    t("t-lucas-1", "Share maintenance schedule as a calendar", "p-vr", "u-lucas", "todo", "high", 2),
    t("t-lucas-2", "Label all VR headsets with asset numbers", "p-vr", "u-lucas", "done", "low", -5, { completedAt: at(-5, "10:00") }),
    t("t-lisa-1", "Define status overview KPIs", "p-portal", "u-lisa", "done", "medium", -4, { completedAt: at(-4, "16:00") }),
    t("t-priya-1", "Gateway firmware inventory", "p-smart", "u-priya", "in-progress", "medium", 4),
    t("t-priya-2", "Prepare app registration request for portal sign-in", "p-portal", "u-priya", "todo", "high", 1),
    t("t-thomas-1", "Alarm routing design review", "p-smart", "u-thomas", "done", "high", -3, { completedAt: at(-3, "13:00") }),
    t("t-bram-1", "Automate supplier CSV import pipeline", "p-sustain", "u-bram", "todo", "high", -1),
    t("t-bram-2", "Deploy approval connector to test", "p-automation", "u-bram", "in-progress", "medium", 2),
    t("t-femke-1", "Escalate supplier data delay", "p-sustain", "u-femke", "in-progress", "urgent", 0),
    t("t-femke-2", "Energy dashboard", "p-sustain", "u-femke", "done", "high", -12, { completedAt: at(-12, "16:00") }),
    t("t-anouk-1", "Approval connector documentation", "p-automation", "u-anouk", "todo", "medium", 5),
    t("t-anouk-2", "Approval workflow engine", "p-automation", "u-anouk", "done", "high", -2, { completedAt: at(-2, "11:00") }),
  ];

  // ─── Meetings ──────────────────────────────────────────────────────────────
  const m = (
    id: string,
    title: string,
    day: number,
    start: string,
    end: string,
    organizerId: string,
    participantIds: string[],
    extra: Partial<Meeting> = {},
  ): Meeting => ({
    id,
    title,
    start: at(day, start),
    end: at(day, end),
    organizerId,
    participantIds,
    location: extra.location ?? "Microsoft Teams (simulated)",
    description: extra.description ?? "",
    agenda: extra.agenda ?? [],
    followUpTaskIds: [],
    ...extra,
  });

  const meetings: Meeting[] = [
    m("m-vr-discussion", "VR Equipment Lending — Project Discussion", -1, "14:00", "15:00", "u-marco", ["u-marco", "u-ola", "u-daan", "u-emma", "u-lucas"], {
      projectId: "p-vr",
      description: "Weekly project discussion: prototype status, availability problems and the approval flow.",
      agenda: ["Prototype status", "Availability problems reported by Facility Services", "Approval for long loans", "Next steps before prototype review"],
      notes: "Lucas reported two double bookings last week: both headsets were in maintenance. Emma showed wireframes for the confirmation screen.",
      summary:
        "The team reviewed the prototype. Facility Services reported reservations of headsets that were in maintenance, so the availability check needs improving before the pilot. Users also re-book because they don't get a confirmation. The team agreed that loans longer than 3 working days need approval, and that a working prototype should be ready for review on " +
        formatDate(wd(2), "EEEE d MMMM") +
        ".",
      keyPoints: [
        "Two double bookings last week were caused by headsets in maintenance.",
        "Users don't receive a confirmation and sometimes book twice.",
        "Approval is needed for loans longer than 3 working days.",
        "The prototype review is planned in two working days.",
      ],
      decisions: ["Loans longer than 3 working days require manager approval.", "The confirmation screen follows Emma's wireframe (version B)."],
      actionPoints: [
        { id: "ap-1", text: "Improve equipment availability checks so items in maintenance can't be reserved.", mentionedBy: "u-lucas", timestamp: "14:12" },
        { id: "ap-2", text: "Create a reservation confirmation flow with a confirmation screen and message.", mentionedBy: "u-emma", timestamp: "14:26" },
        { id: "ap-3", text: "Add an administrative approval feature for loans longer than 3 working days.", mentionedBy: "u-marco", timestamp: "14:38" },
        { id: "ap-4", text: "Prepare a working prototype for the review session.", mentionedBy: "u-marco", timestamp: "14:51" },
      ],
    }),
    m("m-standup", "Daily stand-up ICT Development", 0, "09:15", "09:30", "u-sanne", ["u-sanne", "u-ola", "u-daan", "u-emma", "u-bram"], {
      description: "What did you do, what will you do, what blocks you?",
    }),
    m("m-portal-review", "Innovation Portal — Sprint Review", 0, "11:00", "12:00", "u-lisa", ["u-lisa", "u-ola", "u-daan", "u-emma", "u-sanne"], {
      projectId: "p-portal",
      description: "Demo of the project board and the intake form validation.",
      agenda: ["Demo project board", "Intake form validation", "Status overview KPIs", "Next sprint"],
    }),
    m("m-smart-sync", "Smart Building — Sensor Data Sync", 0, "13:00", "14:00", "u-thomas", ["u-thomas", "u-priya", "u-bram", "u-daan", "u-sanne"], {
      projectId: "p-smart",
      description: "Alarm routing status and gateway firmware.",
      agenda: ["Alarm routing", "Firmware inventory"],
    }),
    m("m-mentor", "Internship check-in", 0, "15:30", "16:00", "u-sanne", ["u-sanne", "u-ola"], {
      location: "Room 3.12, Rotterdam",
      description: "Weekly check-in: progress, logbook, learning goals.",
      agenda: ["Logbook of last week", "Learning goals", "Questions"],
    }),
    m("m-steering", "Innovation Portfolio Steering", 1, "10:00", "11:30", "u-lisa", ["u-lisa", "u-marco", "u-sanne", "u-thomas", "u-femke"], {
      description: "Quarterly portfolio decisions.",
      agenda: ["Portfolio status", "Sustainability blocker", "Q4 budget"],
    }),
    m("m-azure", "Azure Lunch & Learn: Functions in practice", 1, "12:30", "13:15", "u-priya", ["u-priya", "u-ola", "u-daan", "u-bram", "u-anouk"], {
      location: "Auditorium + Teams (simulated)",
      description: "Hands-on session about Azure Functions, used by the VR Lending back-end.",
    }),
    m("m-pair", "Pairing: availability check", 1, "14:00", "15:30", "u-daan", ["u-daan", "u-ola"], {
      projectId: "p-vr",
      description: "Pair programming on the maintenance-aware availability check.",
    }),
    m("m-vr-prototype", "VR Lending — Prototype Review", 2, "10:00", "11:00", "u-marco", ["u-marco", "u-ola", "u-daan", "u-emma", "u-lucas"], {
      projectId: "p-vr",
      description: "Review of the working prototype with Facility Services.",
      agenda: ["Prototype demo", "Feedback from Facility Services", "Go/no-go for pilot"],
    }),
    m("m-sustain-escalation", "Sustainability — Supplier Data Escalation", 3, "09:00", "09:45", "u-femke", ["u-femke", "u-marco", "u-sanne"], {
      projectId: "p-sustain",
      description: "Escalation of the delayed supplier data delivery.",
    }),
    m("m-ux-findings", "Real Estate UX — Usability Test Findings", 4, "13:00", "14:00", "u-emma", ["u-emma", "u-ruben"], { projectId: "p-ux" }),
    m("m-quarterly", "Quarterly Innovation Update (all hands)", 8, "16:00", "17:00", "u-lisa", ["u-lisa", "u-ola", "u-daan", "u-sanne", "u-marco", "u-emma", "u-priya", "u-thomas"], {
      location: "Auditorium + Teams (simulated)",
    }),
    m("m-automation-demo", "Process Automation — Approval Flow Demo", -2, "10:00", "11:00", "u-anouk", ["u-anouk", "u-marco", "u-bram", "u-sanne"], {
      projectId: "p-automation",
      description: "Demo of the reusable approval workflow engine.",
      summary: "Anouk demonstrated the approval workflow engine. Other internal apps can now request approvals through one connector. The team agreed to deploy the connector to the test environment.",
      keyPoints: ["The approval engine handles multi-step approvals and delegation.", "A connector lets other apps reuse approvals."],
      decisions: ["Expose approvals through one connector."],
      actionPoints: [{ id: "ap-a1", text: "Deploy the approval connector to the test environment.", mentionedBy: "u-marco", timestamp: "10:41" }],
    }),
    m("m-portal-planning", "Innovation Portal — Sprint Planning", -3, "10:00", "11:00", "u-lisa", ["u-lisa", "u-ola", "u-daan", "u-emma"], {
      projectId: "p-portal",
      description: "Sprint 7 planning.",
      summary: "Sprint 7 focuses on intake form validation and the status overview for management. The status overview will only show aggregated data.",
      keyPoints: ["Intake form validation goes first.", "Status overview shows aggregated data only."],
      decisions: ["Status overview shows only aggregated data."],
      actionPoints: [],
    }),
    m("m-git-workshop", "Git workflow workshop", -4, "13:30", "15:00", "u-daan", ["u-daan", "u-ola", "u-emma"], {
      description: "Branches, pull requests and resolving merge conflicts.",
      summary: "Daan explained the team's branching strategy and how to resolve merge conflicts. Everyone practised a rebase.",
      keyPoints: ["Short-lived branches", "Small pull requests"],
    }),
    m("m-vr-kickoff", "VR Lending — Kick-off", -8, "10:00", "11:30", "u-marco", ["u-marco", "u-ola", "u-daan", "u-emma", "u-lucas"], {
      projectId: "p-vr",
      summary: "Kick-off of the VR Lending Service. Scope: catalogue, reservations, availability and approvals.",
    }),
  ];

  // ─── Inbox ─────────────────────────────────────────────────────────────────
  let msgN = 0;
  const msg = (recipientId: string, data: Omit<Message, "id" | "recipientId" | "replies" | "linkedTaskIds" | "archived"> & { archived?: boolean }): Message => ({
    id: `msg-${++msgN}`,
    recipientId,
    replies: [],
    linkedTaskIds: [],
    archived: false,
    ...data,
  });

  const messages: Message[] = [
    // Ola
    msg("u-ola", {
      channel: "meeting",
      fromName: "Meeting recap",
      subject: "Summary ready: VR Equipment Lending — Project Discussion",
      body: "The AI summary of yesterday's project discussion is ready. It contains 4 action points and 2 decisions. Open the meeting to turn the action points into tasks.",
      receivedAt: at(-1, "15:05"),
      read: false,
      important: true,
      needsAction: true,
      projectId: "p-vr",
      meetingId: "m-vr-discussion",
    }),
    msg("u-ola", {
      channel: "teams",
      fromId: "u-marco",
      subject: "Prototype for the review",
      body: "Hi Ola, can you make sure the reservation flow works end-to-end in the prototype before the review? Facility Services wants to try it themselves. Let me know if anything blocks you.",
      receivedAt: ago(95),
      read: false,
      important: true,
      needsAction: true,
      projectId: "p-vr",
      meetingId: "m-vr-prototype",
    }),
    msg("u-ola", {
      channel: "outlook",
      fromId: "u-lucas",
      subject: "Two headsets back from repair — please check availability logic",
      body: "Hello, headsets VR-04 and VR-07 are back from repair, but VR-02 goes into maintenance next week. Could you make sure the availability check excludes maintenance periods? Last week two colleagues reserved a headset that was in repair. Thanks, Lucas",
      receivedAt: ago(180),
      read: false,
      important: false,
      needsAction: true,
      projectId: "p-vr",
    }),
    msg("u-ola", {
      channel: "github",
      fromName: "GitHub",
      subject: "Daan requested your review on vr-lending#42",
      body: "Reservation calendar keyboard navigation — 4 files changed, +186 −22. Checks are passing.",
      receivedAt: ago(240),
      read: false,
      important: false,
      needsAction: true,
      projectId: "p-vr",
    }),
    msg("u-ola", {
      channel: "outlook",
      fromId: "u-noor",
      subject: "Mid-term internship evaluation",
      body: "Dear Ola, it's time to plan your mid-term internship evaluation. Please send me two or three possible dates in the coming two weeks, and bring your logbook. Kind regards, Noor",
      receivedAt: at(-1, "10:12"),
      read: false,
      important: true,
      needsAction: true,
    }),
    msg("u-ola", {
      channel: "teams",
      fromId: "u-emma",
      subject: "Wireframes for the confirmation screen",
      body: "Hey! I put version B of the confirmation screen wireframes in the project folder. Could you have a look before the review? Especially whether the summary fits on small screens.",
      receivedAt: at(-1, "16:30"),
      read: true,
      important: false,
      needsAction: false,
      projectId: "p-vr",
    }),
    msg("u-ola", {
      channel: "task",
      fromId: "u-sanne",
      subject: "Sanne assigned you: Complete the Security Awareness module",
      body: "This module is mandatory for new employees within the first month.",
      receivedAt: at(-4, "09:00"),
      read: true,
      important: false,
      needsAction: false,
    }),
    msg("u-ola", {
      channel: "teams",
      fromId: "u-daan",
      subject: "Pairing tomorrow?",
      body: "Shall we pair tomorrow afternoon on the availability check? I booked 14:00–15:30.",
      receivedAt: ago(320),
      read: true,
      important: false,
      needsAction: false,
      projectId: "p-vr",
    }),
    msg("u-ola", {
      channel: "approval",
      fromName: "Hours registration",
      subject: "Your hours were approved",
      body: "Sanne de Wit approved your hours for the week of " + mondayOf(addDaysISO(today, -14)) + ".",
      receivedAt: at(-5, "17:10"),
      read: true,
      important: false,
      needsAction: false,
    }),
    msg("u-ola", {
      channel: "reminder",
      fromName: "TBI ONE",
      subject: "Register your hours for this week",
      body: "You have draft hours for this week. Submit them before Friday 17:00.",
      receivedAt: ago(30),
      read: false,
      important: false,
      needsAction: true,
    }),
    msg("u-ola", {
      channel: "project",
      fromName: "Innovation Projects Portal",
      subject: "Milestone reached: Project board",
      body: "The 'Project board' milestone was completed. Next milestone: Status overview for management.",
      receivedAt: at(-2, "17:00"),
      read: true,
      important: false,
      needsAction: false,
      projectId: "p-portal",
    }),
    msg("u-ola", {
      channel: "outlook",
      fromName: "IT Service Desk",
      subject: "Planned maintenance on Saturday",
      body: "Some internal applications will be unavailable on Saturday between 08:00 and 12:00.",
      receivedAt: at(-3, "08:30"),
      read: true,
      important: false,
      needsAction: false,
    }),
    // Daan
    msg("u-daan", {
      channel: "github",
      fromName: "GitHub",
      subject: "Ola requested your review on innovation-portal#18",
      body: "Project intake form validation — 6 files changed, +240 −31. Checks are passing.",
      receivedAt: ago(70),
      read: false,
      important: true,
      needsAction: true,
      projectId: "p-portal",
    }),
    msg("u-daan", {
      channel: "github",
      fromName: "GitHub",
      subject: "CI failed on smart-building-core (feat/alarm-routing)",
      body: "test_alarm_routing_latency failed: expected < 60s, got 74s.",
      receivedAt: ago(140),
      read: false,
      important: true,
      needsAction: true,
      projectId: "p-smart",
    }),
    msg("u-daan", {
      channel: "teams",
      fromId: "u-thomas",
      subject: "Alarm routing latency",
      body: "Can you look at the alarm routing latency before the sync at 13:00? We need to stay under 60 seconds.",
      receivedAt: ago(150),
      read: false,
      important: true,
      needsAction: true,
      projectId: "p-smart",
    }),
    msg("u-daan", {
      channel: "outlook",
      fromId: "u-priya",
      subject: "Azure Lunch & Learn tomorrow",
      body: "Would you show the VR Lending Functions setup for 10 minutes during the Lunch & Learn?",
      receivedAt: at(-1, "11:00"),
      read: true,
      important: false,
      needsAction: true,
    }),
    // Sanne
    msg("u-sanne", {
      channel: "outlook",
      fromId: "u-youssef",
      subject: "Quarterly access review: Smart Building Platform",
      body: "Please review who has access to the Smart Building Platform before the end of the month. Remove access that is no longer needed.",
      receivedAt: at(-1, "09:30"),
      read: false,
      important: true,
      needsAction: true,
      projectId: "p-smart",
    }),
    msg("u-sanne", {
      channel: "teams",
      fromId: "u-lisa",
      subject: "Capacity for Q4",
      body: "Could you send me the team capacity plan for Q4 before the steering meeting?",
      receivedAt: ago(200),
      read: false,
      important: true,
      needsAction: true,
    }),
    msg("u-sanne", {
      channel: "teams",
      fromId: "u-priya",
      subject: "Change request for portal sign-in",
      body: "The app registration request for the Innovation Portal is ready. Can you submit it?",
      receivedAt: at(-1, "14:20"),
      read: true,
      important: false,
      needsAction: true,
      projectId: "p-portal",
    }),
    // Marco
    msg("u-marco", {
      channel: "outlook",
      fromId: "u-femke",
      subject: "Supplier data delayed — Sustainability dashboard blocked",
      body: "The supplier has postponed the data delivery again. The automated import milestone is now overdue. I've planned an escalation meeting.",
      receivedAt: ago(260),
      read: false,
      important: true,
      needsAction: true,
      projectId: "p-sustain",
    }),
    msg("u-marco", {
      channel: "teams",
      fromId: "u-lisa",
      subject: "Steering committee agenda",
      body: "Please send your status update for VR Lending and Process Automation before tomorrow 09:00.",
      receivedAt: ago(120),
      read: false,
      important: true,
      needsAction: true,
    }),
    msg("u-marco", {
      channel: "teams",
      fromId: "u-anouk",
      subject: "Approval connector ready for test",
      body: "The approval connector is deployed to test. VR Lending could use it for the long-loan approvals!",
      receivedAt: at(-1, "16:45"),
      read: true,
      important: false,
      needsAction: false,
      projectId: "p-automation",
    }),
  ];

  // ─── GitHub ────────────────────────────────────────────────────────────────
  const issue = (id: string, repoId: string, number: number, title: string, state: GithubIssue["state"], labels: string[], authorId: string, assigneeId: string | undefined, daysAgo: number, body = "", taskId?: string): GithubIssue => ({
    id,
    repoId,
    number,
    title,
    body,
    state,
    labels,
    authorId,
    assigneeId,
    createdAt: at(-daysAgo, "10:00"),
    taskId,
  });

  const issues: GithubIssue[] = [
    issue("i-vr-36", "r-vr", 36, "Filter catalogue by headset type", "closed", ["enhancement"], "u-marco", "u-ola", 7, "Users want to filter by headset type and location.", "t-ola-7"),
    issue("i-vr-38", "r-vr", 38, "Reservation overview shows times in UTC", "open", ["bug"], "u-daan", "u-ola", 3, "Times should be shown in Europe/Amsterdam.", "t-ola-2"),
    issue("i-vr-39", "r-vr", 39, "Availability check ignores maintenance periods", "open", ["bug", "blocker"], "u-lucas", "u-daan", 2, "Headsets in maintenance can be reserved.", "t-daan-1"),
    issue("i-vr-40", "r-vr", 40, "Send a confirmation after a reservation", "open", ["enhancement"], "u-emma", undefined, 5, "Users don't know if their reservation succeeded."),
    issue("i-vr-41", "r-vr", 41, "Calendar is not keyboard accessible", "open", ["accessibility"], "u-emma", "u-daan", 4),
    issue("i-portal-12", "r-portal", 12, "Project board columns", "closed", ["enhancement"], "u-lisa", "u-ola", 9),
    issue("i-portal-15", "r-portal", 15, "Validate intake form input", "open", ["enhancement", "good first issue"], "u-lisa", "u-ola", 4, "Required fields and helpful error messages.", "t-ola-1"),
    issue("i-portal-16", "r-portal", 16, "Status overview for management", "open", ["enhancement"], "u-lisa", "u-daan", 3, "", "t-daan-3"),
    issue("i-smart-21", "r-smart", 21, "Alarm routing exceeds 60s under load", "open", ["bug"], "u-thomas", "u-daan", 1),
    issue("i-auto-7", "r-automation", 7, "Document the approval connector API", "open", ["documentation"], "u-marco", "u-anouk", 2),
    issue("i-sustain-11", "r-sustain", 11, "Supplier CSV import fails on empty rows", "open", ["bug"], "u-femke", "u-bram", 6),
    issue("i-ui-4", "r-ui", 4, "Visible focus styles for all buttons", "open", ["accessibility"], "u-emma", "u-emma", 3),
  ];

  const pullRequests: PullRequest[] = [
    { id: "pr-vr-35", repoId: "r-vr", number: 35, title: "Equipment catalogue filters", authorId: "u-ola", reviewerIds: ["u-daan"], state: "merged", branch: "feat/catalogue-filters", additions: 212, deletions: 18, checks: "passing", createdAt: at(-4, "11:00") },
    { id: "pr-vr-42", repoId: "r-vr", number: 42, title: "Reservation calendar keyboard navigation", authorId: "u-daan", reviewerIds: ["u-ola", "u-emma"], state: "open", branch: "feat/calendar-keyboard", additions: 186, deletions: 22, checks: "passing", createdAt: ago(250) },
    { id: "pr-vr-43", repoId: "r-vr", number: 43, title: "Availability: exclude maintenance windows", authorId: "u-daan", reviewerIds: [], state: "draft", branch: "feat/availability-check", additions: 94, deletions: 12, checks: "pending", createdAt: ago(60) },
    { id: "pr-vr-44", repoId: "r-vr", number: 44, title: "Show reservation times in Europe/Amsterdam", authorId: "u-ola", reviewerIds: ["u-daan"], state: "draft", branch: "fix/timezone-display", additions: 41, deletions: 9, checks: "pending", createdAt: ago(45) },
    { id: "pr-portal-18", repoId: "r-portal", number: 18, title: "Project intake form validation", authorId: "u-ola", reviewerIds: ["u-daan"], state: "open", branch: "feat/intake-validation", additions: 240, deletions: 31, checks: "passing", createdAt: ago(75) },
    { id: "pr-portal-17", repoId: "r-portal", number: 17, title: "Project board columns", authorId: "u-ola", reviewerIds: ["u-daan"], state: "merged", branch: "feat/board-columns", additions: 310, deletions: 44, checks: "passing", createdAt: at(-2, "10:00") },
    { id: "pr-smart-9", repoId: "r-smart", number: 9, title: "Alarm routing via service bus", authorId: "u-daan", reviewerIds: ["u-thomas", "u-priya"], state: "open", branch: "feat/alarm-routing", additions: 420, deletions: 88, checks: "failing", createdAt: at(-1, "09:00") },
    { id: "pr-auto-5", repoId: "r-automation", number: 5, title: "Approval connector", authorId: "u-anouk", reviewerIds: ["u-bram"], state: "merged", branch: "feat/approval-connector", additions: 530, deletions: 12, checks: "passing", createdAt: at(-3, "15:00") },
    { id: "pr-sustain-12", repoId: "r-sustain", number: 12, title: "Skip empty rows in supplier import", authorId: "u-bram", reviewerIds: ["u-daan", "u-femke"], state: "open", branch: "fix/supplier-import", additions: 23, deletions: 4, checks: "failing", createdAt: at(-1, "13:00") },
  ];

  const c = (sha: string, repoId: string, message: string, authorId: string, iso: string, branch = "main"): Commit => ({ sha, repoId, message, authorId, at: iso, branch });
  const commits: Commit[] = [
    c("a1f3c9e", "r-portal", "feat(intake): validate required fields with zod", "u-ola", ago(80), "feat/intake-validation"),
    c("9b27d4a", "r-portal", "test(intake): cover length limits", "u-ola", ago(78), "feat/intake-validation"),
    c("4c8e1f0", "r-vr", "fix: format reservation times in Europe/Amsterdam", "u-ola", ago(50), "fix/timezone-display"),
    c("e7a0b12", "r-vr", "feat(calendar): arrow-key navigation", "u-daan", ago(255), "feat/calendar-keyboard"),
    c("2d9f6c3", "r-vr", "wip: read maintenance schedule", "u-daan", ago(62), "feat/availability-check"),
    c("71cc0aa", "r-portal", "feat(board): columns per project phase", "u-ola", at(-2, "15:20")),
    c("b3e4d55", "r-automation", "feat: approval connector", "u-anouk", at(-3, "14:00")),
    c("0fe2a91", "r-smart", "feat: route alarms via service bus", "u-daan", at(-1, "08:40"), "feat/alarm-routing"),
    c("5a6b7c8", "r-sustain", "fix: skip empty rows", "u-bram", at(-1, "12:50"), "fix/supplier-import"),
    c("c0ffee1", "r-ui", "feat: focus ring tokens", "u-emma", at(-2, "11:30"), "feat/focus-styles"),
  ];

  // ─── Learning ──────────────────────────────────────────────────────────────
  const learning: LearningProfile[] = [
    {
      userId: "u-ola",
      skills: [
        { skill: "TypeScript", level: 55, target: 80 },
        { skill: "Next.js", level: 50, target: 80 },
        { skill: "Git & GitHub", level: 62, target: 85 },
        { skill: "Databases", level: 30, target: 70 },
        { skill: "API development", level: 35, target: 70 },
        { skill: "Microsoft Azure", level: 20, target: 65 },
        { skill: "AI development", level: 42, target: 70 },
        { skill: "RAG", level: 15, target: 60 },
        { skill: "Agents & tool calling", level: 20, target: 60 },
        { skill: "Authentication", level: 15, target: 60 },
        { skill: "Cybersecurity", level: 30, target: 60 },
        { skill: "Testing", level: 35, target: 75 },
        { skill: "CI/CD", level: 25, target: 60 },
      ],
      goals: [
        { id: "g-ola-1", title: "Ship a feature to production through a reviewed pull request", due: wd(10), done: true },
        { id: "g-ola-2", title: "Write unit and end-to-end tests for my own features", due: wd(20), done: false },
        { id: "g-ola-3", title: "Understand Azure basics well enough to deploy an Azure Function", due: wd(30), done: false },
        { id: "g-ola-4", title: "Build a small RAG prototype with permission-aware retrieval", due: wd(45), done: false },
        { id: "g-ola-5", title: "Keep a weekly logbook for the full internship", due: wd(60), done: false },
      ],
      enrolledCourseIds: ["c-ts", "c-next", "c-git", "c-testing", "c-security", "c-ai"],
      completedLessons: {
        "c-ts": ["c-ts-l1", "c-ts-l2", "c-ts-l3"],
        "c-next": ["c-next-l1", "c-next-l2"],
        "c-git": ["c-git-l1", "c-git-l2", "c-git-l3"],
        "c-testing": ["c-testing-l1"],
        "c-security": ["c-security-l1"],
        "c-ai": ["c-ai-l1", "c-ai-l2"],
      },
    },
    {
      userId: "u-daan",
      skills: [
        { skill: "TypeScript", level: 85, target: 90 },
        { skill: "Next.js", level: 80, target: 85 },
        { skill: "Databases", level: 70, target: 80 },
        { skill: "Microsoft Azure", level: 60, target: 80 },
        { skill: "Testing", level: 75, target: 85 },
        { skill: "CI/CD", level: 65, target: 80 },
        { skill: "RAG", level: 25, target: 60 },
        { skill: "Agents & tool calling", level: 30, target: 65 },
      ],
      goals: [{ id: "g-daan-1", title: "Get Azure Developer certified", due: wd(40), done: false }],
      enrolledCourseIds: ["c-functions", "c-rag"],
      completedLessons: { "c-functions": ["c-functions-l1", "c-functions-l2"], "c-rag": ["c-rag-l1"] },
    },
    {
      userId: "u-sanne",
      skills: [
        { skill: "Microsoft Azure", level: 65, target: 75 },
        { skill: "AI development", level: 35, target: 60 },
        { skill: "Authentication", level: 60, target: 70 },
      ],
      goals: [{ id: "g-sanne-1", title: "Define a responsible-AI guideline for the team", due: wd(25), done: false }],
      enrolledCourseIds: ["c-ai"],
      completedLessons: { "c-ai": ["c-ai-l1"] },
    },
    {
      userId: "u-marco",
      skills: [
        { skill: "AI development", level: 20, target: 50 },
        { skill: "Microsoft Azure", level: 15, target: 40 },
      ],
      goals: [{ id: "g-marco-1", title: "Understand how AI can reduce project reporting work", due: wd(30), done: false }],
      enrolledCourseIds: ["c-ai"],
      completedLessons: {},
    },
  ];

  // ─── Hours ─────────────────────────────────────────────────────────────────
  const hours: HoursEntry[] = [];
  let hN = 0;
  const thisMonday = mondayOf(today);
  const addWeek = (userId: string, monday: ISODate, status: HoursEntry["status"], plan: [string | undefined, string][], untilToday = false) => {
    for (let i = 0; i < 5; i++) {
      const date = addDaysISO(monday, i);
      if (untilToday && date >= today) break;
      const [projectId, description] = plan[i % plan.length];
      hours.push({ id: `h-${++hN}`, userId, date, start: "08:30", end: "17:00", breakMinutes: 30, projectId, description, status });
    }
  };
  const olaPlan: [string | undefined, string][] = [
    ["p-vr", "Reservation calendar and catalogue filters"],
    ["p-portal", "Project board columns"],
    ["p-vr", "Timezone bug investigation"],
    ["p-portal", "Intake form validation"],
    [undefined, "Learning: TypeScript course and logbook"],
  ];
  const daanPlan: [string | undefined, string][] = [
    ["p-vr", "Availability check"],
    ["p-smart", "Alarm routing"],
    ["p-portal", "Code reviews"],
    ["p-vr", "Next.js upgrade"],
    ["p-smart", "Alarm routing tests"],
  ];
  addWeek("u-ola", addDaysISO(thisMonday, -14), "approved", olaPlan);
  addWeek("u-ola", addDaysISO(thisMonday, -7), "submitted", olaPlan);
  addWeek("u-ola", thisMonday, "draft", olaPlan, true);
  addWeek("u-daan", addDaysISO(thisMonday, -14), "approved", daanPlan);
  addWeek("u-daan", addDaysISO(thisMonday, -7), "submitted", daanPlan);
  addWeek("u-daan", thisMonday, "draft", daanPlan, true);
  addWeek("u-emma", addDaysISO(thisMonday, -7), "submitted", [["p-vr", "Confirmation wireframes"], ["p-ux", "Usability test script"]]);

  // ─── Logbook ───────────────────────────────────────────────────────────────
  const lastMonday = addDaysISO(thisMonday, -7);
  const logbook: LogbookEntry[] = [
    {
      id: "lb-1",
      userId: "u-ola",
      kind: "weekly",
      date: lastMonday,
      title: "Week report — catalogue filters and Git workshop",
      projectIds: ["p-vr", "p-portal"],
      completed: "Finished the equipment catalogue filters (vr-lending#35, merged). Set up the local environment for VR Lending.",
      challenges: "Resolving my first merge conflict took a while. Understanding how the reservation data is structured.",
      learnings: "Rebasing a branch, writing smaller commits, and how Daan reviews a pull request.",
      decisions: "We use short-lived branches and small pull requests.",
      nextSteps: "Start on the intake form validation and the project board.",
      createdAt: zonedISO(addDaysISO(lastMonday, 4), "16:30"),
      updatedAt: zonedISO(addDaysISO(lastMonday, 4), "16:30"),
      generated: false,
    },
    {
      id: "lb-2",
      userId: "u-ola",
      kind: "daily",
      date: wd(-1),
      title: "Project board done, VR project discussion",
      projectIds: ["p-portal", "p-vr"],
      completed: "Finished the project board columns. Joined the VR Lending project discussion.",
      challenges: "Drag-and-drop between columns on small screens.",
      learnings: "CSS grid with auto-fit for responsive boards.",
      decisions: "Loans longer than 3 working days need approval (VR Lending).",
      nextSteps: "Fix the timezone bug and continue the intake form validation.",
      createdAt: at(-1, "17:05"),
      updatedAt: at(-1, "17:05"),
      generated: false,
    },
  ];

  // ─── Access ────────────────────────────────────────────────────────────────
  const accessRequests: AccessRequest[] = [
    {
      id: "ar-1",
      requesterId: "u-anouk",
      resourceType: "project",
      resourceId: "p-smart",
      reason: "I want to automate facility tickets from Smart Building alarms and need to see the alarm data model.",
      status: "pending",
      approverId: "u-sanne",
      createdAt: at(-1, "11:20"),
    },
    {
      id: "ar-2",
      requesterId: "u-emma",
      resourceType: "document",
      resourceId: "d-budget",
      reason: "Need the UX research budget line for planning.",
      status: "rejected",
      approverId: "u-lisa",
      createdAt: at(-6, "10:00"),
      decidedAt: at(-5, "09:00"),
      decisionNote: "The budget line is shared in the project plan instead.",
    },
  ];
  const accessGrants: AccessGrant[] = [];

  // ─── News (all fictional) ──────────────────────────────────────────────────
  const news: NewsItem[] = [
    { id: "n-1", title: "Innovation Projects Portal replaces the intake spreadsheet", category: "project", summary: "New innovation ideas now start with the intake form in the portal.", body: "From this month, new innovation ideas are submitted through the Innovation Projects Portal. The old spreadsheet is archived.", date: wd(-2), audience: [], tags: ["portal", "innovation"], projectId: "p-portal" },
    { id: "n-2", title: "Azure Lunch & Learn: Functions in practice", category: "event", summary: "Priya Raman shows how Azure Functions power the VR Lending back-end.", body: "Bring your laptop. We deploy a small HTTP function together.", date: wd(-1), audience: ["intern", "developer"], tags: ["azure", "learning", "event"] },
    { id: "n-3", title: "Responsible AI: the human stays in control", category: "ai", summary: "Our principles for AI assistance: transparency, permissions and human approval.", body: "AI suggestions are always reviewable. Actions that change data need a person's confirmation, and AI only uses information the employee is allowed to see.", date: wd(-3), audience: [], tags: ["ai", "responsible ai", "policy"] },
    { id: "n-4", title: "Security awareness month", category: "announcement", summary: "Complete the Security Awareness module this month.", body: "All employees complete the updated Security Awareness module. New employees do so within their first month.", date: wd(-4), audience: [], tags: ["security", "training"] },
    { id: "n-5", title: "VR Lending pilot with Facility Services", category: "project", summary: "Facility Services will pilot the VR Lending Service for two weeks.", body: "After the prototype review, a two-week pilot starts at the Rotterdam office.", date: wd(-1), audience: ["intern", "developer", "pm"], tags: ["vr", "pilot"], projectId: "p-vr" },
    { id: "n-6", title: "Team leads: quarterly access reviews due", category: "announcement", summary: "Review access to restricted projects before month end.", body: "Remove access that is no longer needed. TBI ONE lists who has access through approved requests.", date: wd(-2), audience: ["lead", "pm"], tags: ["access", "security"] },
    { id: "n-7", title: "Learning path: AI development for developers", category: "learning", summary: "New learning path: LLMs, RAG and agents with tool calling.", body: "Three courses that build on each other. Recommended for developers working on AI features.", date: wd(-5), audience: ["intern", "developer"], tags: ["ai", "rag", "agents", "learning"] },
    { id: "n-8", title: "Steering committee: portfolio priorities for Q4", category: "innovation", summary: "Connecting existing tools gets priority over building new ones.", body: "The steering committee prefers projects that reduce context switching for employees.", date: wd(-6), audience: ["lead", "pm"], tags: ["portfolio", "strategy"] },
    { id: "n-9", title: "Reusable approval connector available", category: "innovation", summary: "Internal apps can reuse one approval flow instead of building their own.", body: "The Process Automation team released a connector for multi-step approvals.", date: wd(-2), audience: ["developer", "pm", "lead"], tags: ["automation", "approval", "reuse"], projectId: "p-automation" },
    { id: "n-10", title: "Quarterly Innovation Update — all hands", category: "event", summary: "Join the quarterly update in the auditorium or online.", body: "Lisa Kramer presents the portfolio results and next quarter's focus.", date: wd(-1), audience: [], tags: ["event", "innovation"] },
    { id: "n-11", title: "Tip: write smaller pull requests", category: "learning", summary: "Smaller pull requests get reviewed faster and contain fewer bugs.", body: "Aim for one change per pull request and explain how you tested it.", date: wd(-7), audience: ["intern", "developer"], tags: ["github", "code review"] },
    { id: "n-12", title: "Sustainability dashboard: supplier data delayed", category: "project", summary: "The automated import is postponed until supplier data arrives.", body: "An escalation meeting is planned this week.", date: wd(-1), audience: ["lead", "pm"], tags: ["sustainability", "risk"], projectId: "p-sustain" },
  ];

  // ─── Notifications ─────────────────────────────────────────────────────────
  const notifications: Notification[] = [
    { id: "no-1", userId: "u-ola", title: "Meeting summary ready", body: "VR Equipment Lending — Project Discussion has 4 action points.", why: "You attended this meeting and the prototype review is in 2 working days.", at: at(-1, "15:05"), read: false, href: "/calendar/m-vr-discussion" },
    { id: "no-2", userId: "u-ola", title: "Task overdue", body: "Complete the Security Awareness module", why: "Mandatory for new employees within their first month.", at: ago(600), read: false, href: "/tasks" },
    { id: "no-3", userId: "u-ola", title: "Review requested", body: "Daan asked you to review vr-lending#42.", why: "Reviewing helps you learn the calendar code you'll extend next.", at: ago(240), read: true, href: "/github" },
    { id: "no-4", userId: "u-sanne", title: "Access request waiting", body: "Anouk Peters requests access to Smart Building Platform.", why: "You are the approver for this restricted project.", at: at(-1, "11:20"), read: false, href: "/requests" },
    { id: "no-5", userId: "u-sanne", title: "Timesheets to approve", body: "Ola, Daan and Emma submitted hours for last week.", why: "You approve timesheets for your team.", at: at(-1, "17:00"), read: false, href: "/hours" },
    { id: "no-6", userId: "u-marco", title: "Project blocked", body: "Sustainability Analytics Dashboard is blocked by supplier data.", why: "You attend the escalation meeting and report to the steering committee tomorrow.", at: ago(260), read: false, href: "/projects/p-sustain" },
    { id: "no-7", userId: "u-daan", title: "CI failed", body: "smart-building-core: alarm routing latency test failed.", why: "Your pull request #9 is blocked until the test passes.", at: ago(140), read: false, href: "/github" },
  ];

  // ─── Activity ──────────────────────────────────────────────────────────────
  let aN = 0;
  const act = (minutesAgoOrIso: number | string, actorId: string, source: Activity["source"], text: string, href?: string, projectId?: string, visibleTo?: string[]): Activity => ({
    id: `a-${++aN}`,
    at: typeof minutesAgoOrIso === "number" ? ago(minutesAgoOrIso) : minutesAgoOrIso,
    actorId,
    source,
    text,
    href,
    projectId,
    visibleTo,
  });
  const activity: Activity[] = [
    act(45, "u-ola", "github", "pushed 1 commit to vr-lending (fix/timezone-display)", "/github", "p-vr"),
    act(62, "u-daan", "github", "opened draft PR #43 Availability: exclude maintenance windows", "/github", "p-vr"),
    act(75, "u-ola", "github", "opened PR #18 Project intake form validation", "/github", "p-portal"),
    act(95, "u-marco", "teams", "asked about the prototype for the review", "/inbox", "p-vr", ["u-ola"]),
    act(180, "u-lucas", "outlook", "reported headsets back from repair", "/inbox", "p-vr", ["u-ola"]),
    act(260, "u-femke", "project", "marked Sustainability Analytics Dashboard as blocked", "/projects/p-sustain", "p-sustain"),
    act(at(-1, "15:05"), "u-marco", "meeting", "shared the summary of VR Equipment Lending — Project Discussion", "/calendar/m-vr-discussion", "p-vr"),
    act(at(-1, "16:10"), "u-ola", "tasks", "completed Implement project board columns", "/tasks", "p-portal"),
    act(at(-1, "17:05"), "u-ola", "logbook", "added a daily logbook entry", "/logbook", undefined, ["u-ola"]),
    act(at(-2, "11:00"), "u-anouk", "project", "completed milestone Approval workflow engine", "/projects/p-automation", "p-automation"),
    act(at(-2, "15:20"), "u-ola", "github", "merged PR #17 Project board columns", "/github", "p-portal"),
    act(at(-2, "16:00"), "u-ola", "learning", "completed lesson Generics in practice", "/learning", undefined, ["u-ola"]),
    act(at(-3, "13:00"), "u-thomas", "project", "completed Alarm routing design review", "/projects/p-smart", "p-smart"),
    act(at(-3, "15:40"), "u-ola", "tasks", "completed Add equipment catalogue filters", "/tasks", "p-vr"),
    act(at(-5, "17:10"), "u-sanne", "hours", "approved hours for Ola", "/hours", undefined, ["u-ola", "u-sanne"]),
  ];

  const layouts: Record<string, DashboardLayout> = Object.fromEntries(
    Object.entries(defaultLayouts).map(([u, order]) => [u, { order, hidden: [] }]),
  );

  return {
    seededAt: now.toISOString(),
    projects,
    tasks,
    meetings,
    messages,
    issues,
    pullRequests,
    commits,
    learning,
    logbook,
    hours,
    accessRequests,
    accessGrants,
    news,
    notifications,
    activity,
    bookmarks: { "u-ola": ["n-7"] },
    layouts,
  };
}
