# 🚀 MIGRAÇÃO: SUPABASE -> POSTGRESQL AWS RDS (Definitivo)

Este documento detalha todos os passos e artefatos gerados para a migração definitiva da infraestrutura do Supabase para AWS RDS PostgreSQL, Node/Express e S3.

---

## 🏗️ FASE 1 - INVENTÁRIO COMPLETO

### 📦 Supabase Services
Nenhum Client Side SDK do Supabase está estruturalmente acoplado usando bibliotecas nativas como `@supabase/supabase-js`, porém existem dependências lógicas:
1. **Database**: A aplicação Node usa `pg` para conectar à URL do Supabase via `DATABASE_URL`.
2. **Storage**: Atualmente, imagens como logotipos são recuperadas usando links diretos para a Cloud Storage do Supabase (ex. no arquivo `src/App.tsx` e `src/components/ObraDetailView.tsx`).

### 💾 Tabelas (Em Uso Atualmente)
1. `categorias` (ID, nome, grupoCalculo)
2. `obras` (ID, nome, cliente, observacoes, valorContrato, statusContrato, documentos `JSON string`, etc.)
3. `itens_orcamento` (ID, descricao, valor, status, observacao, ordem, subitens `JSON string`, obraId, categoriaId)

### 🧠 Entidades no Memory State (Fallback)
1. `memoryObras`
2. `memoryItens`
3. `memoryCategorias`
- **Arquivo**: `server.ts`
- **Responsabilidade**: Fornece os dados como fallback assíncrono caso o banco não retorne, e é escrito dinamicamente quando a query PostgreSQL falha. (A ser depreciado ou limitado ao mínimo).

### 🧩 Front-End State & Contexts
- **Zustand `useUIStore`**: Controla UI e Layout (`src/store.ts`).
- **Zustand `useItemsStore`**: Sincroniza estado transitório de subitens para arrastar (drag) e otimizar tempo de resposta da UI.

---

## 🗄️ FASE 2 - NORMALIZAÇÃO DO BANCO

A modelagem de dados estava atrelada fortemente a tipos transientes em vez de modelagem relacional formal, como visível pela presença de strings JSON para guardar multiplos `documentos` e `subitens`.

**Obras e Categorias** → Já relacionais, precisariam apenas seguir padrão de chaves.
**itens_orcamento** → Subitens viram tabela relacional.
**obras.documentos** → Documentos viram tabela separada (Anexos em S3 bucket AWS).

### Tabela Proposta:
`obras`
`categorias_orcamento` (nome_antigo: categorias)
`itens_orcamento`
`subitens_orcamento` *(Nova tabela separada)*
`documentos` *(Nova tabela conectada a obras e ao AWS S3)*
`tarefas` *(Opcional / Novo)*
`checklist` *(Opcional / Novo)*

*(Os scripts SQL encontram-se na pasta `sql/` gerada acompanhando este manual).*

---

## 🌐 FASE 5 - REFATORAÇÃO DO BACKEND (AWS PG POOL)

O backend deve passar das chamadas isoladas por queries avulsas com blocos textuais (`await pool.query(...)` e ifs do Supabase) para suportar as 6 tabelas oficialmente e auto-reparar seu esquema através do Self-Healing `CREATE TABLE`.

Onde modificar:
1. **S3**: Atualização do provedor da imagem principal estática em `App.tsx` e `ObraDetailView.tsx` e criação da API Endpoint `POST /api/upload`.
2. **Postgres POOL**: O arquivo `server.ts` unificará o CRUD de Obras/Itens com Queries a tabela `subitens_orcamento`.

As rotinas para manter a auto-criação de tabelas caso não existam (Self Handling / Healing) devem existir nos métodos the inicialização do PG em `server.ts`.

---

## 🗑️ FASE 6 - REMOVER DEPENDÊNCIAS OBSOLETAS

- Links remotos que contenham o domínio `supabase.co`.
- O array local de salvamento `fs.writeFileSync(...)` e `fs.readFileSync(...)` referentes à memória de dbJson e Fallback (degradam infra de nuvem multi-layer).

**Variáveis de Ambiente Necessárias (.env):**

```env
# URL RDS da AWS (Ajuste usuário e senha)
DATABASE_URL="postgresql://USUARIO:SENHA@gestao-obras-db.c96iewoq88g1.us-east-2.rds.amazonaws.com:5432/postgres?sslmode=require"

# Futuro AWS S3 para documentações e imagens:
AWS_REGION="us-east-2"
AWS_ACCESS_KEY_ID="XXXXXX"
AWS_SECRET_ACCESS_KEY="XXXXXXX"
AWS_S3_BUCKET="gestao-obras-documentos"
```

---

## 🛠️ FASE 8 - PAINEL ADMINISTRATIVO DO BANCO

Existem algumas opções notáveis para a AWS:

1. **Prisma Studio**: 
   - **Vantagens**: Interface web limpa, gerada automaticamente do ORM. Excelente para o dia a dia e para consultar dados formatados.
   - **Uso Recomendado**: Quando implementar Prisma (`npx prisma studio`).

2. **PgAdmin 4**:
   - **Vantagens**: A interface mais poderosa para Postgres. Suporte completo a DB, visualização, importações. 
   - **Uso Recomendado**: Instalar na máquina local ou em container Docker e conectar pela String (Host: `gestao-obras-db...`, Porta: `5432`). É a melhor para administração diária completa de RDS.

3. **DBeaver / CloudBeaver**:
   - **Vantagens**: DBeaver é a melhor solução local para desktop se o desenvolvedor trabalhar sozinho. Muito robusto e auto-completa queries.
   - **Uso Recomendado**: Fazer tunelamento SSH para acessar a DB.

**Vencedor Global para este ecossistema Node**: 
Para devs do TS, migrar a arquitetura visual local para *Prisma Studio* e conectar ao *DBeaver* no Desktop para consultas SQL avançadas.
