import { Pool } from "pg";

// --------------------------------------------------------------------------------------------------------------------
// A) REMOVER USO DO SUPABASE COMO ARMAZENAMENTO E CONFIGURAR O PULL EXCLUSIVAMENTE PARA AWS POSTGRESQL RDS
// --------------------------------------------------------------------------------------------------------------------

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necessário no RDS sem certificado verificado localmente
  },
  connectionTimeoutMillis: 5000,
});

// --------------------------------------------------------------------------------------------------------------------
// B) ESTABELECER CAMADA AUTO-HEALING DO POSTGRES (EXECUTADA AO INCIAR O SERVIDOR NODE (Ex. na função checkDbConnection))
// --------------------------------------------------------------------------------------------------------------------
export async function initializeAwsDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Categorias
    await client.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id VARCHAR(255) PRIMARY KEY,
        nome VARCHAR(255) UNIQUE NOT NULL,
        "grupoCalculo" VARCHAR(255) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Obras
    await client.query(`
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
        documentos TEXT NOT NULL DEFAULT '[]', /* FUTURO S3: migration pendente, manter legacy ou usar JSON via nova tabela documentos_s3 */
        "dataInicioContrato" VARCHAR(255),
        "dataFimContrato" VARCHAR(255),
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Itens Orçamento (Removido campo Subitens no esquema novo, transferido para tabela filha)
    await client.query(`
      CREATE TABLE IF NOT EXISTS itens_orcamento (
        id VARCHAR(255) PRIMARY KEY,
        descricao VARCHAR(255) NOT NULL,
        valor DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        status VARCHAR(255) NOT NULL DEFAULT 'ATIVO',
        observacao TEXT,
        ordem INTEGER NOT NULL DEFAULT 0,
        "obraId" VARCHAR(255) NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
        "categoriaId" VARCHAR(255) NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Nova Tabela: Subitens Orcamento Relacional
    await client.query(`
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
      )
    `);
    
    // Nova Tabela: Anexos e Documentos (S3 Support Framework)
    await client.query(`
      CREATE TABLE IF NOT EXISTS documentos_aws (
        id VARCHAR(255) PRIMARY KEY,
        obra_id VARCHAR(255) NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
        nome_original VARCHAR(255) NOT NULL,
        url_s3 TEXT,
        tamanho BIGINT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('COMMIT');
    console.log("Banco de dados RDS Inicializado/Normalizado (Relacional de Subitens Ok).");
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Erro na inicializacao RDS:", error);
  } finally {
    client.release();
  }
}

// --------------------------------------------------------------------------------------------------------------------
// C) EXEMPLO: REFACTOR DO INSERT DE ITENS + SUBITENS NA ROTA POST /api/obras/:id/itens
// --------------------------------------------------------------------------------------------------------------------

/*
  app.post("/api/obras/:id/itens", async (req, res) => {
    // ...
    const client = await pool.connect();
    try {
       await client.query('BEGIN');
       const itemId = "item-" + generateId();
       
       // 1. Inserir item
       await client.query(`
         INSERT INTO itens_orcamento (id, descricao, valor, status, observacao, ordem, "obraId", "categoriaId")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       `, [itemId, descricao, Number(valor), status, observacao, ordem, obraId, categoriaId]);

       // 2. Inserir Subitens na Nova Tabela (caso enviados)
       if (subitens && subitens.length > 0) {
         for (const sub of subitens) {
            const subId = "sub-" + generateId();
            await client.query(`
              INSERT INTO subitens_orcamento (id, item_id, descricao, valor_unitario, valor_total)
              VALUES ($1, $2, $3, $4, $5)
            `, [subId, itemId, sub.descricao, Number(sub.valor), Number(sub.valor)]);
         }
       }
       await client.query('COMMIT');
       // ... Response success
    } catch(err) {
       await client.query('ROLLBACK');
    } finally {
       client.release();
    }
  });
*/

// --------------------------------------------------------------------------------------------------------------------
// D) EXEMPLO: REFACTOR DA RECUPERAÇÃO DOS ITENS E SUBITENS NA TELA DE DETALHE
// --------------------------------------------------------------------------------------------------------------------

/*
  // No ponto em que o arquivo faz a JOIN Query
  const itensResult = await pool.query(`
      SELECT 
        i.*,
        c.nome as cat_nome,
        c."grupoCalculo" as cat_grupoCalculo,
        (
            SELECT json_agg(json_build_object(
               'id', s.id,
               'descricao', s.descricao,
               'valor', s.valor_total
            ))
            FROM subitens_orcamento s
            WHERE s.item_id = i.id
        ) as subitens
      FROM itens_orcamento i
      LEFT JOIN categorias c ON i."categoriaId" = c.id
      WHERE i."obraId" = $1
      ORDER BY i.ordem ASC
  `, [obraId]);

  // Isso garante que os subitens voltem aninhados (nested JSON formados do banco Postgres),
  // Compatível perfeitamente com o Array React existente na memória do Browser.
*/
