# Roadmap

TBI ONE is a concept. This roadmap describes how it could become a real product, and what each step would need. None of these steps should start without organisational approval, a privacy assessment and the owners of the systems involved.

## Phase 0: concept (this repository)

- One workspace over fictional data, four personas, five working demo flows.
- Deterministic assistant with sources and confirmation.
- Provider interfaces for future integrations.

## Phase 1: identity and a real backend

- Sign-in with Microsoft Entra ID. The persona switcher disappears.
- A server API that holds the workspace logic now in the browser store.
- Authorisation on the server, based on Entra ID groups and roles. Restricted data never reaches a browser that may not see it.
- A database for TBI ONE's own data (dashboard layouts, logbook, task links, AI suggestions and confirmations).
- Audit logging of access decisions and every AI-proposed action.

## Phase 2: read-only integrations

- Microsoft Graph with delegated permissions: calendar, mail, Teams chats and meeting insights where the tenant allows them, SharePoint search with the user's own access.
- GitHub through a GitHub App: repositories, issues, pull requests and review requests.
- Read access to time registration and the learning platform.

Read-only first, so the value can be measured before anything is written back.

## Phase 3: actions with confirmation

- Create GitHub issues from meeting action plans.
- Create tasks in the existing project tool.
- Save draft replies in Outlook or Teams, which the employee sends themselves.
- Pre-fill time registration from calendar and tasks. The employee still submits.

Each action shows exactly what will be written and needs a click to confirm.

## Phase 4: enterprise AI

- An approved model (for example through Microsoft Foundry or another approved provider).
- Retrieval over the integrations above, filtered by the user's permissions before the model sees anything.
- Answers with citations to the source record.
- Tool calling for the actions in phase 3, with the same confirmation step.
- Evaluation sets for the main questions, so quality is measured before and after changes.

## Product ideas for later

- **Smart meeting preparation.** Before each meeting: the agenda, your open tasks for that project, and what was decided last time. A first version exists on upcoming meeting pages.
- **Follow-up tracking.** Notice when a meeting action point has no owner after two days.
- **Duplicate detection across tools.** Warn when a new task looks like an existing issue. The action plan already does this inside a project.
- **Project handover.** Generate a handover document from decisions, risks, open work and contacts when someone leaves a project.
- **Cross-project discovery.** Point out when another project already built what you need. The insights already suggest the approval connector to VR Lending.
- **Notifications that explain themselves.** Every notification says why it matters to you. A first version is in the notification centre.
- **Natural-language navigation.** "Open the hours page" already works in the assistant.
- **Weekly team digest** for team leads, built only from information they may see.

## Things to decide before going further

- Which systems are in scope first, and who owns each integration.
- Data retention for AI conversations and suggestions.
- How employees can see and correct what the assistant knows about them.
- Works council (OR) involvement, because the workspace touches hours and workload.
