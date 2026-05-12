# AI-Assisted UI Design Workflow for MyPets

**Status:** Approved (pending user review of this written spec)
**Date:** 2026-05-12
**Author:** Brainstorm session with Claude Opus 4.7
**Scope:** Establishes how mockups and per-screen specifications are produced for the MyPets app using AI assistance, without polluting the production codebase. First application: the 4 MVP screens.

## Motivation

MyPets needs visual designs and per-screen specifications before agents can implement features. Doing this through ad-hoc prompts produces specs that are inconsistent, mockups that invent components and colors not in the design system, and code edits that leak design exploration into production files. The goal is a repeatable workflow that:

1. Produces high-quality screen specifications committed under `docs/specs/`, durable enough that an agent can implement a screen end-to-end from one spec with minimal supervision.
2. Generates throwaway visual mockups for stakeholder reaction without polluting `app/`, `components/`, `lib/`, `constants/`, or `hooks/`.
3. Establishes explicit hand-off rules so implementation sessions (separate from brainstorm) consume specs predictably.

## Stack baseline

This workflow assumes the following project state, established before brainstorm:

- Expo SDK 54, React Native 0.81, React 19, expo-router v6, New Architecture, React Compiler.
- TypeScript strict, `@/*` alias to project root.
- **NativeWind v5 (preview)** installed for Tailwind-based styling. Custom theme tokens live in `global.css` under a `@theme` block.
- Lint, Prettier, Husky + lint-staged active; pre-commit hook runs ESLint and Prettier on staged files.
- SQLite data layer in `lib/` with file-per-migration auto-discovery and tracking tables. Conventions in `lib/CLAUDE.md`.
- Existing primitives `ThemedText`, `ThemedView`, and the `/new-themed-component` skill are kept in place during the brainstorm. They will be deprecated organically as screens migrate to `className`-based styling during implementation.

## File layout & lifecycle

```text
.superpowers/brainstorm/<session>/content/    ← mockups HTML (gitignored, ephemeral)
docs/superpowers/specs/                       ← brainstorm output (this file lives here)
docs/specs/
├── 00-overview.md                            ← intent paragraphs for all MVP screens
├── 01-<screen>.md                            ← full spec (~150 lines) per screen
├── 02-<screen>.md
├── 03-<screen>.md
└── 04-<screen>.md
```

`.superpowers/` is already listed in `.gitignore`. Mockup HTML is never committed. Specs are committed individually as each screen is approved.

Note the two distinct spec locations:

- `docs/superpowers/specs/` holds **workflow-level design** (this document). Reviewed once.
- `docs/specs/` holds **per-screen specifications** produced by the workflow. Reviewed per screen.

## Workflow phases

### Phase 0 — Intent batch (one-time, upfront)

1. Claude proposes an intent paragraph for each of the 4 MVP screens. An intent paragraph contains:
   - **Purpose:** one or two sentences on what the screen does and why it exists.
   - **Primary user/role:** who interacts with this screen.
   - **Entity touched:** the SQLite table(s) read or mutated.
   - **Main user action:** the single most important interaction on the screen.
2. User reviews the set and approves or requests adjustments to scope, naming, or ordering. Iteration is in terminal — no mockups yet.
3. Once the set is approved, Claude writes and commits `docs/specs/00-overview.md`. Structure of the overview:
   1. Header (1 paragraph): project context, MVP framing, how to read the per-screen specs.
   2. The 4 approved intent paragraphs, one per screen, ordered by intended implementation order.
   3. Seed theme tokens to be added to `global.css` before Phase 1 begins (a small palette — primary, foreground, background, plus feedback colors).
4. **Gate:** no per-screen work begins until the overview is committed AND the seed tokens are committed to `global.css`.

The theme grows from this seed iteratively in Phase 1+; the overview is not re-edited as the theme expands.

### Phases 1 through N — Per-screen mockup → spec

Each MVP screen follows the same loop:

1. **Mockup HTML** is written to `.superpowers/brainstorm/<session>/content/<screen>.html`. The visual companion serves the newest file. The mockup uses inline styles with hex values that **mirror the tokens defined in `global.css`'s `@theme` block**. The mockup is static; it shows layout and visual hierarchy, not interactivity.
2. User reacts via the browser (clicks) or terminal (comments). Claude iterates by writing new versioned files (`<screen>-v2.html`, `<screen>-v3.html`).
3. Once the user approves the mockup visually, Claude writes the full spec to `docs/specs/0N-<screen>.md` following the template in the next section.
4. User reviews the spec. Because the visual is already approved, this is typically a quick pass focused on data, interactions, accessibility, and out-of-scope items.
5. Claude commits the spec. Mockup HTML stays in `.superpowers/` and never enters git.
6. If new theme tokens were identified during this screen, Claude adds them to `global.css` and commits the change separately from the spec (one concern per commit).
7. Next screen.

