# UX Guidelines

Torre de Control is used at desks, on tablets on the wards and on **wall displays** in the Admissions office. Design for glanceability first.

## Layout

- App shell: collapsible **left sidebar** (areas), **top bar** (hospital status level, simulated clock + simulator controls, alert bell with count, current user/role), **main content**.
- Every dashboard follows the same vertical order:
  1. **KPI strip** — 4–6 tiles with the headline numbers, each with target/threshold and trend vs. same time yesterday.
  2. **Exceptions** — "Necesita atención": items breaching SLA or thresholds, sorted by severity then age.
  3. **Main view** — the operational board (bed map, ED board, queue, timeline).
  4. **Trends** — charts for the last 24 h / 7 days.
- **Responsive:** desktop ≥ 1280 px is primary; tablet (768–1279 px) must be fully usable; phone shows KPIs and exceptions only.
- **Wall mode (Modo pantalla)**: full-screen, no sidebar, larger type, auto-rotates between dashboards every N seconds (configurable), dark theme by default.

## Colour Semantics

Colour always carries meaning, never decoration. Every colour is paired with a text label or icon (colour-blind safe).

| Meaning | Token | Use |
|---|---|---|
| OK / available | `--status-ok` (green) | Free beds, within target |
| Attention | `--status-warn` (amber) | Approaching target, pending cleaning |
| Critical | `--status-critical` (red) | Breached SLA, critical alerts |
| Info / in progress | `--status-info` (blue) | Reserved, in transit, cleaning |
| Neutral / blocked | `--status-neutral` (grey) | Blocked beds, off shift |

Bed status colours: Libre = ok, Reservada = info, Ocupada = neutral-strong, Pendiente de limpieza = warn, En limpieza = info, Bloqueada = neutral.
Manchester triage colours (fixed, clinical convention): L1 red, L2 orange, L3 yellow, L4 green, L5 blue — always shown with the number.

Light and dark themes; both must meet WCAG 2.1 AA contrast.

## Typography & Numbers

- Sans-serif system stack or Inter; **tabular numerals** for all figures.
- KPI value large (≥ 32 px desktop, ≥ 56 px wall mode); label above, context below ("objetivo ≤ 4 h", "▲ 3 vs ayer").
- Durations human-readable in Spanish: "2 h 15 min", "hace 12 min". Times in 24 h format.

## Interaction

- Real-time updates must not cause layout jumps; animate value changes subtly (≤ 300 ms) and highlight changed rows briefly.
- Actions (reserve bed, assign porter) use a side sheet or dialog with a clear confirmation; show the resulting event in a toast ("Cama 512-A reservada para J. García").
- Every list is filterable by unit/specialty and sortable; filters persist per user (localStorage, wrapped in try/catch).
- Empty states explain what would appear and why there is none ("No hay pacientes pendientes de ingreso 🎉" is acceptable; keep tone professional).
- A permanent, discreet banner: **"Entorno de demostración — datos ficticios"** in the MVP.

## Copy

- Spanish (es-ES), professional, concise, hospital vocabulary from `specs/domain.md` glossary.
- All strings in `src/i18n/es.ts`. No hard-coded user-facing strings in components.

## Accessibility

- Keyboard navigable; visible focus; ARIA from Radix/shadcn primitives.
- Charts have a text/table alternative.
- `prefers-reduced-motion` disables animations.
