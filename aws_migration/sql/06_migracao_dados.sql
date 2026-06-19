-- MIGRACAO DE DADOS - SCRIPT DE TRANSFORMACAO (JSON -> RELACIONAL)

-- ATENÇÃO: Execute este script após migrar a base atual para as novas tabelas (ou renomear as antigas).
-- Como os subitens antigamente estavam guardados como texto JSON array na coluna `subitens` da tabela `itens_orcamento`.

INSERT INTO subitens_orcamento (id, item_id, descricao, quantidade, unidade, valor_unitario, valor_total, created_at, updated_at)
SELECT
    'sub-' || substr(md5(random()::text), 1, 10) as id, 
    i.id as item_id,
    sub->>'descricao' as descricao,
    1 as quantidade,
    'un' as unidade,
    CAST(sub->>'valor' AS DOUBLE PRECISION) as valor_unitario,
    CAST(sub->>'valor' AS DOUBLE PRECISION) as valor_total,
    NOW() as created_at,
    NOW() as updated_at
FROM 
    itens_orcamento_old i, -- Tabela temporária contendo os dados de fallback
    json_array_elements(
        CASE 
            WHEN i.subitens IS NULL OR i.subitens = '' THEN '[]'::json
            WHEN i.subitens NOT LIKE '[%' THEN '[]'::json
            ELSE cast(i.subitens as json) 
        END
    ) as sub
WHERE i.subitens IS NOT NULL AND i.subitens != '[]';
