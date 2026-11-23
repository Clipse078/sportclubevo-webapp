# SCE shared writing engine (wave 1)

## Scope (this PR)

- **`SceWritingEngine`** — one TipTap mount for controlled (Aufgabe) and Yjs-collaborative (Dokumentation) modes.
- **Wave 1 surfaces:** Dokumentation draft editor, Aufgabe description (create + detail).
- **Shared behavior:** StarterKit profiles, link validation + Strg+K, paste HTML cleanup (Word / Google Docs), `@mentions` mark, toolbar primitives.

## Out of scope

- `/` insert menu and richer blocks (next PR).
- Shared **Aktivität** / comment threads (separate workstream).
- CMS `RichTextEditor`, personal signatures (later rollout wave).

## Rollout order

See `SCE_WRITING_ENGINE_SURFACE_ROLLOUT` in `lib/sce-writing/sce-writing-rollout.ts`.

## Content format

All wave-one editors persist **TipTap JSON** compatible with `RichTextValue` (`lib/cms/rich-text.ts`). Aufgabe keeps plain-string legacy storage via `lib/tasks/task-description.ts`. Dokumentation draft `contentJson` remains canonical for publish + mentions.