# Jarvis & Rael Pro Chat — Feature Description

**Primary route:** `/supervisor/chat`  
**Nav / product labels:** Chat · **Rael Pro Chat** · **Jarvis** (hub agent)  
**Surfaces:** full chat page, global header dock (mini-chat / mini-voice), ElevenLabs voice overlay  
**Backend:** Supabase Edge Function `chat` + hosted Supabase MCP (`read_only=true`) + OpenRouter LLM  
**Voice path:** ElevenLabs Conversational AI agent (browser ↔ ElevenLabs; data via ElevenLabs ↔ MCP)

---

## What it is

**Jarvis** is the hub "insights manager" of the Rael AI team: one place to ask plain-language questions about jobs, technicians, trucks, schedules, alerts, and compliance history — instead of digging through multiple screens/systems.

**Rael Pro Chat** is the in-app product surface for that capability: a persistent, multi-thread **text** assistant on `/supervisor/chat`, plus a floating **Jarvis dock** so supervisors can ask from other pages (especially Daily Dispatch) without leaving the map.

Jarvis also has a **spoken voice** mode (ElevenLabs). Voice and text share the same product intent (ops Q&A over live Facility19 data) but are **different runtimes** with different persistence and UX.

| Branding | Role |
|---|---|
| **Jarvis** | Agent hub identity — "ask across everything"; CTA opens Rael Pro Chat / voice |
| **Rael Pro Chat** | Full-page text chat UI (`PageWrapper` title: Chat) |
| **Rael Ops Voice** (`agent/jarvis.md`) | Voice-oriented system rules / SQL playbook for spoken answers |

---

## Product promise (business)

| Pain | What Jarvis / Rael Pro Chat does |
|---|---|
| Knowing the field means hopping WO lists, GPS, alerts, overtime, violations | Ask one question in English; get an answer grounded in live DB data |
| Hard to remember which agent owns which domain | Jarvis sits at the **center of the agent hub** and answers across those domains (read-only) |
| Dispatchers need answers while on the map | **Header dock** mini-chat/voice without leaving Daily Dispatch |
| Typing mid-ops is slow | Composer mic (realtime whisper) + full **Jarvis voice overlay** |

**Not a dispatcher:** Jarvis does **not** assign trips, dispatch trucks, or write checkouts. It **informs**; Daily Dispatch / UC mutations commit actions.

Disclaimer shown in UI: *"Rael Pro checks live fleet records. Verify results before dispatching crews."*

---

## Surfaces & how they relate

```
┌─────────────────────────────────────────────────────────────────┐
│  JarvisHeaderDock (global, most supervisor pages)               │
│    ├─ Mini chat panel  ──same chat API──▶  Edge `chat` stream   │
│    ├─ Mini voice panel ──▶ ElevenLabs (or Full voice)           │
│    └─ "Full" link → /supervisor/chat?c=<chatId> (+ warm cache)  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  /supervisor/chat  (Rael Pro Chat)                              │
│    ├─ Sidebar: chat list (create / select / delete / paginate)  │
│    ├─ Panel: welcome + streaming thread + composer              │
│    └─ ?voice=1 or mic → JarvisOverlay (ElevenLabs session)      │
└─────────────────────────────────────────────────────────────────┘
```

### 1. Full page — Rael Pro Chat (`/supervisor/chat`)

**Entry:** `src/screens/supervisor/Chat/index.tsx`  
**Active thread query param:** `?c=<chatUuid>`  
**Voice deep link:** `?voice=1` opens Jarvis overlay after load.

**UI capabilities:**

- Collapsible **sidebar** of the user's chats (keyset pagination, newest first).
- **New chat** → creates a `chats` row, selects it.
- **Draft welcome** (no `c` yet): greeting from email, centered composer, suggestion pills; first send creates chat + pending first message.
- **Conversation**: streamed assistant replies, markdown rendering, "working" bubble while tools/LLM run, stop generation.
- **Composer**: text send, stop, disclaimer, speech-to-text via OpenAI realtime whisper (`RealtimeTranscriber` → `transcribe` edge helper), button to open **Jarvis voice overlay**.
- Prefetch / warm cache when opening Full from mini-chat so the thread appears without a full cold load.

### 2. Global Jarvis header dock

