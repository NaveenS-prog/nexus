# NEXUS — Unified Personal Command Center

> A personal command center and operating system that unifies academic deadlines, personal tasks, calendar events, software projects, notes/ideas, GitHub activity, focus sessions, and productivity analytics into a single high-performance interface.

---

## ⚡ Core Product Philosophy

NEXUS eliminates context switching by following the **Capture → Understand → Prioritize → Execute → Review** loop:
1. **What do I need to do today?** Unified multi-source timeline (Google Tasks, Google Classroom, Google Calendar, Notion, NEXUS).
2. **What deadlines are approaching?** Collision warnings, urgency countdowns, and academic priority sorting.
3. **How overloaded are the next 14 days?** Interactive 14-day workload radar scoring algorithm.
4. **What should I work on right now?** Deterministic "What Should I Do Now?" recommendation engine with available time window analysis.
5. **What projects am I building?** Sprint progress trackers, Kanban workflows, and module dependency graphs.
6. **How productive have I been?** Weekly activity metrics, focus hours, completion rates, and streak tracking.

---

## 🚀 Quick Start

### 1. Run in Demo Mode (Zero-Config Out-of-the-Box)
NEXUS starts immediately with realistic demo data across all sources:

```bash
cd C:\Users\navee\nexus
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Connect Supabase (Production Mode)
1. Create a project on [Supabase](https://supabase.com).
2. Open the **SQL Editor** in Supabase and run the migration file:
   ```text
   supabase/migrations/20260920000001_initial_schema.sql
   ```
3. Set your credentials in `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

---

## ⌨️ Global Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + K` or `Cmd + K` | Global Command Palette & Fuzzy Search |
| `E` | Switch to **Exam Mode** (Coursework & exams prioritized) |
| `B` | Switch to **Build Mode** (Sprint tasks & GitHub prioritized) |
| `F` | Launch **Focus Mode** (Countdown timer & session tracker) |
| `Esc` | Dismiss modals / slide-over drawers |

---

## 🧭 Slash Commands in Command Palette (`Ctrl + K`)

- `/task <title>` — Quickly capture a task with due date
- `/idea <title>` — Capture an idea routed to Notion/NEXUS
- `/focus [min]` — Start a focus sprint
- `/plan` — Open the command center planner
- `/mode exam` / `/mode build` / `/mode default` — Switch active work modes

---

## 📂 Project Structure

```text
nexus/
├── supabase/
│   └── migrations/
│       └── 20260920000001_initial_schema.sql  # Supabase schema & RLS
├── src/
│   ├── app/
│   │   ├── globals.css                       # Linear/Raycast design system
│   │   ├── layout.tsx                        # Root layout with AppShell
│   │   ├── page.tsx                          # Command Center Dashboard
│   │   ├── tasks/page.tsx                    # Multi-source task manager
│   │   ├── projects/page.tsx                 # Projects Kanban & dependency tree
│   │   ├── academics/page.tsx                # Google Classroom courses & exams
│   │   ├── calendar/page.tsx                 # Google Calendar daily schedule
│   │   ├── focus/page.tsx                    # Full-screen focus chamber
│   │   ├── analytics/page.tsx                # Recharts activity metrics
│   │   ├── settings/page.tsx                 # Integration connectors & preferences
│   │   └── api/
│   │       ├── ai/brain-dump/route.ts        # Brain dump NLP parser
│   │       ├── ai/brief/route.ts             # AI daily briefing
│   │       └── sync/route.ts                 # Background sync runner
│   ├── components/
│   │   ├── command/                          # CmdK palette & Brain Dump
│   │   ├── dashboard/                        # Today's focus, workload radar, next move
│   │   ├── shell/                            # AppShell, Sidebar, Header
│   │   └── ui/                               # Design primitives (Card, Badge, Drawer)
│   └── lib/
│       ├── data/                             # Reactive store & rich mock dataset
│       ├── engines/                          # Workload radar & recommendation engines
│       ├── integrations/                     # Google, Notion, GitHub providers
│       └── supabase/                         # Client & server DB connection
```
