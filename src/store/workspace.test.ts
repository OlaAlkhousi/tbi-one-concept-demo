import { beforeEach, describe, expect, it } from "vitest";
import { generateActionPlan } from "@/lib/ai/meeting-actions";
import { canViewProject } from "@/lib/permissions";
import { myNotifications, pendingApprovals, type S } from "@/lib/selectors";
import { mondayOf, toISODate } from "@/lib/time";
import { useWorkspace } from "./workspace";

const st = () => useWorkspace.getState();
const snapshot = () => st() as unknown as S;

beforeEach(() => {
  st().resetDemo();
  st().switchUser("u-ola");
});

describe("Demo A — meeting to tasks and GitHub issues", () => {
  it("creates tasks and issues that stay linked to the meeting", () => {
    const plan = generateActionPlan(snapshot(), "m-vr-discussion").filter((sg) => !sg.duplicate);
    const drafts = plan.map((sg) => ({
      title: sg.title,
      description: sg.description,
      projectId: sg.projectId,
      assigneeId: sg.ownerId,
      priority: sg.priority,
      due: sg.due,
      source: { type: "meeting" as const, id: "m-vr-discussion" },
      alsoCreateIssue: !sg.linkIssue,
      linkIssueId: sg.linkIssue?.id,
    }));
    const created = st().createActionPlan("m-vr-discussion", drafts);

    expect(created).toHaveLength(3);
    const meeting = st().meetings.find((m) => m.id === "m-vr-discussion")!;
    expect(meeting.followUpTaskIds).toEqual(created.map((t) => t.id));
    expect(meeting.actionPlanCreatedAt).toBeDefined();

    for (const t of created) {
      expect(t.source).toEqual({ type: "meeting", id: "m-vr-discussion" });
      expect(t.githubIssueId).toBeDefined();
    }
    // The confirmation flow was linked to the existing issue #40 instead of a new one.
    const confirmation = created.find((t) => t.title.startsWith("Create a reservation confirmation flow"))!;
    expect(confirmation.githubIssueId).toBe("i-vr-40");
    // The others became new simulated issues that remember the meeting.
    const newIssues = st().issues.filter((i) => i.meetingId === "m-vr-discussion");
    expect(newIssues).toHaveLength(2);
    expect(newIssues.every((i) => i.createdInDemo)).toBe(true);
    // The meeting recap message no longer needs action, and the activity feed knows.
    expect(st().messages.find((m) => m.meetingId === "m-vr-discussion" && m.channel === "meeting")?.needsAction).toBe(false);
    expect(st().activity[0].text).toMatch(/turned VR Equipment Lending — Project Discussion into 3 follow-up tasks/);
  });

  it("closes the linked issue when the task is completed", () => {
    st().setTaskStatus("t-ola-2", "done");
    expect(st().issues.find((i) => i.id === "i-vr-38")?.state).toBe("closed");
  });
});

describe("Demo C — access request and approval", () => {
  it("lets a manager approve access, which changes what the employee can see", () => {
    const smart = () => st().projects.find((p) => p.id === "p-smart")!;
    expect(canViewProject(snapshot(), "u-ola", smart())).toBe(false);

    st().requestAccess("project", "p-smart", "I want to learn how the sensor platform is built.");
    const req = st().accessRequests.find((r) => r.requesterId === "u-ola")!;
    expect(req).toMatchObject({ status: "pending", approverId: "u-sanne" });

    st().switchUser("u-sanne");
    expect(pendingApprovals(snapshot()).map((r) => r.id)).toContain(req.id);
    expect(myNotifications(snapshot())[0].title).toBe("Access request waiting");
    st().decideAccess(req.id, true, "Welcome aboard");

    st().switchUser("u-ola");
    expect(canViewProject(snapshot(), "u-ola", smart())).toBe(true);
    expect(myNotifications(snapshot())[0]).toMatchObject({ title: "Access granted", href: "/projects/p-smart" });
  });

  it("does not let someone decide on a request they are not the approver of", () => {
    st().requestAccess("project", "p-smart", "Please let me in to see the data.");
    const req = st().accessRequests.find((r) => r.requesterId === "u-ola")!;
    st().switchUser("u-marco");
    st().decideAccess(req.id, true);
    expect(st().accessRequests.find((r) => r.id === req.id)?.status).toBe("pending");
  });

  it("does not create a second pending request for the same resource", () => {
    st().requestAccess("project", "p-smart", "First request with a reason.");
    st().requestAccess("project", "p-smart", "Second request with a reason.");
    expect(st().accessRequests.filter((r) => r.requesterId === "u-ola" && r.status === "pending")).toHaveLength(1);
  });
});

describe("hours, logbook and reset", () => {
  it("submits a week and lets the manager approve it", () => {
    const monday = mondayOf(toISODate());
    st().addHours({ date: monday, start: "09:00", end: "12:00", breakMinutes: 0, description: "Testing", projectId: "p-vr" });
    const count = st().submitWeek(monday);
    expect(count).toBeGreaterThan(0);
    expect(st().hours.filter((h) => h.userId === "u-ola" && h.date === monday).every((h) => h.status === "submitted")).toBe(true);

    st().switchUser("u-sanne");
    st().decideWeek("u-ola", monday, true);
    expect(st().hours.filter((h) => h.userId === "u-ola" && h.date === monday).every((h) => h.status === "approved")).toBe(true);
  });

  it("only deletes draft hours", () => {
    const approved = st().hours.find((h) => h.userId === "u-ola" && h.status === "approved")!;
    st().deleteHours(approved.id);
    expect(st().hours.some((h) => h.id === approved.id)).toBe(true);
  });

  it("saves a reviewed logbook draft as a private entry", () => {
    const entry = st().saveLogbook({ kind: "weekly", date: "2026-10-05", title: "Week report", projectIds: ["p-vr"], completed: "x", challenges: "", learnings: "", decisions: "", nextSteps: "", generated: true });
    expect(st().logbook[0].id).toBe(entry.id);
    expect(st().activity[0]).toMatchObject({ source: "logbook", visibleTo: ["u-ola"] });
  });

  it("resets the demo but keeps the current persona", () => {
    st().switchUser("u-marco");
    st().createTask({ title: "Temporary", description: "", assigneeId: "u-marco", priority: "low", source: { type: "manual" } });
    st().resetDemo();
    expect(st().tasks.some((t) => t.title === "Temporary")).toBe(false);
    expect(st().currentUserId).toBe("u-marco");
  });
});
