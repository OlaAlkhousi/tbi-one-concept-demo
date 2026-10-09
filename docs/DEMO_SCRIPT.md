# Demo script (5 to 8 minutes)

A walkthrough for showing TBI ONE to a supervisor. Times are a guide. Text in quotes is what you can say; the bullets are what you click.

## Before you start

- Run `npm run dev` and open http://localhost:3000 in a large browser window (1366 px wide or more).
- Open **Settings** and click **Reset demo data**, so every flow starts clean.
- Make sure you are **Ola** (top right).
- Light mode usually looks better on a projector. The theme switcher is next to the bell.

## Optional Dutch introduction (30 seconds)

"Ik wil je een idee laten zien waar ik naast mijn stage aan heb gewerkt. Het heet TBI ONE. Het is geen officieel TBI-product en alle gegevens zijn verzonnen. Het idee is dat een medewerker één werkplek heeft die zijn vergaderingen, taken, projecten, GitHub, documenten en uren verbindt, met een assistent die meedenkt maar niets doet zonder jouw bevestiging. Ik laat het verder in het Engels zien."

## 1. The problem (30 seconds)

"A developer's day jumps between Teams, Outlook, GitHub, Claude, SharePoint, the hours system and a logbook. The tools are good. The work is in copying information between them. TBI ONE is a layer on top of those tools, built around one data model, so they feel like one place."

## 2. Demo B: the morning overview (1 minute)

- Stay on **Home**.

"This is my day as an intern. Three meetings, my open tasks, and what needs my attention. These numbers come from the data, not from a template."

- Point at **Your AI Morning Briefing**.

"The briefing tells me where to start and why. It is marked as simulated AI: in this demo a rule-based engine builds it, and every line links to the record behind it."

- Click **What should I focus on?**

"The assistant answers from my tasks, meetings and messages and shows its sources. If I ask something outside the demo data, it says so instead of guessing."

## 3. Demo A: meeting to GitHub issues (2 minutes)

"This is the flow I wanted most. Yesterday we had a project meeting about VR lending."

- Click **Calendar**, open **VR Equipment Lending — Project Discussion**.

"The meeting has a summary with decisions and four action points, like Teams provides. Normally I would copy this into Claude and then type GitHub issues by hand."

- Click **Generate action plan**.

"Each action point becomes a suggestion with an owner, priority and deadline, and the reason for each. The availability fix goes to Daan because he has the back-end skills. The prototype comes to me, because Marco asked me about it in Teams."

- Point at the first card.

"It also noticed that Daan already has a task for the availability check, so it suggests not to create a duplicate. For the confirmation flow there is an open GitHub issue nobody owns, so it links to that instead of creating a new one."

- Change a title, then click **Create tasks**.

"Nothing is created until I confirm. Now the tasks exist."

- Open **My Tasks**, then **GitHub**, then **Home**.

"They are in my task list, they are simulated issues in the repository with a link back to the meeting, and the activity feed shows it. One action, every module updated."

## 4. Demo C: permissions (1.5 minutes)

- Open **Projects** and click **Smart Building Platform**.

"As an intern I don't have access to this project. I can see who owns it and who approves access, but nothing of the content. Search and the assistant follow the same rules."

- Click **Request access**, type a reason, send.
- Switch to **Sanne de Wit**.

"Now I am Sanne, the team lead. Her dashboard looks different: team workload and approvals."

- Open **Requests**, click **Approve**.
- Switch back to **Ola** and open the project again.

"The project is open now and I got a notification. Being a manager does not mean Sanne can read my messages or my logbook. In a real version Microsoft Entra ID would enforce this on the server."

## 5. Demo D: logbook (1 minute)

- Open **Work Logbook**, click **Generate my work summary**.

"As an intern I write a weekly logbook. TBI ONE drafts it from what I actually did this week: completed tasks, meetings, pull requests and lessons. Hours come only from what I registered. It never makes up hours."

- Edit a line, click **Save**.

## 6. Demo E: project recommendations (1 minute)

- Open **VR Equipment Lending Service**, tab **AI Insights**, click **Generate**.

"I ask what we should improve. Each suggestion shows its evidence: the risk, the objective without a task, the open bugs. One suggestion says another project already built an approval connector we could reuse. That is the kind of cross-project knowledge that usually gets lost."

- Click **Convert to task** on one suggestion and create it.

## 7. Close (30 seconds)

"Everything here is fictional and runs in the browser. The code is set up so real integrations could be added behind provider interfaces: Microsoft Graph, Entra ID, GitHub and an approved AI model. I'd like to hear which part you think would help colleagues most, and what would be needed to test it responsibly."

## If something goes wrong

- Data looks odd: **Settings → Reset demo data**.
- The assistant panel is in the way: press **Ctrl+J** to toggle it.
- Search: press **Ctrl+K** and type "VR lending" to show connected results.
