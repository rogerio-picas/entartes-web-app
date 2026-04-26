# entartes-web-app

# Entartes Web App - Backend

Este é o repositório da API do projeto **Entartes**, desenvolvido com **Node.js**, **Express** e **Prisma ORM**, utilizando o **NeonDB (PostgreSQL)** como base de dados.

---

## Pré-requisitos

Antes de começares, garante que tens instalado na tua máquina:
* **Node.js** (v20 ou superior)
* **npm** ou **yarn**
* Acesso à Connection String do **NeonDB** (ex: postgresql://neondb_owner:npg_[password]-lively-band-al5iq8o4-pooler...)

---

Para mais info sobre login e testes com o Postman -> ficheiro startConfiguration.ms

## Configuração Inicial (Setup)

Segue estes passos para configurar o ambiente de desenvolvimento local:

### 1. Clonar o Repositório
```bash
git clone [https://github.com/rogerio-picas/entartes-web-app.git](https://github.com/rogerio-picas/entartes-web-app.git)


cd entartes-web-app/backend

### - 2. Instalar Dependências
Dentro da pasta backend, executa:

npm install

### - 3. Variáveis de Ambiente
Cria um ficheiro .env na pasta backend/ e adiciona a tua connection string do neonDB:

DATABASE_URL="postgresql://neondb_owner:npg_[password]-lively-band-al5iq8o4-pooler.."

### - 4. Gerar o Prisma Client
Para que o teu código reconheça os modelos da base de dados

npx prisma generate

### - Comandos Úteis

npm start - Inicia o servidor Node.js.

npx prisma db pull
Atualiza o schema.prisma com base no que já existe na BD.

npx prisma generate
Regenera o cliente após alterares o schema.prisma.

npx prisma studio
Interface gráfica para visualizar/editar dados da BD no browser.



### Diagrama de Classes (Arquitetura SOLID)

```mermaid
classDiagram
    direction TB

    %% --- INFRAESTRUTURA E PERSISTÊNCIA ---
    class PrismaClient {
        <<Infrastructure>>
        +utilizador
        +marcacao
        +evento
        +grupo
        +sala
        +modalidade
        +executeRaw()
    }

    %% --- MÓDULO AUTH & USERS ---
    class AuthController {
        -IAuthService authService
        +login(req, res)
        +getMe(req, res)
    }
    class UserController {
        -IUserService userService
        +getUsers(req, res)
        +createUser(req, res)
        +updateUser(req, res)
        +deleteUser(req, res)
        +atualizarPassword(req, res)
        +atualizarDadosPessoais(req, res)
    }

    %% --- MÓDULO COACHING (SEGREGADO POR ATOR) ---
    class AlunoCoachingController {
        -ICoachingService service
        +consultarDisponibilidades(req, res)
        +solicitarMarcacao(req, res)
        +listarMeusPedidos(req, res)
        +cancelarPedidoPendente(req, res)
        +confirmarPresencaGrupo(req, res)
        +listarColegas(req, res)
    }

    class DocenteCoachingController {
        -ICoachingService service
        +listarMinhasAulas(req, res)
        +validarConclusaoSessao(req, res)
        +cancelarMarcacao(req, res)
    }

    class CoordenacaoCoachingController {
        -ICoachingService service
        +listarPedidosPendentes(req, res)
        +confirmarMarcacao(req, res)
        +rejeitarMarcacao(req, res)
        +reatribuirSala(req, res)
        +concluirMarcacao(req, res)
    }

    %% --- MÓDULO EVENTOS E GRUPOS ---
    class EventController {
        -IEventService eventService
        +listarEventos(req, res)
        +criarEvento(req, res)
        +editarEvento(req, res)
        +cancelarEvento(req, res)
        +listarParticipantes(req, res)
    }

    class GroupController {
        -IGroupService groupService
        +criarGrupo(req, res)
        +editarGrupo(req, res)
        +adicionarAlunoAoGrupo(req, res)
        +removerAlunoDoGrupo(req, res)
        +adicionarDocenteAoGrupo(req, res)
    }

    %% --- MÓDULO ADMIN & RELATÓRIOS ---
    class SalaController {
        +listSalas(req, res)
        +createSala(req, res)
    }

    class RelatorioController {
        -IRelatorioService service
        +getSessoesRelatorio(req, res)
        +getHorasDocente(req, res)
        +exportCSV(req, res)
    }

    %% --- SERVICES (LÓGICA DE NEGÓCIO) ---
    class CoachingService {
        +verificarRegrasSobreposicao()
        +validarPrazoCancelamento()
        +notificarAlteracaoEstado()
    }

    class EventService {
        +validarCapacidadeSalas()
        +gerirCicloVidaEvento()
    }

    %% --- RELAÇÕES ---
    AuthController ..> AuthService
    UserController ..> UserService
    
    AlunoCoachingController ..> CoachingService
    DocenteCoachingController ..> CoachingService
    CoordenacaoCoachingController ..> CoachingService
    
    EventController ..> EventService
    GroupController ..> GroupService
    
    RelatorioController ..> RelatorioService

    %% Todos os Services dependem do Prisma
    AuthService --> PrismaClient
    UserService --> PrismaClient
    CoachingService --> PrismaClient
    EventService --> PrismaClient
    GroupService --> PrismaClient
    RelatorioService --> PrismaClient

    %% Estilos
    style PrismaClient fill:#f9f,stroke:#333
    style AuthController fill:#e1f5fe
    style UserController fill:#e1f5fe
    style AlunoCoachingController fill:#e1f5fe
    style DocenteCoachingController fill:#e1f5fe
    style CoordenacaoCoachingController fill:#e1f5fe
    style EventController fill:#e1f5fe
    style GroupController fill:#e1f5fe
