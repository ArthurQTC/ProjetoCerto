-- FUNÇÃO GLOBAL DE AUTO-UPDATE TIMESTAMP
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- APLICAÇÃO DOS TRIGGERS DE UPDATED_AT
CREATE TRIGGER trg_categorias_updated_at
BEFORE UPDATE ON categorias_orcamento
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_obras_updated_at
BEFORE UPDATE ON obras
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_documentos_updated_at
BEFORE UPDATE ON documentos
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_itens_orcamento_updated_at
BEFORE UPDATE ON itens_orcamento
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_subitens_orcamento_updated_at
BEFORE UPDATE ON subitens_orcamento
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_tarefas_updated_at
BEFORE UPDATE ON tarefas
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_checklist_updated_at
BEFORE UPDATE ON checklist
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- TRIGGER DE AUTO-CÁLCULO (Opcional):
-- Pode ser adicionado para propagar SUM(valor_total) de subitens_orcamento para itens_orcamento
-- CREATE OR REPLACE FUNCTION calc_item_total() RETURNS TRIGGER AS $$
-- BEGIN
--    UPDATE itens_orcamento SET valor = (SELECT COALESCE(SUM(valor_total), 0) FROM subitens_orcamento WHERE item_id = NEW.item_id) WHERE id = NEW.item_id;
--    RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
