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
