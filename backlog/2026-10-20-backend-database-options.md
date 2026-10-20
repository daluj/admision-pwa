# Research: Backend & Database Options After the MVP

**Status:** Recommendation — to be turned into an ADR in roadmap Phase 15 and validated with hospital IT.

## The real question

"Postgres or Supabase?" is not either/or: **Supabase *is* PostgreSQL** plus a set of services around it (auto-generated REST API via PostgREST, Realtime, Auth, Storage, Edge Functions, Studio UI). The real choices are:

1. **Where does the database run?** (hospital / regional infrastructure vs. a public cloud)
2. **How much backend do we build ourselves?** (Supabase services vs. a custom API)
3. **Where does the data come from?** (almost certainly *not* the HIS database directly)

## Point 3 first: "the hospital's own relational database"

The hospital's core data lives in its **Hospital Information System (HIS)**. In practice an app like Torre de Control is **not** allowed to read/write the HIS database directly: the vendor schema is undocumented/unsupported, direct queries put load on a critical system, and IT will refuse write access. The normal pattern is:

```
HIS ──HL7 v2 ADT / FHIR──▶ Integration engine (hospital's) ──▶ Ingestion service ──▶ Torre de Control DB (PostgreSQL)
                                                                      │
                                                         maps messages → HospitalEvent
```

So Torre de Control will need **its own operational database**, fed by events. This is exactly why the MVP is event-first: the simulator produces the same `HospitalEvent`s the ingestion service will produce from ADT messages (A01 admit, A02 transfer, A03 discharge, A04 register, A08 update, A11 cancel admit…). Some read-only reference data (units, beds, specialties) may come from a replica or data warehouse the hospital already has.

## Options

| | A. Supabase Cloud (EU region) | B. Supabase self-hosted on hospital infra | C. Plain PostgreSQL + custom API |
|---|---|---|---|
| Database | Managed Postgres | Postgres (Docker/K8s) operated by IT | Postgres operated by IT |
| Realtime | Built in | Built in | Build it (WebSocket/SSE + `LISTEN/NOTIFY`) |
| API | Auto (PostgREST) + RLS | Auto (PostgREST) + RLS | Write it (e.g. Node/Hono or Python/FastAPI) |
| Auth | Built in; SSO available | Built in; SSO with hospital IdP to be verified | Integrate IdP yourself (OIDC/SAML) |
| Patient data residency | Third-party cloud: needs contract, DPIA, ENS assessment — likely blocked for real data | On hospital/regional infra ✅ | On hospital/regional infra ✅ |
| Ops burden for IT | Low | Medium–high (many containers) | Medium (Postgres + one service) |
| Speed to build | Fastest | Fast | Slowest |
| Lock-in | Low (it's Postgres) | Low | None |

Legal/compliance context (Spain, public hospital): health data is a special category under GDPR art. 9 and LOPDGDD; public sector systems must comply with the **Esquema Nacional de Seguridad (ENS)**; IT for Comunidad de Madrid hospitals is probably managed or overseen by the regional digital agency. These constraints usually rule out public-cloud hosting of identifiable patient data unless the provider is approved.

## Recommendation

**PostgreSQL as the system of record, Supabase as the accelerator, the repository ports as the escape hatch.**

1. **Phase 15–16 (pilot/staging with synthetic data):** use **Supabase** — Cloud EU for speed or self-hosted via Docker — to get Realtime, RLS and the API for free. Write the schema as plain SQL migrations (no Supabase-only features in the domain), keep RLS policies in SQL.
2. **Production with real data:** **self-hosted Supabase or plain PostgreSQL on hospital/regional infrastructure**, decided with IT. If IT accepts the Supabase stack, keep it. If not, replace only the adapter with a thin API (Node/Hono or FastAPI) + `LISTEN/NOTIFY` realtime — domain, UI and simulator don't change because they depend on the ports, not on Supabase.
3. **Never** put real patient data in Supabase Cloud or any public cloud without a signed processing agreement, DPIA and ENS sign-off from the hospital.

## Why this keeps options open

- UI ↔ `data/ports` ↔ adapter (`dexie` → `supabase` → `http`) — swapping storage is an adapter change plus contract tests.
- Zod schemas validate data at the boundary in every adapter.
- `HospitalEvent` table maps 1:1 to an append-only Postgres table; current-state tables are projections (could become materialised views).

## Open questions for hospital IT

- Is there an integration engine and can it publish ADT (and which events/segments) or FHIR resources to a new consumer?
- Hosting options: on-prem VM/Kubernetes, regional data centre, approved cloud?
- Identity provider for SSO (Active Directory / Entra ID? OIDC or SAML?)
- Required ENS category and logging/audit requirements.
- Is there a read replica / data warehouse with units, beds and specialties?