**Gate:** no implementation work begins until all 4 specs are committed.

## Spec template (~150 lines per screen)

Each `docs/specs/0N-<screen>.md` follows this structure. Sections appear in this order.

### Front-matter (metadata table)

```markdown
| Status | Draft / Approved / Implemented |
| Route | app/(tabs)/index.tsx (tab) |
| Depends on | — / 03-pet-form |
| Tables touched | pets |
```

`Status` is updated in the spec file itself as the screen moves through the lifecycle.

### Sections

1. **Purpose** — one to three sentences: why this screen exists, who uses it, when.
2. **Wireframe** — ASCII art with regions annotated. ASCII is sufficient for most layouts. If a layout is genuinely too complex for ASCII to convey, add a short prose description below the ASCII referencing the approved mockup file by name (knowing the file itself is gitignored).
3. **Components**
   - **Existing primitives reused:** `<View>`, `<Pressable>`, `<ScrollView>`, etc., with the Tailwind classes that will be applied (e.g., `bg-background p-4 rounded-lg`).
   - **New components to create:** name, primitive base, and one-line purpose. To be created via `/new-themed-component` during implementation only if encapsulating behavior; pure styling wrappers are not new components.
   - **New theme tokens needed:** list of `@theme` tokens not yet in `global.css`, with proposed name and value. To be added during implementation.
4. **Data**
   - **Queries:** parameterized SQL, referencing types in `lib/db-types.ts`.
   - **Mutations:** INSERT/UPDATE/DELETE with the trigger that fires them.
   - **Migrations required:** the `/db-migration "..."` commands to run, if any.
5. **Interactions** — table of `Trigger | Action`. Covers taps, long-presses, gestures, form submissions, navigation.
6. **States** — table of `State | When | UI`. Always includes empty, loading, and error. Add screen-specific states as needed.
7. **Accessibility** — explicit `accessibilityLabel`, `accessibilityRole`, heading hierarchy, hit target sizes. Bullet list.
8. **Out of scope** — features that are NOT part of this screen. Prevents the implementing agent from inventing functionality.
9. **Implementation checklist** — ordered list of skill invocations and edits, e.g.:

   ```markdown
   - [ ] /db-migration "create pets table"
   - [ ] Add tokens `--color-card` and `--color-card-foreground` to global.css
   - [ ] (Optional) /new-themed-component PetCard Pressable — only if encapsulating press behavior beyond inline className
   - [ ] Add MAPPING entry for `plus.circle.fill` → `add-circle` in components/ui/icon-symbol.tsx
   - [ ] Replace content of app/(tabs)/index.tsx with the JSX described above, using className for styling
   - [ ] Validate: npm run lint, npm run typecheck, npm run start (manual smoke test)
   ```

   Plain markdown checkboxes. The checklist is the bridge from spec to implementation — an agent reading this knows exactly what commands to invoke and in what order.

## Anti-pollution rules

These rules apply during the brainstorm. They exist to prevent the design exploration from contaminating the production codebase.

1. **No edits to `app/`, `components/`, `lib/`, `constants/`, or `hooks/` during brainstorm.** Mockups produce nothing in these directories. Specs reference existing primitives by name. Code edits happen only in implementation sessions, one screen at a time, against an approved spec.

2. **Mockups are HTML files in `.superpowers/`.** They never import React Native, never use JSX, and never live anywhere git tracks. Translation to RN code happens at implementation time, guided by the spec.

3. **Mockups consume theme tokens by hex value that mirrors `global.css`.** If `--color-primary: #0a7ea4` is defined in the `@theme` block, the mockup uses `color: #0a7ea4` inline. The mockup is a stand-in for what Tailwind will produce; the spec is responsible for translating the visual into Tailwind classes referencing the actual tokens.

4. **New components and new tokens are flagged in the spec, never created during brainstorm.** If a mockup shows a `<PetCard>`, the spec lists it under "Components → New". If a mockup uses a shade that doesn't exist yet, the spec lists the new token under "Components → New theme tokens needed".

5. **Mockup HTML is never committed.** `.superpowers/` is in `.gitignore`. If someone later asks "how did this screen look in the mockup?", the answer is "open the spec; the spec is the contract, the mockup was a draft."