**Mounted in** `App.tsx` as `JarvisHeaderDock`.  
**Hidden on:** `/supervisor/chat`, `/supervisor/fleet-map` (`JARVIS_HIDDEN_PATHS`).

**UI / interaction:**

- Collapsed stadium pill flush to top center; hover/focus morphs to expanded dock.
- Modes: **chat** panel | **voice** panel | closed.
- Dock is **draggable**; can snap toward home (top center); panel resizable (default ~440×560, mins enforced).
- Mini-chat shares the same `useChat` + `/chats/:id/stream` transport as the full page.
- Mini-chat keeps `chatId` across close/reopen until **New**.
- **Full** navigates to `/supervisor/chat?c=…` and calls `warmFullChatNavigation(chatId)` (prefetch messages + chat list).
- Suggestion chips in mini welcome: Open WOs, Idle techs, Today's schedule, Missed checkouts.

### 3. Jarvis voice (ElevenLabs)

**UI:** `JarvisOverlay.tsx` (full-page portal), `JarvisMiniVoice.tsx` (dock).  
**Config:** `src/api/elevenlabsApi.ts` — public agent id (`VITE_ELEVENLABS_AGENT_ID`), optional voice override flags.

**How it works technically:**

- Browser uses `@elevenlabs/react` `ConversationProvider` / `useConversation`.
- Agent is **public**: connect with agent id only (no browser API key / conversation token).
- **Prompt, tools, and LLM for voice are configured on the ElevenLabs platform**, not in the `chat` edge function.
- Data retrieval is **ElevenLabs server ↔ Supabase MCP** (browser is not in the SQL path).
- Overlay shows live transcript turns (user / ai), session clock, mute, speaking orb (audio loudness), disconnect/error handling.
- Canonical ops playbook for voice intent/SQL lives in `agent/jarvis.md` (intended to mirror what the ElevenLabs agent should do).

Voice sessions are **not** the same persistence model as Rael Pro text threads (`chats` / `chat_messages`).

---

## Text chat — technical architecture

### Edge Function `chat`

**Deploy:** `supabase/functions/chat` (JWT verified in-handler; gateway `--no-verify-jwt` for CORS).  
**Auth:** Supabase user JWT (`verifySupabaseUser`); all rows scoped with `user_id`.  
**DB client:** service role; ownership enforced in code + RLS owner policies on tables.

| Method | Path | Purpose |
|---|---|---|
| GET | `/chat/health` | Unauthenticated liveness |
| GET | `/chat/chats?cursor=&limit=` | List chats (keyset, max 50) |
| POST | `/chat/chats` | Create chat `{ title? }` |
| GET | `/chat/chats/:id/messages` | Full history oldest → newest |
| DELETE | `/chat/chats/:id` | Delete chat (messages cascade) |
| POST | `/chat/chats/:id/stream` | AI turn — AI SDK UI-message stream |

### Streaming turn (`stream.ts`)

1. Persist latest **user** message (`chat_messages`: `role`, `content`, `parts`).
2. If chat title is still `New chat`, derive title from first user text (≤60 chars).
3. Open **Supabase MCP** client (`MCP_URL` + `MCP_ACCESS_TOKEN`) via Streamable HTTP transport.
4. Load MCP **tools** (read-only project MCP).
5. `streamText` via **OpenRouter** (`CHAT_OPENROUTER_API_KEY`), model default `anthropic/claude-sonnet-4` (`CHAT_MODEL` override).
6. `stopWhen: stepCountIs(8)` — up to **8 tool/LLM steps** per turn.
7. Stream AI SDK **UI message** protocol to the browser (`@ai-sdk/react` `useChat` + `DefaultChatTransport`).
8. On finish: persist **assistant** message + bump `chats.updated_at`; close MCP (also on client abort).

If MCP env is missing, chat still runs **without tools** (answers degrade — no live lookup).

### Persistence schema

`supabase/migrations/20260615120000_chat_tables.sql`:

- `chats` — `id`, `user_id`, `title`, `created_at`, `updated_at`
- `chat_messages` — `id`, `chat_id`, `user_id`, `role`, `content`, `parts` (JSONB), `created_at`
- RLS: owner-only; anon/authenticated revoked at table level for direct client abuse paths (app uses edge + service role with explicit scoping).

### Frontend client

