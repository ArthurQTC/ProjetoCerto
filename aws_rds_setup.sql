-- ====================================================================================
-- SCRIPT DE INICIALIZAÇÃO AWS RDS POSTGRESQL (Compatível com DBeaver e Prisma)
-- ====================================================================================

-- 1. Criação do Schema (opcional, normalmente public já existe)
CREATE SCHEMA IF NOT EXISTS public;

-- 2. Tabela: categorias 
-- (Sem dependências, deve ser criada primeiro)
CREATE TABLE IF NOT EXISTS public.categorias (
    id VARCHAR(255) PRIMARY KEY,
    nome VARCHAR(255) UNIQUE NOT NULL,
    "grupoCalculo" VARCHAR(255) NOT NULL
);

-- 3. Tabela: obras
-- (Sem dependências de outras tabelas de negócios, serve de pai para os itens)
CREATE TABLE IF NOT EXISTS public.obras (
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

-- 4. Tabela: itens_orcamento
-- (Depende de obras e categorias)
CREATE TABLE IF NOT EXISTS public.itens_orcamento (
    id VARCHAR(255) PRIMARY KEY,
    descricao VARCHAR(255) NOT NULL,
    valor DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    status VARCHAR(255) NOT NULL DEFAULT 'ATIVO',
    observacao TEXT,
    ordem INTEGER NOT NULL DEFAULT 0,
    subitens TEXT NOT NULL DEFAULT '[]',
    "obraId" VARCHAR(255) NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
    "categoriaId" VARCHAR(255) NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================================
-- ÍNDICES DE PERFORMANCE PARA BUSCAS E RELACIONAMENTOS (FOREIGN KEYS)
-- ====================================================================================

-- Acelerar buscas por status e cronologia na listagem de obras
CREATE INDEX IF NOT EXISTS idx_obras_status ON public.obras("statusContrato");
CREATE INDEX IF NOT EXISTS idx_obras_created_at ON public.obras("createdAt" DESC);

-- Acelerar leitura dos itens ao carregar uma obra e filtros por categoria
CREATE INDEX IF NOT EXISTS idx_itens_obra_id ON public.itens_orcamento("obraId");
CREATE INDEX IF NOT EXISTS idx_itens_categoria_id ON public.itens_orcamento("categoriaId");

-- Manter a ordenação do Drag-n-Drop rápida
CREATE INDEX IF NOT EXISTS idx_itens_ordem ON public.itens_orcamento("ordem" ASC);
