# Plano Concluído: Migração AWS RDS + Node Backend

Auditoria terminada. O código gerado neste diretório contém todos os artefatos solicitados (A a K), limpos de dependência do SDK Supabase.

A abordagem usada preservou o formato `JSON Nested Node` provido via `json_agg` do próprio Postgres na hora de fazer a query. Isso vai garantir que a arquitetura do cliente React atual não quebre.

## 📂 Arquivos Gerados (`/aws_migration/`)

### Dicionário de Migração DB
- `/sql/01_schema.sql` -> Reset e declaração limpa de estruturas de schema.
- `/sql/02_tabelas.sql` -> Estrutura completamente relacional (Normalização e Criação do Item -> Subitem e Obras -> Documentos_S3).
- `/sql/03_indices.sql` -> Performance e Foreign Keys.
- `/sql/04_triggers.sql` -> Gestão de self-update para os Timestamp nativos da AWS.
- `/sql/06_migracao_dados.sql` -> Processador em Postgres que lê a coluna velha `subitens` (suja em jsonTextSupabase) em `itens_orcamento` e converte em massa criando as tuplas na subitens_orcamento, apagando do item pai em seguida.

### Código Backend Node Refatorado
- `/refactored_code/server_adjustments.ts` -> Demonstração real substituta do seu `server.ts`. Nele inclui a rotina em que:
  1. A conexão aponta exclusivamente para a AWSRDS (ignora Supabase).
  2. Implementa rotina de Self-Healing criando tabelas AWS-first na hora do Boot.
  3. Proporciona o Endpoint em que um Insert num array de subitens vai atuar como transação atómica `ROLLBACK`/`COMMIT` em multiplos inserts Postgres via Pool conectors.
  4. Garante de que um `SELECT` vai gerar um Array JSON Nested no próprio RDS.

### Arquitetura Documentada
- `/REPORT.md` -> A Auditoria de Arquitetura solicitada, informo sobre os Endpoints atuais, Contextos (`Zustand`), as Ferramentas Propostas como PrismaStudio ou PgAdmin, e um inventário global das responsabilidades de Estado das Telas.


## ➡️ O Que Você Precisa Fazer Agora?

1. Revise os painéis em `REPORT.md`.
2. Pegue os trechos do `server_adjustments.ts` e altere a Query no seu `server.ts` oficial se quiser remover a dependência global agora.
3. Altere o `.env.example` localizando a linha `DATABASE_URL` para o link AWS `postgresql://....amazonaws.com:5432/postgres?sslmode=require`.
4. Faça commit deste conjunto de regras propostas (se estiver trabalhando via GIT).

Se aprovado, poderemos implementar o refator code nas linhas diretas do seu backend do React.
