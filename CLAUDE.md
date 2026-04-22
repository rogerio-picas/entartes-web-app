# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ent'artes** is a full-stack web application for managing an arts school — handling students, teachers, class scheduling, events, coaching sessions, and notifications.

- **Frontend:** React 18 + React Router v6 + Vite + Tailwind CSS (`frontend/`)
- **Backend:** Node.js + Express + Prisma ORM + PostgreSQL via NeonDB (`backend/`)

---

## Commands

### Frontend (`frontend/`)
```bash
npm run dev      # Dev server at http://localhost:5173
npm run build    # Production build
npm run preview  # Preview production build
```

### Backend (`backend/`)
```bash
npm run dev           # Dev server with Nodemon (auto-reload) at http://localhost:3000
npm start             # Production server

npx prisma db pull    # Sync schema from live database
npx prisma generate   # Regenerate Prisma client after schema changes
npx prisma studio     # GUI for browsing/editing database records
```

The frontend proxies `/api` requests to `http://localhost:3000` (configured in `vite.config.js`), so both servers must be running during development.

---

## Architecture

### Request Flow (Backend)
```
Route → tokenValidation middleware → authorize (role check) middleware → Controller → Service → Prisma → Response
```

All routes are mounted under `/api/`. Swagger docs are available at `/api-docs`.

### Request Flow (Frontend)
```
View/Component → service file (e.g. aulasService.js) → services/api.js (JWT header injection) → Backend API
```

`services/api.js` is the single API client. It attaches the JWT Bearer token from `localStorage` to every request and removes it + redirects to login on 401.

### Authentication & Authorization
- JWT with 8-hour expiration, stored in `localStorage`
- Frontend validates token expiration in `ProtectedRoute` before rendering any authenticated route
- Backend: `authMiddleware.js` validates JWT; `roleCheckMiddleware.js` enforces RBAC
- Three user roles via `id_tipo`: `1 = Coordenadora`, `2 = Docente`, `3 = Aluno`

### Frontend Routing & Layout
- `App.jsx` defines all routes; authenticated routes use `<ProtectedRoute>`
- `DashboardLayout` wraps all authenticated pages and provides `NotificationContext` (unread count) polled every 60 seconds
- Page components live in `views/`; reusable components in `components/`

### Backend Code Organization
```
routes/       → define Express routes, embed Swagger JSDoc comments
controllers/  → parse HTTP request/response, delegate to services
services/     → business logic, Prisma queries
middlewares/  → tokenValidation, authorize (role-based)
```

The coaching module is split by role: `coachingAlunoService.js`, `coachingDocenteService.js`, `coachingCoordenacaoService.js`.

### Database Models (Key Entities)
- `utilizador` — base user record; extended by `aluno`, `docente`, or `coordenadora` depending on role
- `marcacao` — scheduled coaching/class sessions with state machine (`estado_marcacao`, `marcacao_estado_historico`)
- `evento` + `evento_aluno` / `evento_docente` — events with typed participant links
- `modalidade` — art forms/class types
- `horario_letivo` / `disponibilidade` — schedule and teacher availability
- `notificacao` — per-user notifications; `anuncio` — group/event announcements

---

## Environment Setup

**Backend requires a `.env` file** at `backend/.env`:
```
DATABASE_URL='postgresql://...'   # NeonDB connection string
JWT_SECRET="..."
```

No `.env` needed for the frontend — it uses the Vite proxy.

**Node.js v20+** is required.

---

## Development Accounts (local/staging)

| Role | Username | Password |
|------|----------|----------|
| Coordenadora | admin | admin |
| Docente | docente | docente |
| Aluno | aluno | aluno |
