# Guia de Configuração do Backend

Sigam os passos abaixo para configurar e executar o servidor localmente.

---

### Pré-requisitos
Antes de começar, certifiquem-se de configurar o ficheiro `.env` na raiz da pasta `backend` ( utilizar o ficheiro `.env_ex` com os respetivos dados.).

---

### Passos para Instalação

#### 1. Aceder ao diretório do projeto
```bash
cd backend

```bash
npm install

```bash
npx prisma db pull

```bash
npx prisma generate

```bash
npm start

---
#### 2. Fazer login através do Postman

Contas para testes:
 codigo_utilizador: admin
 password: admin

 codigo_utilizador: docente
 password: docente

 codigo_utilizador: aluno
 password: aluno

Certifiquem-se de inserir o token obtido na Authentication -> Bearer Token
E por fim fazem SEND


