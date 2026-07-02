-- ====================================================================
-- SCRIPT DE CRIAÇÃO E CONFIGURAÇÃO DO NOVO BANCO DE DATOS AWS RDS
-- ====================================================================
-- Este script recria de forma exata a estrutura do banco de dados 
-- "gestao-obras" no novo banco de dados PostgreSQL.
-- ====================================================================

-- 1. Criação da Tabela de Projetos / Obras
CREATE TABLE IF NOT EXISTS "obras" (
  "id" VARCHAR(255) PRIMARY KEY,
  "nome" VARCHAR(255) NOT NULL,
  "cliente" VARCHAR(255),
  "observacoes" TEXT,
  "valorContrato" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "statusContrato" VARCHAR(255) NOT NULL DEFAULT 'CONSOLIDADO',
  "etapaLevantamento" BOOLEAN NOT NULL DEFAULT false,
  "etapaProjeto" BOOLEAN NOT NULL DEFAULT false,
  "etapaCotacao" BOOLEAN NOT NULL DEFAULT false,
  "etapaFabricacao" BOOLEAN NOT NULL DEFAULT false,
  "prazo" VARCHAR(255),
  "numeroPedido" VARCHAR(255),
  "documentos" TEXT NOT NULL DEFAULT '[]',
  "dataInicioContrato" VARCHAR(255),
  "dataFimContrato" VARCHAR(255),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices de desempenho para a tabela de Obras
CREATE INDEX IF NOT EXISTS "idx_obras_created_at" ON "obras" USING btree ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_obras_status" ON "obras" USING btree ("statusContrato");


-- 2. Criação da Tabela de Categorias
CREATE TABLE IF NOT EXISTS "categorias" (
  "id" VARCHAR(255) PRIMARY KEY,
  "nome" VARCHAR(255) UNIQUE NOT NULL,
  "grupoCalculo" VARCHAR(255) NOT NULL
);


-- 3. Criação da Tabela de Itens de Orçamento
CREATE TABLE IF NOT EXISTS "itens_orcamento" (
  "id" VARCHAR(255) PRIMARY KEY,
  "descricao" VARCHAR(255) NOT NULL,
  "valor" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "status" VARCHAR(255) NOT NULL DEFAULT 'ATIVO',
  "observacao" TEXT,
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "subitens" TEXT NOT NULL DEFAULT '[]',
  "obraId" VARCHAR(255) NOT NULL,
  "categoriaId" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices de desempenho e chaves estrangeiras para Itens de Orçamento
CREATE INDEX IF NOT EXISTS "idx_itens_categoria_id" ON "itens_orcamento" USING btree ("categoriaId");
CREATE INDEX IF NOT EXISTS "idx_itens_obra_id" ON "itens_orcamento" USING btree ("obraId");
CREATE INDEX IF NOT EXISTS "idx_itens_ordem" ON "itens_orcamento" USING btree ("ordem");

-- Restrições de Integridade (Chaves Estrangeiras) com ON DELETE CASCADE
ALTER TABLE "itens_orcamento" 
  ADD CONSTRAINT "itens_orcamento_obraId_fkey" 
  FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE CASCADE;

ALTER TABLE "itens_orcamento" 
  ADD CONSTRAINT "itens_orcamento_categoriaId_fkey" 
  FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE CASCADE;

-- 4. Criação da Tabela de Usuários
CREATE TABLE IF NOT EXISTS "usuarios" (
  "id" VARCHAR(255) PRIMARY KEY,
  "nome" VARCHAR(255) NOT NULL,
  "nome_usuario" VARCHAR(255) UNIQUE NOT NULL,
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "senha" VARCHAR(255) NOT NULL,
  "nivel" VARCHAR(50) NOT NULL DEFAULT 'OPERADOR',
  "permissoes" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserir usuário administrador padrão
INSERT INTO "usuarios" ("id", "nome", "nome_usuario", "email", "senha", "nivel", "permissoes")
VALUES (
  'usr-admin-master-001',
  'Administrador',
  'admin',
  'admin@projetocerto.com',
  'e6c382b6c7ee63e5cc4697e171b3e1a0b3684a0d9e4a3e7dbb0c95cc7a8929e70197d1b32d2077e3',
  'ADMIN',
  '{"modulos":{"dashboard":"editar","contratosConsolidados":"editar","orcamentosAFechar":"editar","etapasContrato":"editar","levantamentosOrcamentos":"editar","usuarios":"editar"},"indicadores":{"totalContratos":"editar","totalVisaoGeral":"editar","totalMargem":"editar","percentualMedio":"editar","totalAdm":"editar","kpiProjecao":"editar","kpiAdm":"editar","graficoCustos":"editar"},"colunas":{"valorContrato":"editar","margemLiquida":"editar","custoAdm":"editar","valorItens":"editar","subestruturas":"editar"},"acoes":{"visualizar":"editar","editar":"editar"}}'
) ON CONFLICT ("email") DO NOTHING;

-- 5. Criação da Tabela de Sessões
CREATE TABLE IF NOT EXISTS "sessoes" (
  "id" VARCHAR(255) PRIMARY KEY,
  "usuarioId" VARCHAR(255) NOT NULL,
  "expiracao" TIMESTAMP WITH TIME ZONE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sessoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE
);

-- 6. Criação da Tabela de Configurações do Sistema
CREATE TABLE IF NOT EXISTS "configuracoes_sistema" (
  "chave" VARCHAR(255) PRIMARY KEY,
  "valor" VARCHAR(255) NOT NULL
);

-- 7. Adicionando campos extras na tabela obras
ALTER TABLE "obras" ADD COLUMN IF NOT EXISTS "custoAdm" DOUBLE PRECISION;
ALTER TABLE "obras" ADD COLUMN IF NOT EXISTS "levantamentoId" VARCHAR(255);

-- 8. Tabela de Levantamentos
CREATE TABLE IF NOT EXISTS "levantamentos" (
  "id" VARCHAR(255) PRIMARY KEY,
  "ref" VARCHAR(255) NOT NULL,
  "obra" VARCHAR(255),
  "cliente" VARCHAR(255),
  "dataSolicitacao" VARCHAR(255),
  "abc" VARCHAR(255),
  "solicitante" VARCHAR(255),
  "responsavel" VARCHAR(255),
  "status" VARCHAR(255),
  "previsao" VARCHAR(255),
  "qtdM2" DOUBLE PRECISION,
  "statusEnvio" VARCHAR(255),
  "contratoAFecharId" VARCHAR(255),
  "subestruturas" TEXT,
  "subestruturas_pc" TEXT,
  "origemLeads" VARCHAR(255) DEFAULT 'Projeto Certo',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Tabela de Materiais de Levantamento
CREATE TABLE IF NOT EXISTS "levantamento_materiais" (
  "id" VARCHAR(255) PRIMARY KEY,
  "levantamento_id" VARCHAR(255) NOT NULL REFERENCES levantamentos(id) ON DELETE CASCADE,
  "material" TEXT NOT NULL,
  "qtd_m2" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Tabela de Documentos
DO $$ BEGIN
    CREATE TYPE categoria_documento AS ENUM (
      'EDITAL', 'CONTRATO', 'MEDICAO', 'ART', 'CNO', 'ORCAMENTO', 
      'LEVANTAMENTO', 'NF', 'COMPROVANTE', 'OUTROS'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "documentos" (
  "id" VARCHAR(255) PRIMARY KEY,
  "obra_id" VARCHAR(255) NOT NULL,
  "nome_arquivo" VARCHAR(255) NOT NULL,
  "nome_original" VARCHAR(255) NOT NULL,
  "extensao" VARCHAR(50) NOT NULL,
  "mime_type" VARCHAR(100) NOT NULL,
  "tamanho_bytes" BIGINT NOT NULL,
  "categoria" categoria_documento NOT NULL,
  "s3_key" VARCHAR(512),
  "s3_url" VARCHAR(1024),
  "caminho_local" VARCHAR(512),
  "hash_arquivo" VARCHAR(255),
  "observacao" TEXT,
  "uploaded_by" VARCHAR(255),
  "versao" INTEGER DEFAULT 1,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "deleted_at" TIMESTAMP WITH TIME ZONE,
  CONSTRAINT "documentos_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE CASCADE
);

