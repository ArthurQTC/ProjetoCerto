-- 00_full_install.sql
-- SCRIPT DE INSTALAÇÃO COMPLETA: SCHEMAS, TABELAS, FKs, ÍNDICES, TRIGGERS

-- 1. SCHEMA
CREATE SCHEMA IF NOT EXISTS public;

-- 2. TABELAS
CREATE TABLE IF NOT EXISTS categorias (
    id VARCHAR(255) PRIMARY KEY,
    nome VARCHAR(255) UNIQUE NOT NULL,
    "grupoCalculo" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS obras (
    id VARCHAR(255) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cliente VARCHAR(255),
    observacoes TEXT,
    "valorContrato" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "statusContrato" VARCHAR(255) NOT NULL DEFAULT 'CONSOLIDADO',
    "etapaLevantamento" BOOLEAN NOT NULL DEFAULT FALSE,
    "etapaProjeto" BOOLEAN NOT NULL DEFAULT FALSE,
    "etapaCotacao" BOOLEAN NOT NULL DEFAULT FALSE,
    "etapaFabricacao" BOOLEAN NOT NULL DEFAULT FALSE,
    prazo VARCHAR(255),
    "numeroPedido" VARCHAR(255),
    documentos TEXT NOT NULL DEFAULT '[]',
    "dataInicioContrato" VARCHAR(255),
    "dataFimContrato" VARCHAR(255),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS itens_orcamento (
    id VARCHAR(255) PRIMARY KEY,
    descricao VARCHAR(255) NOT NULL,
    valor DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    status VARCHAR(255) NOT NULL DEFAULT 'ATIVO',
    observacao TEXT,
    ordem INTEGER NOT NULL DEFAULT 0,
    "obraId" VARCHAR(255) NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    "categoriaId" VARCHAR(255) NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subitens_orcamento (
    id VARCHAR(255) PRIMARY KEY,
    item_id VARCHAR(255) NOT NULL REFERENCES itens_orcamento(id) ON DELETE CASCADE,
    descricao VARCHAR(500) NOT NULL,
    quantidade DOUBLE PRECISION DEFAULT 1,
    unidade VARCHAR(50) DEFAULT 'un',
    valor_unitario DOUBLE PRECISION DEFAULT 0.0,
    valor_total DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documentos_aws (
    id VARCHAR(255) PRIMARY KEY,
    obra_id VARCHAR(255) NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    nome_original VARCHAR(255) NOT NULL,
    url_s3 TEXT NOT NULL,
    tamanho BIGINT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ÍNDICES DE PERFORMANCE E CHAVES ESTRANGEIRAS
CREATE INDEX IF NOT EXISTS idx_obras_status ON obras("statusContrato");
CREATE INDEX IF NOT EXISTS idx_itens_orcamento_obra ON itens_orcamento("obraId");
CREATE INDEX IF NOT EXISTS idx_itens_orcamento_categoria ON itens_orcamento("categoriaId");
CREATE INDEX IF NOT EXISTS idx_subitens_orcamento_item ON subitens_orcamento(item_id);
CREATE INDEX IF NOT EXISTS idx_itens_ordem ON itens_orcamento(ordem ASC);

-- 4. FUNÇÃO AUXILIAR E TRIGGERS (UPDATED_AT)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW."updatedAt" = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_categorias_updated_at ON categorias;
CREATE TRIGGER trg_categorias_updated_at
BEFORE UPDATE ON categorias
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_obras_updated_at ON obras;
CREATE TRIGGER trg_obras_updated_at
BEFORE UPDATE ON obras
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_itens_orcamento_updated_at ON itens_orcamento;
CREATE TRIGGER trg_itens_orcamento_updated_at
BEFORE UPDATE ON itens_orcamento
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_subitens_orcamento_updated_at ON subitens_orcamento;
CREATE TRIGGER trg_subitens_orcamento_updated_at
BEFORE UPDATE ON subitens_orcamento
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
