-- ÍNDICES DE PERFORMANCE E CHAVES ESTRANGEIRAS

-- Índices para buscas frequentes
CREATE INDEX idx_obras_status ON obras("statusContrato");
CREATE INDEX idx_documentos_obra ON documentos(obra_id);
CREATE INDEX idx_itens_orcamento_obra ON itens_orcamento(obra_id);
CREATE INDEX idx_itens_orcamento_categoria ON itens_orcamento(categoria_id);
CREATE INDEX idx_subitens_orcamento_item ON subitens_orcamento(item_id);
CREATE INDEX idx_tarefas_obra ON tarefas(obra_id);
CREATE INDEX idx_tarefas_status ON tarefas(status);
CREATE INDEX idx_checklist_tarefa ON checklist(tarefa_id);

-- Índices de ordenação comuns
CREATE INDEX idx_obras_created_at ON obras(created_at DESC);
CREATE INDEX idx_itens_orcamento_ordem ON itens_orcamento(ordem ASC);