6. **Tokens are the single source of truth for color and spacing values.** They live in `global.css`'s `@theme` block. Components access them via Tailwind classes (`bg-primary`, `text-foreground`). React JS code does not import hex literals; if a JS-side color value is truly needed (rare — e.g., StatusBar's `backgroundColor` prop on native), inline the hex with a comment noting which token it mirrors, e.g. `backgroundColor="#0a7ea4" /* matches --color-primary in global.css */`. If many such JS-side accesses accumulate, generate `constants/theme-tokens.ts` from `global.css` and use that instead.

## Theme work in parallel

The custom theme is not designed upfront. It grows iteratively as the screens are mocked up:

- **Seed:** the existing `Colors.tint` value (`#0a7ea4`) is already mapped as `--color-mypets-tint` in `global.css`. Phase 0's overview names additional seed tokens (e.g., a primary, neutral foreground/background, success/danger feedback colors) that will be added on the first iteration.
- **Growth:** each screen's spec may declare new tokens needed. They are added to `global.css` during the implementation of that screen. Tokens are not added during brainstorm.
- **No "theme done" gate.** The theme is alive; it stabilizes when the MVP screens are all implemented. After MVP, deliberate review of token coherence is reasonable but out of scope here.

## Hand-off to implementation

When all 4 MVP specs are committed, brainstorm ends. Implementation happens in **separate sessions, one screen per session**, never multiple screens at once.

An implementation session follows this procedure:

1. Read `docs/specs/00-overview.md` for context on the entity model and the MVP as a whole.
2. Read the specific screen spec (`docs/specs/0N-<screen>.md`).
3. Read `lib/CLAUDE.md` if the spec's implementation checklist references migrations or DB-layer concerns.
4. Execute the Implementation checklist top to bottom, using the project's skills:
   - `/db-migration "..."` for any schema change.
   - `/new-themed-component <Name>` for any genuinely new component (with the caveat that for v5 most "components" are inline `className` and don't need scaffolding).
   - Direct `Edit`/`Write` for screen file changes and `global.css` token additions.
5. Validate: `npm run lint`, `npm run typecheck`, and a manual smoke test (`npm run start`, open the app, exercise the new screen on at least one platform).
6. User reviews the implementation against the spec. The agent does not commit until the user approves.
7. Commit with a clear message referencing the spec file.

## When the spec needs to change during implementation

The spec is the source of truth. Reality during implementation sometimes diverges:

- **Trivial divergence** (variable renames, micro-layout tweaks the spec didn't pin down): the agent makes the change and notes it in the commit message. The spec is not edited.
- **Non-trivial divergence** (new field, new state, new interaction, removed feature): the agent **stops implementation**, commits an update to the spec first, then continues. This guarantees specs and code stay in sync — agents in later sessions can trust the spec.

The Status front-matter field of each spec is updated as the spec moves through its lifecycle (Draft → Approved → Implemented).

## Out of scope for this workflow design

These are explicit non-goals, documented to constrain the implementation plan that will follow this design:

- Defining the actual 4 MVP screens. That is Phase 0 work, not workflow design.
- Designing the full theme. The theme grows screen-by-screen.
- Deprecating `ThemedText`, `ThemedView`, or the `/new-themed-component` skill. They are tolerated during the transition; cleanup is post-MVP.
- Designing animations, transitions, or motion. Out of MVP scope.
- Web-specific UX considerations beyond the static export already working. Mockups target the native form factor; web behavior is whatever the same JSX renders.
- Internationalization. PT strings are inline for MVP. i18n is a separate later concern.

## Risks and mitigations

| Risk                                                                                | Mitigation                                                                                                                                                      |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NativeWind v5 preview lands a breaking API change before MVP completes              | Pin `nativewind@5.0.0-preview.3` in `package.json` (already pinned via lockfile). Re-evaluate when v5 stable releases.                                          |
| ASCII wireframes lose fidelity vs the approved mockup, leaving the agent guessing   | Spec author writes prose for non-obvious regions; agent asks the user for clarification rather than inventing if uncertain.                                     |
| Theme grows ad-hoc and ends up inconsistent                                         | After the 4 MVP screens are implemented, schedule a deliberate review of the token set; consolidate before the next batch of screens.                           |
| Mockup-to-spec translation introduces unintended invention                          | Every mockup-to-spec translation goes through user review. The Implementation checklist makes invented components/tokens explicit, surfacing them for approval. |
| A spec is implemented and the screen later needs changes the spec didn't anticipate | Update the spec via the "non-trivial divergence" rule before changing code. Status field reflects the iteration.                                                |
