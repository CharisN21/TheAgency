# Phase 1 — projects, tasks and objectives

Read this before building Phase 1. The design system's Phase 1 boards (Project-01 to Project-07) show the look; this file adds what Charis asked for on 25 Sep 2026, which changes how tasks are shaped.

## What changed

The boards treat a task as something inside a project. Charis also wants to see, for each person on the team, **their own tasks and their objectives for the week, the month and the year**, on their member page (`/team/[id]`). That page already exists and shows their people, deals, organisations and recent activity; its last band says tasks and objectives arrive with Phase 1. This phase fills that band in.

## Tasks

- A task has: title, status, due date, priority, **who it is for** (one member), who created it, and optional links.
- Status, as in the boards: to do, in progress, in review, done, blocked. Each status carries its word, never colour alone.
- **A project is optional.** A task can stand alone, or link to a project, an organisation, a deal or a person. "Call Mercy about the band 3 price" belongs to the Vision Safety deal, not to a project.
- It shows up in three places: the project (when it has one), the record it links to (organisation or deal timeline), and the member page of the person it is for.
- Anyone who can edit can create a task for themselves. Assigning to someone else follows the plan's rule: the app never assigns anyone automatically; a person does it, and AI only suggests.
- "Require a deadline on every task" stays a workspace setting (see the boards).

## Objectives

- An objective has: title, **period** (week, month, year), the period's start date, who it is for, a target and progress, and an optional link to a deal, organisation or project.
- Progress is either a number against a target (for example KSh 1,000,000 won this month, 12 of 20 suppliers visited) or done / not done.
- Where the app can count it, it does, for example "won this month" from deals. Otherwise the person updates it.
- Week, month and year sit together on the member page, current period first, with past periods kept for the weekly recap (Phase 6 already plans "next week's objectives" in the recap).
- A member sets their own objectives. Owners and admins can set objectives for anyone.

## Who sees what

Settled 25 Sep 2026, already how the member page works (`can.viewMember`):

- Owners and admins open anyone's member page, with its tasks and objectives.
- Members and viewers open only their own.
- Tasks linked to a shared record (a deal, an organisation) are also visible on that record to everyone in the workspace, the same as the record itself. Objectives are only ever shown on the member page.
- Private flags keep their own rule: the person who raised them, and owners and admins.

## Data

New tables, each with `workspace_id` and Row-Level Security like the rest: `projects`, `tasks` (with nullable `project_id`, `organisation_id`, `deal_id`, `contact_id`), `objectives`. Nothing existing changes or is lost.
