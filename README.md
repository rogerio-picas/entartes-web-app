# Ent'artes — Aplicação Web de Gestão de Escola de Dança

Aplicação web full-stack para gestão de uma escola de dança, cobrindo alunos, docentes, horários, eventos, sessões de coaching e notificações.

---

## Tecnologias

| Camada        | Stack                              |
| ------------- | ---------------------------------- |
| Frontend      | React 18, React Router v6, Vite    |
| Estilos       | Tailwind CSS, PostCSS              |
| Backend       | Node.js, Express                   |
| Base de dados | PostgreSQL (NeonDB) via Prisma ORM |
| Autenticação  | JWT (8h), RBAC com 3 roles         |

---

## Arquitetura

### Backend

```
Route → Middleware (auth/role) → Controller → Service → Prisma → Response
```

- Todas as rotas estão montadas sob `/api/`
- Documentação interativa da API disponível em `/api-docs` (Swagger)
- Módulo de coaching dividido por papel: `coachingAlunoService`, `coachingDocenteService`, `coachingCoordenacaoService`

### Frontend

```
View → Service file → services/api.js (injeta JWT) → Backend API
```

- `services/api.js` é o cliente HTTP central — injeta o token Bearer em todos os pedidos e redireciona para login em caso de 401
- `DashboardLayout` fornece `NotificationContext` com polling de notificações a cada 60 segundos
- Rotas autenticadas protegidas por `<ProtectedRoute>` que valida a expiração do JWT antes de renderizar

### Modelos principais da base de dados

- `utilizador` — registo base; estendido por `aluno`, `docente` ou `coordenadora`
- `marcacao` — sessões de coaching com máquina de estados (`marcacao_estado_historico`)
- `evento` + `evento_aluno` / `evento_docente` — eventos com participantes tipados
- `horario_letivo` / `disponibilidade` — horários e disponibilidade dos docentes
- `notificacao` / `anuncio` — notificações por utilizador e anúncios de grupo

---

## Testes

| Camada   | Framework | Tipo                    | Ficheiro                    |
| -------- | --------- | ----------------------- | --------------------------- |
| Backend  | Jest      | Unitário (serviço)      | `modalidadeService.test.js` |
| Backend  | Jest      | Unitário (middleware)   | `authMiddleware.test.js`    |
| Frontend | Vitest    | Integração (serviço)    | `horarioService.test.js`    |
| Frontend | Vitest    | Unitário (utilitário)   | `dateUtils.test.js`         |
| Frontend | Vitest    | Unitário (cliente HTTP) | `api.test.js`               |

---

## Principais Bibliotecas

| Biblioteca                             | Uso                              |
| -------------------------------------- | -------------------------------- |
| `prisma`                               | ORM e acesso à base de dados     |
| `jsonwebtoken` + `bcrypt`              | Autenticação e hash de passwords |
| `express-rate-limit`                   | Proteção contra brute-force      |
| `swagger-jsdoc` + `swagger-ui-express` | Documentação da API              |
| `react-big-calendar` + `date-fns`      | Calendário de horários           |
| `lucide-react`                         | Ícones                           |

---

## Rotas e Permissões

Roles: **C** = Coordenadora · **D** = Docente · **A** = Aluno

### Auth

| Método | Rota              | Acesso  |
| ------ | ----------------- | ------- |
| POST   | `/api/auth/login` | Público |
| GET    | `/api/auth/me`    | Público |

### Utilizadores

| Método | Rota                                   | Acesso  |
| ------ | -------------------------------------- | ------- |
| GET    | `/api/users/`                          | C       |
| POST   | `/api/users/`                          | C       |
| GET    | `/api/users/:id`                       | C, D, A |
| PUT    | `/api/users/:id`                       | C       |
| DELETE | `/api/users/:id`                       | C       |
| PUT    | `/api/users/perfil/password/:id`       | C, D, A |
| PUT    | `/api/users/perfil/dados-pessoais/:id` | C, D, A |

### Horários

| Método | Rota                            | Acesso  |
| ------ | ------------------------------- | ------- |
| GET    | `/api/horario/minhas-aulas`     | C, D, A |
| GET    | `/api/horario/disponiveis`      | C, D, A |
| GET    | `/api/horario/minhas-aulas/:id` | C, D, A |
| POST   | `/api/horario/inscrever`        | A       |

### Coaching

| Método | Rota                                         | Acesso |
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

### Disponibilidade (Docente)

| Método | Rota                    | Acesso |
| ------ | ----------------------- | ------ |
| GET    | `/api/availability/`    | D      |
| POST   | `/api/availability/`    | D      |
| PUT    | `/api/availability/:id` | D      |
| DELETE | `/api/availability/:id` | D      |

### Eventos & Grupos

| Método | Rota                                          | Acesso  |
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

### Modalidades

| Método | Rota                                        | Acesso  |
| ------ | ------------------------------------------- | ------- |
| GET    | `/api/modalidades/`                         | C, D, A |
| GET    | `/api/modalidades/:id`                      | C, D, A |
| POST   | `/api/modalidades/`                         | C       |
| PUT    | `/api/modalidades/:id`                      | C       |
| DELETE | `/api/modalidades/:id`                      | C       |
| POST   | `/api/modalidades/:id/docentes`             | C       |
| DELETE | `/api/modalidades/:id/docentes/:id_docente` | C       |

### Notificações

| Método | Rota                         | Acesso  |
| ------ | ---------------------------- | ------- |
| GET    | `/api/notificacoes/`         | C, D, A |
| PATCH  | `/api/notificacoes/:id/lida` | C, D, A |

### Anúncios

| Método | Rota                                | Acesso  |
| ------ | ----------------------------------- | ------- |
| GET    | `/api/anuncios/`                    | C, D, A |
| POST   | `/api/anuncios/`                    | C       |
| GET    | `/api/anuncios/:id`                 | C, D, A |
| PUT    | `/api/anuncios/:id`                 | C       |
| DELETE | `/api/anuncios/:id`                 | C       |
| GET    | `/api/anuncios/anuncios/:id_evento` | C, D, A |
| GET    | `/api/anuncios/grupo/:id_grupo`     | C, D, A |

### Relatórios

| Método | Rota                            | Acesso |
| ------ | ------------------------------- | ------ |
| GET    | `/api/relatorios/sessoes`       | C      |
| GET    | `/api/relatorios/horas-docente` | C      |
| GET    | `/api/relatorios/alunos`        | C      |
| GET    | `/api/relatorios/docentes`      | C      |
| GET    | `/api/relatorios/exportar`      | C      |

### Salas

| Método | Rota             | Acesso |
| ------ | ---------------- | ------ |
| GET    | `/api/salas/`    | C      |
| DELETE | `/api/salas/:id` | C      |

---

## Configuração Local

### Pré-requisitos

- Node.js v20+

### Backend (`backend/`)

Criar o ficheiro `backend/.env`:

```
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

| Role         | Username | Password |
| ------------ | -------- | -------- |
| Coordenadora | admin    | admin    |
| Docente      | docente  | docente  |
| Aluno        | aluno    | aluno    |
