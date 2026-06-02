# Kiruvo — Categorical Sweep Checklist

This is the running hard-gate checklist for the premium UI sweep. Pair it with `EMERGENCE.md`, which lists the 50 architecture properties already promised.

## Interaction polish

- [x] Sidebar no longer expands and collapses on hover.
- [x] Collapsed sidebar keeps navigation available with magnetic hover labels.
- [x] Active sidebar item keeps the strong selected background; passive hover stays lighter.
- [x] Task detail opens inline from row selection.
- [x] Task edit stays inline instead of opening a modal.

## Modal / sheet consistency

- [x] Forms embed moved to sheet workspace.
- [x] Contact email, activity, submission, and call flows moved to sheets.
- [x] AI agent creation moved to sheet workspace.
- [x] Content Hub quick send moved to sheet workspace.
- [x] Automation workflow creation moved to sheet workspace.
- [x] Automation node configuration moved to sheet workspace.
- [x] Shared Sheet styling upgraded globally for future sheet-based flows.

## Calls and voice safety

- [x] Contact call button opens a confirmation sheet before any backend call request.
- [x] Call copy now says "queue" instead of implying the user must sit through a live call.
- [x] Access checks happen before the queue request is sent.

## Tasks and insights

- [x] Removed "Generate insights" language from task surfaces.
- [x] Reduced task intelligence to a small secondary pulse, not the page focus.
- [x] Markdown output uses the approved `MarkdownText` component.

## Automations

- [x] Webhook node is surfaced from the integration picker.
- [x] Integration picks now open their setup sheet immediately.
- [x] Webhook, email, SMS, calendar, Slack, and Google Sheets integrations have first-pass setup fields.
- [ ] Executor support should be verified end-to-end per integration as real connector credentials become available.

## Agent creator

- [x] Agent creation form uses softer input focus states.
- [x] Sheet migration keeps the form in the shared interaction layer for future blanket upgrades.

## Files to know

- `EMERGENCE.md` — 50 emergent properties list.
- `CATEGORICAL_SWEEP.md` — this implementation and QA checklist.
- `scripts/propagation-audit.ts` — automated string/style propagation audit.