- `src/api/chatApi.ts` — CRUD + `chatStreamUrl` + auth headers.
- `src/store/chatStore.ts` — list/create/delete/touch.
- `chatMessageCache.ts` — in-memory UIMessage cache, prefetch, pending first message across draft→real id remount, warm navigation, overlay prefetch.

---

## How answers are grounded (tools & data)

### Tooling model

Text path tools = whatever the hosted Supabase MCP exposes in **read-only** mode for project `fdvwsskdrgwwbljxxiku`. In practice Jarvis/voice docs center on **`execute_sql`** (and related read MCP tools). There is **no** Facility19 write tool for assign/dispatch/checkout from chat.

Golden rules (voice playbook + chat system prompt):

- Look up live data with tools **before** answering; do not guess.
- **Read only** — never insert/update/delete.
- Prefer one SQL call when possible; use `LIMIT` for lists.
- Speak in plain English; **never** mention SQL/tables/MCP to the user (especially voice).
- Times in **America/New_York** (EDT/EST).

### Domains Jarvis can answer across (capability map)

These map to the other agents' *data*, not to invoking those agents as subprocesses:

| Domain | Typical questions | Primary tables / sources |
|---|---|---|
| Work orders / sites | Open WOs, WO by number, jobs at an address, ITM vs repair vs emergency | `work_orders` (+ ITM_WHERE rules) |
| Schedule / dispatch visits | Today's trips, who's booked, trip status | `work_order_trips`, `work_order_assignments` |
| Check-in / check-out history | Did they clock in/out, forgotten checkout | `work_order_trip_services` (preferred history), assignment `check_in_at` / `check_out_at` |
| Live truck location | Where is Alex right now? | `live_vehicle_telemetry` via `technician_vehicles` |
| GPS history | Where was the truck yesterday? | `vehicle_location_history` (heavy; optional) |
| Molly checkout compliance | Missed checkouts / leave-site alerts | `checkout_compliance_alerts`, `molly_watch_sessions` |
| Iris idle | Who idled / idle alerts today | `technician_idle_alerts` |
| Vera violations | FDNY hearing / compliance | `violations_master_tracker` |
| Roster | Active maintenance techs (default), fire pump when asked | `technicians` (`is_active`, `employee_type`) |
| Audit / freshness | Who assigned from app; is sync fresh | `admin_audit_log`, `sync_log` |

Default people scope (voice playbook): **`is_active = true AND employee_type = 'maintenance'`** unless caller asks for fire pump / everyone.

### Built-in suggestion prompts (product-facing feature points)

Shared across full welcome + mini-chat:

1. How many **open work orders** today across the portfolio?
2. Which **maintenance technicians are idle** right now?
3. What's on **today's schedule** (booked vs completed)?
4. Which techs have **missed checkouts** / not checked out today?

### Intent patterns the playbook optimizes for

From `agent/jarvis.md` (voice; text LLM + MCP can cover the same facts if prompted well):

- ITM / inspection / annual counts and open ITMs (trade_names `I, T & M` / Fire Sprinkler Inspection — not Building Inspection alone).
- Repair / emergency call types.
- Location search across address, site name, client name.
- Compound: "Where is X and what job is he on?" (GPS + open check-in today).
- Overdue ITM (expiration before today ET, still open).
- Alert counts by Eastern calendar day.
- Scheduled vs actual: free windows from **scheduled** trip times; arrive/leave from **trip services**.

### Tables voice playbook says to avoid unless explicitly asked

`chats`, `cached_tokens`, `dispatch_queue`, `dispatch_suggestions`, `ftj_*`, `extended_job_pool`, `dashboard_cache`, `uc_proposals` (unless proposals asked by name).

---

## What Jarvis / Rael Pro Chat can do (feature checklist)

### Can do

- Multi-turn **text** Q&A with streaming responses.
- Per-user **thread history** (create, list, open, delete).
- Resume the same thread from **mini-chat ↔ full page**.
- Multi-step tool use (up to 8 steps) against **read-only** Supabase MCP.
- Answer live + historical ops questions across WO, trips, GPS, Molly, Iris, violations, roster.
- Suggestion chips / welcome hero for common ops questions.
- Speech-to-text into the composer (whisper realtime path).
- Full-screen **spoken** Jarvis session (ElevenLabs) with transcript UI.
- Dock UX: drag, resize panel, morph open/close, mode switch chat/voice.

