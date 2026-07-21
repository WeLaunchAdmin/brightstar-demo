# Daily Dispatch (`/supervisor/rael`) — Feature Description

| | |
|---|---|
| **Route** | `/supervisor/rael` |
| **Nav label** | Daily Dispatch (bottom bar: *Live*) |
| **Page title** | Rael |
| **Agent branding** | Dex — Daily Dispatch / "Rael Control Tower" |
| **Primary screen** | Live map control tower for same-day field operations |

---

## What It Is

Daily Dispatch is the live operations console for Rael field dispatch. It puts trucks, technicians, open work, and same-day schedules on one map so supervisors can see who is free, who is nearby, and send someone to a job without jumping between multiple apps.

In product language, this is **Dex**: take an emergency or open job from "hours of toggling tools" down to minutes on one screen — job location, nearest worker, drive time, assign / dispatch.

> It is **not** the Job Scheduling suggestion engine (Harvey / Schedule Survey). That lives on a separate page. Daily Dispatch is the live map + manual assign + dispatch-now surface.

---

## What It Does (Core Purpose)

- **Show the field live** — IntelliShift truck GPS, technician status, and today's Rael Redi / UtilizeCore trips.
- **Show the day's work** — scheduled work orders for an Eastern calendar day on the map.
- **Find the right tech fast** — nearby technicians ranked by ETA / distance / availability for an address or work order.
- **Fill open queues** — Site Survey, Service Call, FDNY Survey, and repair material queues.
- **Assign and push to the app** — schedule a tech on a trip in UtilizeCore / Rael Redi, and optionally *Dispatch now* so it hits the tech's mobile workflow.
- **Surface compliance at a glance** — check-in / check-out, idle, and Molly checkout-alert states on map pills (visibility only; calling is handled elsewhere).

---

## How It Works (High Level)

```
IntelliShift (live GPS)  ──┐
                           ├──▶  Daily Dispatch map (/supervisor/rael)
UtilizeCore / Rael Redi  ──┘         │
  (WOs, trips, check-in/out,         ├── Nearby ranking (ETA / miles)
   assign, dispatch_now)             ├── Open job queues
                                     └── Assign + Dispatch now → UC write
```

| Layer | Source | Role on this page |
|---|---|---|
| Live trucks | IntelliShift telemetry (`/fleet/dashboard`) | Where people are right now |
| Work orders / trips | UtilizeCore / Rael Redi (via supervisor APIs) | What jobs exist, who is on them, check-in/out |
| Nearby ranking | Live GPS + schedules + ETA (Distance Matrix / estimate) | Who should go next |
| Assign / Dispatch | UC write (`assign-technician`, `dispatch_now`) | Commit the decision into the field system |

> Map WOs, tech "today's trips," and open queues are related but separate data paths — a tech's day list, the scheduled-map pins, and the open-queue tabs are not one identical feed.

---

## What You Can Do on This Page

### Map & Live Fleet

- View live technician / truck markers with status pills (on schedule, checked out, idling, checkout alert).
- Toggle layers: **Live Technician** and **Work Orders**.
- Pick a service date (US Eastern) for scheduled work on the map.
- Fit all trucks, refresh telemetry.
- Filter crews: Maintenance, Nassau, FP (fire pump).
- Click a truck → telemetry (speed, fuel, motion, address), today's trips, badges, nearby-job actions.

### Work Orders & Schedule

- Turn on **Work Orders** → see day pins for scheduled Rael crew-lead work.
- Search / look up a work order; pin it on the map.
- Open a WO popup: schedule, trips, visit status, instructions, open in Rael Redi, send address to search, assign / nearby actions.
- Use the day trip schedule panel (when WO layer is on): per-tech trip list for the day; deep link toward Rael Redi dispatch where available.

### Nearby / Emergency Dispatch (Dex Core Flow)

- Search an address or select a work-order location.
- Open the **Nearby technicians** panel — ranked by ETA, miles, availability (live mode).
- See route overlay to the selected tech.
- Filter Maintenance / Nassau / FP as needed.
- Open **Assign Technician** → set schedule window → **Review & assign**.
- Optionally **Dispatch now** so the trip is pushed immediately (`dispatch_now` on the UC trip).

