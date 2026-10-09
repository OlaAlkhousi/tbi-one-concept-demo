# Features

Everything below works in the demo. All data is fictional and every change stays in the browser.

## Workspace shell

- Collapsible sidebar. Menu items depend on the persona: the logbook is only shown to the intern and the developer, GitHub not to the project manager. Live counts for unread messages, open tasks and pending approvals.
- Top bar with global search, quick actions (create task, register hours, logbook entry, open next meeting, search documents, ask AI), the assistant toggle, notifications, theme switcher and the demo user switcher.
- Command palette on Ctrl+K or Cmd+K: grouped, permission-aware results across projects, meetings, tasks, documents, GitHub issues, people and logbook entries, plus quick actions and "ask the assistant" with the typed text.
- Notification centre. Notifications say why they matter, for example "You are the approver for this restricted resource".
- A "Concept demo, fictional data" label in the top bar and footer.
- Light, dark and system theme. Layouts work from 375 px phones to wide desktops.
- When stored demo data is from an earlier week, a banner offers to refresh it.

## Home

- Greeting and a one-line summary built from the data ("3 meetings today, 6 open tasks, 6 items that need your attention").
- Stat cards that depend on the persona: meetings, open tasks, items needing attention, and hours, review requests or approvals.
- AI morning briefing with links to the records behind each line.
- Widgets: priorities with one-click completion, today's meetings with a "now" marker, messages needing attention, project progress, an hours chart, approvals (approve or decline inline), GitHub, learning, team workload and the activity feed.
- Customise: show, hide and reorder widgets per persona, or reset to the role default.

## Inbox

- Teams, Outlook, GitHub, project, meeting, task, approval and reminder messages in one list.
- Filters: all, unread, important, needs action, meetings, GitHub, projects, archived. Search over sender, subject and body.
- Mark read or unread, flag as important, archive with undo.
- Create a task from a message. The task keeps a link to the message, and the message shows the task.
- Draft a reply with a suggested text. Saving it stores the reply in the demo and says it was not sent.
- Related project card. Meeting recaps open the meeting's action plan directly.

## Calendar and meetings

- Day, week, month and agenda views, with a current-time line and project colours.
- Meeting pages show the agenda, notes, participants and the simulated AI summary with key points, decisions and action points (who raised each one and when).
- Upcoming meetings get a "prepare for this meeting" card: agenda, your open tasks for that project and the decisions from the last related meeting.
- **Generate action plan**: one suggestion per action point with an editable title, description, project, owner, priority, deadline and GitHub option. Each suggestion shows why that owner, priority and deadline were chosen. Likely duplicates are left out by default, related work is listed, and an open issue that nobody owns can be linked instead of creating a new one. Nothing is created until you confirm. The created tasks link back to the meeting.

## Tasks

- List view grouped by overdue, today, coming days, later, no date and done. Board view with to do, in progress, review and done.
- Filters for scope, project, priority and text. Completed tasks can be hidden.
- Detail sheet with status, owner, deadline, description, the source (meeting, message, AI insight or assistant), the linked GitHub issue and possibly related tasks.
- Completing a task closes its linked issue and updates project progress.

## Projects

- Portfolio cards with live progress, team, technologies, next milestone and risks. Managers also get a table with a timeline.
- Restricted projects appear locked, with only the name, owner and a "Request access" button.
- Project pages with overview, tasks, activity, meetings, documents, decisions, GitHub and AI insights.
- **AI insights**: recommendations with impact, effort, the reason and the evidence (risks, objectives without work, open bugs, open decisions, another project's reusable feature). Each one converts into a task.

## GitHub (simulated)

- Overview, issues, pull requests, repositories and commits for repositories you can see.
- Create, close and reopen issues. Issues created from meetings show the meeting and the task.
- A clear banner that nothing is sent to github.com.

## Assistant

- Side panel on every page (Ctrl+J) and a full AI workspace page.
- Knows the page you are on ("this project", "this meeting", "this message").
- Answers about priorities, urgent work, meetings on a given day, what happened in a meeting, what happened while you were away, what you completed this week, project progress, blockers, improvements, similar projects, documents, colleagues and skills, owners, approvers and reviewers, emails needing a response, hours, learning, and a colleague's professional profile.
- Proposes actions: create a task, create a GitHub issue, draft a Teams or Outlook message, prepare an access request, open a page. Each needs confirmation, and tasks can be edited first.
- Shows sources, follow-up questions and a "Simulated AI" label. It says when a question is outside the demo data.
- Optional language-model mode, off by default.

## Knowledge

- Categories, search, tags and a "related to my projects" filter.
- Document preview with sections, owner, last updated date, source and related projects.
- Restricted documents show only the title, category and owner. Their content and tags are never searched or shown.

## People

- Search by name, role, skill or expertise. Filters for department, skill and availability.
- Profiles with skills, responsibilities, projects (only ones you can see), manager and what they approve.
- No private data: no messages, hours or logbook entries of other people.

## Learning

- Recommendations tied to your projects and skill gaps, with the reason.
- Skills against targets, a roadmap of goals, courses with lessons you can complete, and achievements.

## Work logbook

- Daily and weekly entries with completed work, challenges, learning moments, decisions and next steps.
- Search, filters, editing and deleting. Entries are grouped per week, with a print layout.
- **Generate my work summary**: reviews completed tasks, meetings, GitHub activity, lessons and registered hours, then gives an editable draft. Hours come only from the hours registration.

## Hours

- Weekly registration with start, end, break, project and description. Validation with clear messages.
- Calculated hours in Europe/Amsterdam time, correct on the nights the clocks change.
- Draft, submitted, approved and returned states, a week navigator, and per-day and per-project totals.
- Simulated submission to your manager. Team leads approve or return submitted weeks.

## Requests and approvals

- Approvers see waiting requests with the reason and approve or decline with a note.
- Everyone sees their own request history.
- Approval grants access straight away and notifies the requester.

## News

- Fictional company and technology news, ordered by relevance to your role and projects, with a reason per item.
- Category filters and bookmarks.

## Settings

- Profile, theme, persona switching, assistant mode and the supported question types.
- What the demo stores and where. Export your own demo data as JSON.
- Reset demo data.

## Ideas beyond the brief that are implemented

- Duplicate and related-work detection in the meeting action plan.
- Cross-project reuse suggestions in AI insights.
- Meeting preparation cards.
- Notifications that explain why they matter.
- Natural-language navigation in the assistant ("open the hours page").
- Explainable suggestions: every AI field has a visible reason.
- A data export that contains only your own records.