### Cannot do (current architecture)

- **Write** to UtilizeCore / Rael Redi (no assign, no dispatch now, no manual checkout).
- Run Molly/Iris **calling** or sequenced manager chains.
- Approve Harvey / Job Scheduling **suggestions**.
- Guarantee answer correctness when UC/IS sync is stale (same data lag constraints as the rest of the app — UI tells users to verify before dispatching).
- Persist ElevenLabs voice turns into `chats` / `chat_messages` (text and voice are separate).
- Answer reliably if MCP secrets are unset (tools absent).
- Act as a general-purpose chatbot outside fleet/WO/tech scope (system prompt steers politely away).

---

## System prompts — two layers (important technical detail)

| Path | Where prompt lives | Character |
|---|---|---|
| **Text chat** | `supabase/functions/chat/stream.ts` → `SYSTEM_PROMPT` | Embedded field ops assistant; short spoken English; use tools; no SQL jargon; Eastern times; list all matching items when asked for a set |
| **Voice** | ElevenLabs agent config + repo playbook `agent/jarvis.md` | Stricter voice rules (1–4 sentences, filler "One moment…", detailed SQL templates, maintenance default filter, table routing live vs past) |

They are **aligned in intent** (read-only ops Q&A) but **not one shared runtime**. Changes to `agent/jarvis.md` do not automatically change the `chat` edge prompt or ElevenLabs dashboard until those are updated separately.

---

## How it helps the business (feature → value)

| Capability | Business value |
|---|---|
| Cross-domain Q&A | Faster situational awareness for supervisors and owners |
| Live GPS + current job | Answer "where is he / what's he on" without opening the map |
| Schedule + completion counts | Morning / midday portfolio pulse |
| Checkout / idle alert lookup | Compliance visibility without opening Molly/Iris screens |
| ITM / overdue / site search | Inspection backlog and site history in seconds |
| Dock on Daily Dispatch | Ask while dispatching — fewer context switches |
| Voice mode | Hands-busy / phone-style ops questions |
| Read-only design | Safe for broad supervisor access; cannot corrupt UC trips via chat |

---

## Key file index

| Path | Role |
|---|---|
| `src/screens/supervisor/Chat/index.tsx` | Full chat page shell |
| `src/screens/supervisor/Chat/ChatPanel.tsx` | Welcome, draft, conversation, streaming |
| `src/screens/supervisor/Chat/ChatListSidebar.tsx` | Thread list |
| `src/screens/supervisor/Chat/ChatComposer.tsx` | Input, STT, voice overlay trigger |
| `src/screens/supervisor/Chat/JarvisOverlay.tsx` | ElevenLabs full voice UI |
| `src/components/jarvis/JarvisHeaderDock.tsx` | Global dock |
| `src/components/jarvis/JarvisMiniChat.tsx` | Dock text chat |
| `src/components/jarvis/JarvisMiniVoice.tsx` | Dock voice |
| `src/components/jarvis/jarvisLauncherUi.ts` | URLs, hidden paths, dock tokens |
| `src/api/chatApi.ts` | Chat HTTP client |
| `src/api/elevenlabsApi.ts` | Voice agent id / voice config |
| `supabase/functions/chat/*` | Edge CRUD + stream + MCP bootstrap |
| `supabase/functions/chat/README.md` | Deploy / secrets |
| `agent/jarvis.md` | Voice SQL / intent playbook |
| `src/screens/supervisor/Agents/agentsCatalog.ts` | Jarvis hub marketing + routes |

---

## Relationship to other products

| Product | Relationship to Jarvis |
|---|---|
| **Daily Dispatch / Dex** (`/supervisor/rael`) | Dock lives here; Jarvis answers questions, Dex commits assign/dispatch |
| **Molly / Iris / Vera / Ava / Dawn / Harvey / Cora** | Jarvis can **query their data domains**; does not replace their workflows |
| **Job Scheduling** | Not the primary tool surface; suggestion tables generally avoided unless asked |

---

*Based on current Facility19 implementation of Jarvis (dock + voice) and Rael Pro Chat (`/supervisor/chat` + `chat` edge function). For Daily Dispatch map capabilities, see `rael-daily-dispatch-feature.md`.*
