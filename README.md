# Ent'artes — Dance School Management Web Application

A full-stack web application for managing a dance school, covering students, teachers, schedules, events, coaching sessions, and notifications.

---

## Technologies

| Layer        | Stack                              |
| ------------ | ---------------------------------- |
| Frontend     | React 18, React Router v6, Vite    |
| Styling      | Tailwind CSS, PostCSS              |
| Backend      | Node.js, Express                   |
| Database     | PostgreSQL (NeonDB) via Prisma ORM |
| Auth         | JWT (8h expiration), RBAC (3 roles)|

---

## Architecture

### Backend

```
Route → Middleware (auth/role) → Controller → Service → Prisma → Response
```

- All routes are mounted under `/api/`
- Interactive API documentation is available at `/api-docs` (Swagger)
- The coaching module is decoupled by role: `coachingAlunoService`, `coachingDocenteService`, `coachingCoordenacaoService`

### Frontend

```
View → Service file → services/api.js (injeta JWT) → Backend API
```

- `services/api.js` acts as the central HTTP client — it automatically injects the Bearer token into all requests and redirects the user to the login page upon encountering a 401 status code.
- `DashboardLayout` provides a `NotificationContext` that handles notification polling every 60 seconds.
- Authenticated routes are secured using a `<ProtectedRoute>` component, which validates JWT expiration prior to rendering.

### Core Database Models

- `utilizador` — Base user record; extended by `aluno` (student), `docente` (teacher), or `coordenadora` (coordinator).
- `marcacao` — Coaching sessions featuring a state machine mechanism (`marcacao_estado_historico`).
- `evento` + `evento_aluno` / `evento_docente` — Events associated with strictly typed participants.
- `horario_letivo` / `disponibilidade` — Academic schedules and teacher availability slots.
- `notificacao` / `anuncio` — Individual user notifications and targeted group announcements.

---

## Testing

| Layer    | Framework | Type                    | File                        |
| -------- | --------- | ----------------------- | --------------------------- |
| Backend  | Jest      | Unit (Service)          | `modalidadeService.test.js` |
| Backend  | Jest      | Unit (Middleware)       | `authMiddleware.test.js`    |
| Frontend | Vitest    | Integration (Service)   | `horarioService.test.js`    |
| Frontend | Vitest    | Unit (Utility)          | `dateUtils.test.js`         |
| Frontend | Vitest    | Unit (HTTP Client)      | `api.test.js`               |

---

## Key Libraries

| Library                                | Purpose                          |
| -------------------------------------- | -------------------------------- |
| `prisma`                               | ORM and database access layer    |
| `jsonwebtoken` + `bcrypt`              | Authentication and password hashing |
| `express-rate-limit`                   | Brute-force protection middleware |
| `swagger-jsdoc` + `swagger-ui-express` | API documentation engine         |
| `react-big-calendar` + `date-fns`      | Scheduling calendar components   |
| `lucide-react`                         | Icon system                      |

---

## Routes and Permissions

Roles: **C** = Coordinator · **D** = Teacher (Docente) · **A** = Student (Aluno)

### Auth

| Method | Route             | Access |
| ------ | ----------------- | ------ |
| POST   | `/api/auth/login` | Public |
| GET    | `/api/auth/me`    | Public |

### Users

| Method | Route                                  | Access  |
| ------ | -------------------------------------- | ------- |
| GET    | `/api/users/`                          | C       |
| POST   | `/api/users/`                          | C       |
| GET    | `/api/users/:id`                       | C, D, A |
| PUT    | `/api/users/:id`                       | C       |
| DELETE | `/api/users/:id`                       | C       |
| PUT    | `/api/users/perfil/password/:id`       | C, D, A |
| PUT    | `/api/users/perfil/dados-pessoais/:id` | C, D, A |

### Schedules

| Method | Route                           | Access  |
| ------ | ------------------------------- | ------- |
| GET    | `/api/horario/minhas-aulas`     | C, D, A |
| GET    | `/api/horario/disponiveis`      | C, D, A |
| GET    | `/api/horario/minhas-aulas/:id` | C, D, A |
| POST   | `/api/horario/inscrever`        | A       |

### Coaching

| Method | Route                                        | Access |
| ------ | -------------------------------------------- | ------ |
| GET    | `/api/coaching/disponibilidades/consultar`   | A      |
| POST   | `/api/coaching/marcacao/solicitar`           | A      |
| GET    | `/api/coaching/meus-pedidos`                 | A      |
| DELETE | `/api/coaching/pedido/:id/cancelar`          | A      |
| POST   | `/api/coaching/presenca-grupo`               | A      |
| POST   | `/api/coaching/aluno/conclusao-sessao/:id`   | A      |
| GET    | `/api/coaching/colegas`                      | A      |
| GET    | `/api/coaching/minhas-aulas`                 | D      |
| POST   | `/api/coaching/docente/conclusao-sessao/:id` | D      |
| POST   | `/api/coaching/cancelar-marcacao/:id`        | D      |
| GET    | `/api/coaching/pedidos-pendentes`            | C      |
| POST   | `/api/coaching/confirmar-marcacao`           | C      |
| POST   | `/api/coaching/rejeitar-marcacao`            | C      |
| POST   | `/api/coaching/cancelar-marcacao`            | C      |
| POST   | `/api/coaching/concluir-marcacao`            | C      |
| POST   | `/api/coaching/reatribuir-sala`              | C      |
| GET    | `/api/coaching/salas-disponiveis`            | C      |
| GET    | `/api/coaching/historico-marcacao/:id`       | C      |

