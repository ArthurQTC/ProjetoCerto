
-- Tabela de documentos
CREATE TYPE categoria_documento AS ENUM (
  'EDITAL', 'CONTRATO', 'MEDICAO', 'ART', 'CNO', 'ORCAMENTO', 
  'LEVANTAMENTO', 'NF', 'COMPROVANTE', 'OUTROS'
);

CREATE TABLE IF NOT EXISTS documentos (
  id VARCHAR(255) PRIMARY KEY,
  obra_id VARCHAR(255) NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  nome_arquivo VARCHAR(255) NOT NULL,
  nome_original VARCHAR(255) NOT NULL,
  extensao VARCHAR(50) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  tamanho_bytes BIGINT NOT NULL,
  categoria categoria_documento NOT NULL,
  s3_key VARCHAR(512) NOT NULL,
  s3_url VARCHAR(1024) NOT NULL,
  hash_arquivo VARCHAR(255),
  observacao TEXT,
  uploaded_by VARCHAR(255),
  versao INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_documentos_obra_id ON documentos(obra_id);
CREATE INDEX idx_documentos_categoria ON documentos(categoria);
CREATE INDEX idx_documentos_created_at ON documentos(created_at);