> For a future WO date, nearby switches to *scheduled* technicians (planning mode), not the same live-GPS ranking.

### Open Job Queues (Right Sidebar)

| Queue | What it is for |
|---|---|
| Site Survey | Open survey work to fill |
| Service Call | Open service jobs |
| FDNY Survey | FDNY survey queue |
| Repair | Material states (need / ordered / arrived style tabs) |

Each queue supports search, region multi-select, select-job → focus map, and assign flows (including schedule-suggestion style "thin day" chips when a tech has little work left).

### Tech → Nearby Open Jobs

From a truck or WO popup toolbar, find nearby open work by kind (Survey, Service, FDNY, Material arrived) and pick a job into the nearby-jobs panel.

### Assign Panel

- **Assign Technician** — WO lookup, multi-select assignable crew, start/end in ET, review & assign.
- **My Assignments** — see what you assigned; Dispatch now per group when appropriate.

> Same panel patterns are reused elsewhere (e.g. Schedule Repair / FTJ) with dispatch sometimes hidden — on `/rael`, assign + dispatch are the primary commit actions.

---

## How It Helps the Business

| Pain today (without this page) | What Daily Dispatch / Dex does |
|---|---|
| Emergency means hopping map, WO system, GPS, phone lists | One screen: job + nearest free tech + drive time |
| Slow to know who is actually available | Live GPS + trip / check-out / busy signals on the map |
| Open surveys & service work sit invisible | Queues + region filters to pull work onto the board |
| Assignments stuck in "who do I call?" | Direct assign into Rael Redi / UC and Dispatch now to the tech |
| Compliance risk hard to see while dispatching | Molly checkout-alert and idle pills on the same map |

**Business outcome Dex is sold on:** cut emergency dispatch from hours → minutes, keep trucks utilized, and keep supervisors in one control tower instead of four tools.

---

## Status Signals on the Map (What They Mean)

| Signal | Meaning for ops |
|---|---|
| On schedule / active trip | Tech is tied to work |
| Checked out / free | Often available for the next job |
| Idling | Truck idle long enough to warrant attention (Iris-related signal) |
| Checkout alert | Molly saw leave-site without known checkout — visibility only |

> These help dispatchers avoid sending someone who is already in trouble or clearly occupied — they do **not** place phone calls from this page.

---

## What This Page Is *Not*

| Not on `/rael` | Where it lives instead |
|---|---|
| Ranked survey truck↔job suggestion engine (accept/revert) | Job Scheduling / Harvey (`/supervisor/job-scheduling`) |
| ITM inspection planning calendar | Cora / ITM (`/supervisor/itm`) |
| FTJ Last Point / region ranked repair scheduling UI | Schedule Repair / FTJ (`/supervisor/repair`) |
| Molly sequenced manager calling / "already checked out" voice agent | Checkout Compliance + calling/n8n (v2 proposals) |
| Overtime claim deep-dive | Ava / Overtime Compliance |
| Violations deep-dive | Vera |

> **Naming tip:** Dex's CTA says "Open Rael Control Tower" and means this page (`/supervisor/rael`). Job Scheduling also uses "Rael Control Tower" wording in places — that is a different product surface (schedule suggestions), not Daily Dispatch.

---

## Typical Workflows (Quick Reference)

1. **Emergency** — address → search pin → nearby techs → assign → Dispatch now.
2. **Live monitoring** — filters → click truck → today's trips + status pills.
3. **Fill today's open work** — queue tab → select WO → nearby or assign.
4. **Browse the day** — WO layer + date → map pins + day schedule panel.
5. **Tech has a light day** — day-schedule chip → suggested queue after their last trip → assign that tech.
6. **From a truck** — nearby Survey / Service / FDNY / Material arrived → pick a job.

---

## Product / Guide Notes

- **Onboarding tour (rael):** date & layers → map controls → open job queue → dispatch from the map.
- **Agent hub:** Dex → "Open Rael Control Tower" → `/supervisor/rael`.
- **Default supervisor landing** often redirects here — this is the primary live ops home.

*Based on current Facility19 implementation of `/supervisor/rael` (Rael / Daily Dispatch / Dex).*