### Availability (Teacher)

| Method | Route                   | Access |
| ------ | ----------------------- | ------ |
| GET    | `/api/availability/`    | D      |
| POST   | `/api/availability/`    | D      |
| PUT    | `/api/availability/:id` | D      |
| DELETE | `/api/availability/:id` | D      |

### Events & Groups

| Method | Route                                         | Access  |
| ------ | --------------------------------------------- | ------- |
| GET    | `/api/events/`                                | C, D, A |
| GET    | `/api/events/meus-eventos`                    | D, A    |
| POST   | `/api/events/`                                | C       |
| PUT    | `/api/events/:id`                             | C       |
| DELETE | `/api/events/:id`                             | C       |
| POST   | `/api/events/:id/concluir`                    | C       |
| GET    | `/api/events/:id/participantes`               | C, D, A |
| POST   | `/api/events/:id/participantes`               | C       |
| DELETE | `/api/events/:id/participantes/alunos/:aid`   | C       |
| DELETE | `/api/events/:id/participantes/docentes/:did` | C       |
| POST   | `/api/events/:id/grupos`                      | C       |
| GET    | `/api/events/:id/grupos`                      | C, D, A |
| PUT    | `/api/events/:id/grupos/:gid`                 | C       |
| DELETE | `/api/events/:id/grupos/:gid`                 | C       |
| POST   | `/api/events/:id/grupos/:gid/alunos/:aid`     | C, D    |
| DELETE | `/api/events/:id/grupos/:gid/alunos/:aid`     | C, D    |
| POST   | `/api/events/:id/grupos/:gid/docentes/:did`   | C       |
| DELETE | `/api/events/:id/grupos/:gid/docentes/:did`   | C       |

### Dance Styles / Disciplines (Modalidades)

| Method | Route                                       | Access  |
| ------ | ------------------------------------------- | ------- |
| GET    | `/api/modalidades/`                         | C, D, A |
| GET    | `/api/modalidades/:id`                      | C, D, A |
| POST   | `/api/modalidades/`                         | C       |
| PUT    | `/api/modalidades/:id`                      | C       |
| DELETE | `/api/modalidades/:id`                      | C       |
| POST   | `/api/modalidades/:id/docentes`             | C       |
| DELETE | `/api/modalidades/:id/docentes/:id_docente` | C       |

### Notifications

| Method | Route                        | Access  |
| ------ | ---------------------------- | ------- |
| GET    | `/api/notificacoes/`         | C, D, A |
| PATCH  | `/api/notificacoes/:id/lida` | C, D, A |

### Announcements

| Method | Route                               | Access  |
| ------ | ----------------------------------- | ------- |
| GET    | `/api/anuncios/`                    | C, D, A |
| POST   | `/api/anuncios/`                    | C       |
| GET    | `/api/anuncios/:id`                 | C, D, A |
| PUT    | `/api/anuncios/:id`                 | C, D, A |
| DELETE | `/api/anuncios/:id`                 | C       |
| GET    | `/api/anuncios/anuncios/:id_evento` | C, D, A |
| GET    | `/api/anuncios/grupo/:id_grupo`     | C, D, A |

### Reports

| Method | Route                           | Access |
| ------ | ------------------------------- | ------ |
| GET    | `/api/relatorios/sessoes`       | C      |
| GET    | `/api/relatorios/horas-docente` | C      |
| GET    | `/api/relatorios/alunos`        | C      |
| GET    | `/api/relatorios/docentes`      | C      |
| GET    | `/api/relatorios/exportar`      | C      |

### Rooms (Salas)

| Method | Route            | Access |
| ------ | ---------------- | ------ |
| GET    | `/api/salas/`    | C      |
| DELETE | `/api/salas/:id` | C      |

---

## Local Setup

### Prerequisites

- Node.js v20+

### Backend Environment (`backend/`)

Create a `backend/.env` file:

```env
DATABASE_URL='postgresql://...'
JWT_SECRET="..."
```

```bash
npm install
npx prisma generate
npm run dev       # http://localhost:3000
```

### Frontend (`frontend/`)

```bash
npm install
npm run dev       # http://localhost:5173
```

O frontend faz proxy de `/api` para `http://localhost:3000` via Vite — ambos os servidores têm de estar a correr em simultâneo.

---

## Contas de Desenvolvimento

| Role         | Username |          Password           |
| ------------ | -------- | --------------------------- |
| Coordenadora | admin    |   admin123456789LOCKONE@    |
| Docente      | docente  |   docente123456789LOCKONE   |
| Aluno        | aluno    |       alunoalunoaluno       |
