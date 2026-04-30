# PRD - SkripsiAI: Asisten Penelitian Skripsi

## Problem Statement
Build a personal AI research assistant platform for Reva (Bachelor's thesis student, Nutrition - Food Technology concentration) working on "Physicochemical Analysis of Instant Porridge Fortified with Gotu Kola Leaves (Centella asiatica) as Emergency Disaster Food". Platform integrates Claude Opus 4-6 for academic guidance in Bahasa Indonesia.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Recharts + Shadcn UI components
- **Backend**: FastAPI (Python) + Motor (MongoDB async) + emergentintegrations (Claude Opus 4-6)
- **Database**: MongoDB (collections: chat_sessions, chat_messages, references, research_data)
- **AI**: Claude Opus 4-6 via emergentintegrations library (EMERGENT_LLM_KEY)

## User Persona
- **Reva**: S1 Nutrition student, needs scientific advisor AI, statistical tools, writing assistance
- Single user, no auth required

## Core Requirements
1. AI Chat (Dosen Pembimbing AI) - Multi-turn conversation with Claude Opus acting as thesis supervisor
2. Statistical Calculator - One-way ANOVA + DMRT post-hoc test
3. Academic Writing Editor - Paraphrase, formalize, review, suggest modes
4. Reference/Bibliography Manager - CRUD with search
5. Research Data Management - Store & visualize physicochemical data (F1/F2/F3)
6. Dashboard - Overview with quick actions and stats

## What's Been Implemented (Jan 2026)
- [x] Full backend with all endpoints (chat, statistics, writing, references, research-data, templates)
- [x] Full frontend with sidebar navigation and 7 pages
- [x] Claude Opus 4-6 integration via emergentintegrations
- [x] ANOVA + DMRT statistical calculator with visualization (Recharts)
- [x] Writing assistant (4 modes: paraphrase, formal, review, suggest)
- [x] Reference manager with search/filter
- [x] Research data with bar chart visualization
- [x] Academic writing templates for thesis chapters
- [x] Earthy/organic theme (Cormorant Garamond + IBM Plex Sans)
- [x] **Progress Tracker** - Track thesis chapter progress with subtasks, status, and page counts
- [x] **Export Statistics to CSV** - Download ANOVA/DMRT results as CSV file
- [x] **Import Data from CSV** - Upload CSV file to import research data
- [x] All testing passed (100% backend, 100% frontend) - iteration 1 & 2

## Prioritized Backlog
### P0 (Done)
- All 7 core features implemented and tested
- Progress tracker with 5 thesis chapters
- CSV export/import functionality

### P1 (Next)
- Citation format generator (APA, Vancouver)
- PDF export for writing editor output
- Literature search integration

### P2 (Future)
- Google Scholar integration
- Auto-save drafts for writing editor
- Comparison charts between parameters
- Report generation (auto-combine all analysis results)
- Thesis word count tracker

## Next Tasks
1. Citation formatter (APA/Vancouver)
2. PDF export for results
3. Literature search integration
