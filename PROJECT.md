# Shiny Shell LMS — Project Plan

## Environment

- **Project directory:** `/Users/shanelarsen/Documents/Coldwater Capital/Agentic Coding/shiny-shell-lms-v1.0/`
- **Node.js:** v24.14.1 — installed at `/Users/shanelarsen/.local/opt/node-v24.14.1/bin/`
  - If `node`/`npm`/`npx` aren't found, prefix commands with the full path or export: `export PATH="/Users/shanelarsen/.local/opt/node-v24.14.1/bin:$PATH"`
- **Design system reference:** `/Users/shanelarsen/Downloads/Claude-LMS.pdf`
- **Next.js version:** 16.2.1 (App Router, TypeScript, Tailwind — already scaffolded)
- ⚠️ Ignore the older project at `Shiny Shell LMS/shiny-shell-lms/` — it is a separate, unrelated scaffold.

Internal Learning Management System for Shiny Shell Carwash. Serves ~20 locations across UT, PA, and MD. Admins create and publish training content, managers enroll learners, and employees complete assigned training on any device.

**Timeline:** MVP in 1 week | **Deployment:** Vercel

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (4-digit OTP via email or SMS) |
| Storage | Supabase Storage (media uploads) |
| Hosting | Vercel |
| Icons | Lucide React |

---

## Auth Flow

- No passwords. Users are invited via email link.
- Login: 4-digit OTP sent to email or SMS (user's choice).
- Supabase Auth handles OTP delivery and session management.

---

## Roles & Permissions

| Action | Learner | Manager | Admin |
|---|---|---|---|
| Take enrolled courses | ✅ | ✅ | ✅ |
| Self-enroll in open courses | ✅ | ✅ | ✅ |
| Enroll learners in courses / paths | ❌ | ✅ | ✅ |
| Invite new users | ❌ | ✅ | ✅ |
| Create / edit / delete courses | ❌ | ❌ | ✅ |
| Create / edit / delete paths | ❌ | ❌ | ✅ |
| Create / edit / delete locations | ❌ | ❌ | ✅ |

---

## Data Models

**users** — `id, first_name, last_name, email, phone?, role, location_id?, created_at`

**locations** — `id, name, state, created_at`

**courses** — `id, title, description, cover_image_url, open_enrollment (bool), status (draft | published), created_by, created_at`

**course_locations** *(junction)* — `course_id, location_id`

**paths** — `id, title, description, cover_image_url, created_by, created_at`

**path_courses** *(junction, ordered)* — `path_id, course_id, order`

**assignments** — `id, course_id, title, media_type (video | audio | text | flashcard), media_url?, embed_url?, order, created_at`

**questions** — `id, assignment_id, type (multiple_choice | true_false | fill_blank), prompt, options (jsonb), correct_answer, order`

**enrollments** — `id, user_id, course_id?, path_id?, enrolled_by, enrolled_at`

**progress** — `id, user_id, assignment_id, completed (bool), score?, completed_at`

---

## MVP Features

### Admin
- **Course Creation Wizard (3 steps)**
  1. **Details** — Title, description, cover image, open enrollment toggle, location access (multi-select)
  2. **Assignments** — Add assignments: media (upload to Supabase Storage or paste embed URL) + 1–n questions
  3. **Review** — Summary page → Publish
- Manage Paths (create, edit, delete; add/reorder courses)
- Manage Users (invite via email, assign role + location)
- Manage Locations (create, edit, delete)
- CSV User Import (required: first name, last name, email — optional: phone, location)

### Manager
- Enroll learners in courses and paths
- Invite new users

### Learner
- View and complete assigned courses and paths
- Self-enroll in open-enrollment courses
- Track personal progress

---

## Assignment & Question Types

**Media formats:** Video, Audio, Text/Article, Flashcards *(upload or embed external URL)*

**Question types:** Multiple Choice, True/False, Fill in the Blank

---

## Navigation

**Admin / Manager — Desktop-first**
- Sidebar (220px): Paths, Courses, Users, Locations
- Top bar: Breadcrumbs | Search | Add User | Notifications | Help | Profile

**Learner — Mobile-first (375px–428px primary)**
- Bottom tab bar: Assignments, My Learning, Profile
- No sidebar; desktop view is max-width 480px centered

---

## Pages

| Page | Role(s) |
|---|---|
| Login (OTP) | All |
| Admin/Manager Dashboard | Admin, Manager |
| Courses — list & detail | All |
| Course Creation Wizard | Admin |
| Paths — list & detail | All |
| Users / Team Directory | Admin, Manager |
| User Profile | All |
| Locations | Admin |
| CSV Import | Admin |
| Assignment Player | Learner |
| My Learning | Learner |

---

## Terminology Clarifications

These names were finalized in our planning conversation — use them consistently:

| Term | Definition |
|---|---|
| **Course** | A training unit created by an Admin. Contains one or more Assignments in order. |
| **Assignment** | A single section within a Course: one piece of media (video, audio, text, flashcard) followed by 1–n questions. |
| **Path** | An ordered collection of Courses. A Course can belong to multiple Paths. |
| **Enrollment** | The act of a user (or manager/admin on their behalf) joining a Course or Path. |
| **Open Enrollment** | A toggle on a Course that allows Learners to self-enroll. If off, only Managers/Admins can enroll Learners. |

> ⚠️ Do not use "Module" — that was the old spec's term for what we call a Course.

---

## Recommended Build Order

1. Install dependencies (Supabase, Lucide React, shadcn/ui, etc.)
2. Apply Shiny Shell design tokens (colors, typography, spacing) to `globals.css`
3. Set up Supabase project + run database schema migrations
4. Build Auth (OTP flow — 4-digit code, email or SMS)
5. Build Admin layout (sidebar + top bar)
6. Build Course Creation Wizard (3 steps)
7. Build Paths management
8. Build Users / Team Directory + CSV import
9. Build Locations management
10. Build Learner layout (mobile-first, bottom tab bar)
11. Build Assignment Player (media + questions)
12. Build enrollment logic (open vs. manager-assigned)
13. End-to-end test

---

## Out of Scope — Phase 2

- Reports & analytics
- Certificates
- Email / SMS notifications & reminders

---

## Design System

Full reference in `Claude-LMS.pdf`. Key tokens:

| Token | Value | Notes |
|---|---|---|
| `--color-primary` | `#1F396D` | Shiny Shell Blue — sidebar, headings, hierarchy |
| `--color-accent` | `#F15F3A` | Shiny Shell Orange — buttons, active states, progress |
| `--color-neutral` | `#E8E6DB` | Tan — page backgrounds |
| `--color-white` | `#FFFFFF` | Card and modal surfaces |
| `--color-success` | `#2D8A4E` | Complete, active, valid |
| `--color-warning` | `#D4930D` | In progress, on leave |
| `--color-error` | `#C93B3B` | Failed, invalid, destructive |

**Fonts:** Gotham Condensed (headings, labels, buttons) + Gotham (body, inputs)
**Icons:** Lucide React — 20px default, 24px for nav/mobile
