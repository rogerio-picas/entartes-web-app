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

