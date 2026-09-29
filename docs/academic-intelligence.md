# NEXUS Academic Intelligence Layer

Production-grade academic intelligence system for NEXUS Personal OS, combining user-triggered Google Classroom capture via Chrome Manifest V3, semantic classification, automatic Google Drive course folder organization, and an AI-driven assignment workspace with independent review and mandatory human approval.

---

## 1. System Architecture

```
Google Classroom (Browser)
        │
        ▼ (User clicks "Send to NEXUS")
Chrome Manifest V3 Extension (/extension)
        │
        ▼ (Authenticated with scoped token nxtk_...)
NEXUS Ingestion API (/api/academic/ingest)
        │
        ├── Academic Normalizer (Course codes, due dates, URLs)
        │
        └── Semantic Classifier (Multi-factor classification)
                │
                ├─────────────────────────────────────────┐
                │                                         │
        Assignments / Labs / Projects            Lecture / Reference Materials
                │                                         │
                ▼                                         ▼
        Task Radar Sync & Calendar              Google Drive Organizer
        (unified_items)                         (NEXUS Academic/[Course]/...)
                │
                ▼
        AI Assignment Workspace
        (Requirements extraction & draft generation)
                │
                ▼
        Independent Review Center
        (Rubric validation & compliance score)
                │
                ▼
        Human Student Approval (Mandatory)
                │
                ▼
        Finalized Deliverable
```

---

## 2. Chrome Browser Extension Setup

Because university environments frequently restrict direct Google Classroom API scopes and third-party OAuth access, the primary capture mechanism operates via a user-triggered Chrome Extension.

### Permissions & Security
- **Manifest V3**: Uses modern, declarative extension architecture (`extension/manifest.json`).
- **Scoped Permissions**: Uses `activeTab`, `scripting`, and `storage`.
- **Zero Credential Sharing**: The extension never intercepts Google cookies, university passwords, or credentials. It operates strictly on visible DOM content that the authenticated student can legitimately view in Google Classroom.
- **Device Pairing**: Uses a temporary 6-digit code (e.g., `NX-849201`) generated in NEXUS, which exchanges for an isolated bearer token (`nxtk_...`) stored in `chrome.storage.local`.

### How to Install in Chrome:
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select the `extension/` folder inside your NEXUS project repository.
5. In NEXUS (either on the `/academics` page or in **Settings** → **Classroom Extension**), click **Connect Extension** or **Generate 6-Digit Pairing Code**.
6. Open the NEXUS extension popup in your browser toolbar, enter the code, and click **Pair with NEXUS**.
7. Navigate to any Google Classroom course, assignment, or announcement, and click **Send to NEXUS**.

---

## 3. Semantic Academic Classifier

The classifier (`src/lib/academic/classifier.ts`) does not rely solely on simple title matches. It evaluates titles, instructions, visible attachment formats (PPTX, PDF, code), and due dates across 9 academic categories:

| Item Type | Classification Signals | Default Suggested Action |
| :--- | :--- | :--- |
| **ASSIGNMENT** | Has fixed due date or submission verbs (*submit, upload, rubric, points*) | Start AI Workspace & Task Sync |
| **LAB** | Practical keywords (*lab, simulator, packet capture, experiment*) + due date | Start AI Workspace |
| **PROJECT** | Long-term deliverables (*capstone, milestone, sprint, group project*) | Start AI Workspace |
| **EXAM** | Examination terms (*midterm, final exam, quiz, test, viva*) | Calendar Reminder & Exam Radar |
| **LECTURE_MATERIAL** | Slides, recordings, decks (*.pptx, .ppt, slides attached, video recording*) | Organize into Google Drive folder |
| **REFERENCE_MATERIAL** | Reference files (*syllabus, formulas, cheat sheet, handbook, manual*) | Organize into Google Drive folder |
| **READING** | Textbook readings (*read chapter, textbook pages, required reading*) | Create Task |
| **SCHEDULE_CHANGE** | Urgent schedule notices (*class cancelled, room change, rescheduled*) | Urgent Calendar Reminder |
| **ANNOUNCEMENT** | General broadcast (*welcome, reminder, office hours*) | Post Notice |

---

## 4. Google Drive Course Folder Organization

The Drive Organizer (`src/lib/academic/driveOrganizer.ts`) automatically structures course materials in the connected Google account:

```
Google Drive Root
└── NEXUS Academic/
    └── [Course Name] (e.g. Operating Systems)/
        ├── Lectures/             (Slides, presentations, recordings)
        ├── Assignments/          (Lab guidelines, problem sets)
        └── Reference Materials/  (Syllabi, formula sheets, documentation)
```

- **Idempotency & Deduplication**: Checks existing files in the target folder by name and SHA-256 content hash before uploading.
- **Genuine Account State**: If Google Drive is not connected, the application clearly instructs the user: *"Connect Google Drive to organize your course materials"*.

---

## 5. AI Assignment Agent & Independent Review Center

The Assignment Agent (`src/lib/academic/assignmentAgent.ts`) manages the complete lifecycle of a deliverable:

1. **Analysis & Requirement Extraction**:
   - Parses assignment instructions and attached materials.
   - Extracts a structured checklist of mandatory deliverables, formatting constraints, word counts, and citations (`academic_requirements`).
2. **Draft Generation**:
   - Synthesizes course context and student directives to draft the deliverable in structured academic Markdown or code.
3. **Independent Review**:
   - Validates draft content against every requirement extracted in Step 1.
   - Computes an objective compliance score (0–100%) and provides actionable feedback on missing rubric criteria.
4. **Mandatory Human Approval**:
   - **Critical Safety Guardrail**: The agent is strictly prohibited from auto-submitting or auto-finalizing work. The student must inspect the draft and click **Approve Deliverable as Final**.

---

## 6. Zero Mock Data Policy

In accordance with NEXUS production principles:
- The database starts completely clean with 0 mock academic courses, assignments, or synthetic files.
- The UI renders genuine, helpful empty states:
  - If no items exist: *"No academic items yet. Connect the NEXUS browser extension to capture Classroom content."*
  - If no assignments are pending: *"You're all caught up."*
  - If Drive is not connected: *"Connect Google Drive to organize your course materials."*
- Demo account generation buttons and synthetic mock items have been completely removed from production routes.
