import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import fs from "fs";

// Sanitize and normalize database connection string
function sanitizeDbUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  if (url.startsWith('"') && url.endsWith('"')) {
    url = url.slice(1, -1).trim();
  } else if (url.startsWith("'") && url.endsWith("'")) {
    url = url.slice(1, -1).trim();
  }

  if (!url.startsWith("postgres://") && !url.startsWith("postgresql://")) {
    return url;
  }

  try {
    const protocolMatch = url.match(/^(postgresql|postgres):\/\//);
    if (!protocolMatch) return url;
    const protocol = protocolMatch[0];
    const mainPart = url.slice(protocol.length);

    const queryIdx = mainPart.indexOf("?");
    let hostDbPart = queryIdx !== -1 ? mainPart.slice(0, queryIdx) : mainPart;
    const queryStr = queryIdx !== -1 ? mainPart.slice(queryIdx) : "";

    const lastAtIdx = hostDbPart.lastIndexOf("@");
    if (lastAtIdx === -1) return url;

    const credentialsStr = hostDbPart.slice(0, lastAtIdx);
    const hostDb = hostDbPart.slice(lastAtIdx + 1);

    const colonIdx = credentialsStr.indexOf(":");
    let user = credentialsStr;
    let password = "";
    if (colonIdx !== -1) {
      user = credentialsStr.slice(0, colonIdx);
      password = credentialsStr.slice(colonIdx + 1);
    }

    // Strip bracket formatting if it wraps the password
    let cleanedPassword = password;
    if (cleanedPassword.startsWith("[") && cleanedPassword.endsWith("]")) {
      cleanedPassword = cleanedPassword.slice(1, -1);
    } else if (cleanedPassword.startsWith("<") && cleanedPassword.endsWith(">")) {
      cleanedPassword = cleanedPassword.slice(1, -1);
    }

    // Now, URL-encode user and password if they contain special characters (but don't double encode!)
    const encodeIfRequired = (str: string) => {
      if (str.includes("%")) {
        try {
          if (decodeURIComponent(str) !== str) {
            return str; // Already encoded
          }
        } catch (e) {}
      }
      return encodeURIComponent(str);
    };

    const encodedUser = encodeIfRequired(user);
    const encodedPassword = encodeIfRequired(cleanedPassword);

    return `${protocol}${encodedUser}:${encodedPassword}@${hostDb}${queryStr}`;
  } catch (e) {
    console.error("Erro ao higienizar a DATABASE_URL:", e);
    return url;
  }
}

// Sanitize and sync DATABASE_URL from process.env to .env file to ensure Prisma CLI and client both use the exact same variable
let rawDbUrl = process.env.DATABASE_URL || "";
rawDbUrl = sanitizeDbUrl(rawDbUrl);

if (rawDbUrl !== "") {
  process.env.DATABASE_URL = rawDbUrl; // Update process.env with the sanitized value
  try {
    const envPath = path.join(process.cwd(), ".env");
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
    }
    
    const matchLine = `DATABASE_URL="${rawDbUrl}"`;
    const altMatchLine = `DATABASE_URL=${rawDbUrl}`;
    
    if (!envContent.includes(matchLine) && !envContent.includes(altMatchLine)) {
      let lines = envContent.split("\n");
      let updated = false;
      lines = lines.map(line => {
        if (line.trim().startsWith("DATABASE_URL=")) {
          updated = true;
          return `DATABASE_URL="${rawDbUrl}"`;
        }
        return line;
      });
      if (!updated) {
        lines.push(`DATABASE_URL="${rawDbUrl}"`);
      }
      fs.writeFileSync(envPath, lines.join("\n"), "utf-8");
      console.log("[Prisma Sync] DATABASE_URL sincronizada com o arquivo .env com sucesso!");
    }
  } catch (err) {
    console.error("[Prisma Sync] Falha ao gravar DATABASE_URL no .env:", err);
  }
}

import { createServer as createViteServer } from "vite";
import pg from "pg";
const { Pool } = pg;

const PORT = 3000;
let rdsPoolNative: pg.Pool | null = null;
let supabasePoolNative: pg.Pool | null = null;

let dbConnectedRds = false;
let dbConnectedSupabase = false;

let dbConnected = false;
let dbCheckInProgress = false;

function checkHasPlaceholder(url: string) {
  return url.includes("[PASSWORD]") || 
         url.includes("<PASSWORD>") || 
         url.includes("[SENHA]") || 
         url.includes("<SENHA>") ||
         url.includes("[YOUR_PASSWORD]") ||
         url.includes("SENHA_DO_BANCO") ||
         url.includes("YOUR_PASSWORD") ||
         url.includes("[PROJETO]");
}

// Wrapper pool isolado exclusivamente para o AWS RDS
const pool = {
  query: async (...args: any[]) => {
    if (!dbConnectedRds || !rdsPoolNative) {
      throw new Error("Erro Crítico: AWS RDS não está conectado ou configurado.");
    }

    const queryStr = typeof args[0] === 'string' ? args[0].toUpperCase() : '';
    const isWrite = queryStr.includes('INSERT ') || queryStr.includes('UPDATE ') || queryStr.includes('DELETE ');

    if (isWrite) {
      console.log("WRITING TO: AWS RDS");
      console.log(`QUERY: ${queryStr.substring(0, 50)}...`);
    }

    try {
      const result = await rdsPoolNative.query(...args as [any]);
      if (isWrite) {
        console.log("INSERT EXECUTED ON RDS");
      }
      return result;
    } catch (e: any) {
      console.error(`[RDS INSERT ERROR] Falha na query.`);
      console.error(`Query Executada:`, args[0]);
      console.error(`Values:`, args[1]);
      console.error(`Erro completo do PostgreSQL:`, e);
      throw e;
    }
  },
  connect: async () => {
    if (!dbConnectedRds || !rdsPoolNative) {
      throw new Error("Erro Crítico: AWS RDS não está conectado.");
    }
    return await rdsPoolNative.connect();
  }
} as pg.Pool;

// Dynamic pool client recreation
function recreateDbClient() {
  let urlRds = process.env.DATABASE_URL_RDS || "";
  urlRds = sanitizeDbUrl(urlRds);

  // Tentando RDS
  if (urlRds && (urlRds.startsWith("postgres://") || urlRds.startsWith("postgresql://")) && !checkHasPlaceholder(urlRds)) {
    try {
      if (rdsPoolNative) rdsPoolNative.end().catch(() => {});
      rdsPoolNative = new Pool({
        connectionString: urlRds,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
      });
      console.log("[pg] Pool RDS (AWS) instanciado com exclusividade.");
    } catch (err) {
      console.error("[pg] Erro instanciando pool RDS:", err);
    }
  } else {
    if (rdsPoolNative) rdsPoolNative.end().catch(() => {});
    rdsPoolNative = null;
    console.error("[pg] Nenhuma DATABASE_URL_RDS válida configurada.");
  }
}

async function checkDbConnection() {
  if (dbCheckInProgress) return dbConnected;
  dbCheckInProgress = true;
  
  try {
    recreateDbClient();

    // 1. Testa RDS ÚNICO
    if (rdsPoolNative) {
      try {
        await Promise.race([
          rdsPoolNative.query("SELECT 1"),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout de conexão RDS (4s)")), 4000))
        ]);
        dbConnectedRds = true;
        console.log("[pg] Conexão EXCLUSIVA com AWS RDS estabelecida com sucesso.");
      } catch (e: any) {
        dbConnectedRds = false;
        console.warn(`[pg] AWS RDS falhou no Health Check: ${e.message}`);
      }
    } else {
      dbConnectedRds = false;
    }

    dbConnectedSupabase = false; // Forçar falso
    dbConnected = dbConnectedRds;

    if (dbConnected) {
      console.log(`[pg] Sistema conectado. FONTE ÚNICA DE ESCRITA: AWS RDS`);
      // Automatically create and migrate all tables
      try {
        console.log("[pg Sync] Inicializando/Verificando tabelas no banco de dados...");
        
        await pool.query(`
          CREATE TABLE IF NOT EXISTS categorias (
            id VARCHAR(255) PRIMARY KEY,
            nome VARCHAR(255) UNIQUE NOT NULL,
            "grupoCalculo" VARCHAR(255) NOT NULL
          )
        `);

        await pool.query(`
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
          )
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS itens_orcamento (
            id VARCHAR(255) PRIMARY KEY,
            descricao VARCHAR(255) NOT NULL,
            valor DOUBLE PRECISION NOT NULL DEFAULT 0.0,
            status VARCHAR(255) NOT NULL DEFAULT 'ATIVO',
            observacao TEXT,
            ordem INTEGER NOT NULL DEFAULT 0,
            subitens TEXT NOT NULL DEFAULT '[]',
            "obraId" VARCHAR(255) NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
            "categoriaId" VARCHAR(255) NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Apply any missing columns (Postgres ADD COLUMN IF NOT EXISTS guarantees safety)
        await pool.query('ALTER TABLE obras ADD COLUMN IF NOT EXISTS cliente VARCHAR(255)');
        await pool.query('ALTER TABLE obras ADD COLUMN IF NOT EXISTS observacoes TEXT');
        await pool.query('ALTER TABLE obras ADD COLUMN IF NOT EXISTS "valorContrato" DOUBLE PRECISION NOT NULL DEFAULT 0.0');
        await pool.query('ALTER TABLE obras ADD COLUMN IF NOT EXISTS "statusContrato" VARCHAR(255) NOT NULL DEFAULT \'CONSOLIDADO\'');
        await pool.query('ALTER TABLE obras ADD COLUMN IF NOT EXISTS "etapaLevantamento" BOOLEAN NOT NULL DEFAULT FALSE');
        await pool.query('ALTER TABLE obras ADD COLUMN IF NOT EXISTS "etapaProjeto" BOOLEAN NOT NULL DEFAULT FALSE');
        await pool.query('ALTER TABLE obras ADD COLUMN IF NOT EXISTS "etapaCotacao" BOOLEAN NOT NULL DEFAULT FALSE');
        await pool.query('ALTER TABLE obras ADD COLUMN IF NOT EXISTS "etapaFabricacao" BOOLEAN NOT NULL DEFAULT FALSE');
        await pool.query('ALTER TABLE obras ADD COLUMN IF NOT EXISTS prazo VARCHAR(255)');
        await pool.query('ALTER TABLE obras ADD COLUMN IF NOT EXISTS "numeroPedido" VARCHAR(255)');
        await pool.query('ALTER TABLE obras ADD COLUMN IF NOT EXISTS documentos TEXT NOT NULL DEFAULT \'[]\'');
        await pool.query('ALTER TABLE obras ADD COLUMN IF NOT EXISTS "dataInicioContrato" VARCHAR(255)');
        await pool.query('ALTER TABLE obras ADD COLUMN IF NOT EXISTS "dataFimContrato" VARCHAR(255)');

        await pool.query('ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS descricao VARCHAR(255) NOT NULL DEFAULT \'\'');
        await pool.query('ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS valor DOUBLE PRECISION NOT NULL DEFAULT 0.0');
        await pool.query('ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS status VARCHAR(255) NOT NULL DEFAULT \'ATIVO\'');
        await pool.query('ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS observacao TEXT');
        await pool.query('ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS ordem INTEGER NOT NULL DEFAULT 0');
        await pool.query('ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS subitens TEXT NOT NULL DEFAULT \'[]\'');

        // Seed default categories if they don't exist
        const defaultCategories = [
          { nome: 'Materiais', grupoCalculo: 'MATERIAL' },
          { nome: 'Insumos', grupoCalculo: 'MATERIAL' },
          { nome: 'Mão de Obra', grupoCalculo: 'MAO_OBRA' },
          { nome: 'Administração', grupoCalculo: 'ADMINISTRACAO' },
          { nome: 'Impostos', grupoCalculo: 'IMPOSTOS' },
          { nome: 'Transporte / Logística', grupoCalculo: 'LOGISTICA' },
          { nome: 'Margem Líquida', grupoCalculo: 'MARGEM' },
        ];
        for (const cat of defaultCategories) {
          await pool.query(`
            INSERT INTO categorias (id, nome, "grupoCalculo")
            VALUES ($1, $2, $3)
            ON CONFLICT (nome) DO UPDATE SET "grupoCalculo" = EXCLUDED."grupoCalculo"
          `, ["cat-" + Math.random().toString(36).substring(2, 10), cat.nome, cat.grupoCalculo]);
        }

        // ONE-TIME CLEAN DESIRED BY THE USER:
        const wipeFlagFile = path.join(process.cwd(), '.database_wiped_v2');
        if (!fs.existsSync(wipeFlagFile)) {
          console.log("[pg Sync] Executando limpeza unica do banco de dados (Removendo Obras e Itens de Orcamento)...");
          try {
            await pool.query('DELETE FROM itens_orcamento');
            await pool.query('DELETE FROM obras');
            fs.writeFileSync(wipeFlagFile, 'wiped');
            console.log("[pg Sync] Limpeza concluida e arquivo de marcacao criado.");
          } catch (wipeErr) {
            console.error("[pg Sync] Erro limpando banco de dados:", wipeErr);
          }
        }
      } catch (dbInitErr) {
        console.error("[pg Sync] Erro durante inicialização de tabelas e sementes automáticas:", dbInitErr);
      }

      console.log(`[pg Sync] Conectado e sincronizado ao Supabase PostgreSQL com sucesso!`);
    } else {
      dbConnected = false;
    }
  } catch (err) {
    dbConnected = false;
    console.log("[pg Sync] Conexão indisponível ou tabelas não criadas no Supabase. Fallback modo Em Memória ativo.");
  } finally {
    dbCheckInProgress = false;
  }
  return dbConnected;
}

// Flag to use fully local in-memory DB to comply with "forget database for now, keep running in AI Studio"
const useInMemoryDb = false;

// Standard mock ID generator
function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Memory database collections (populated with full design-guided seed data)
const memoryCategorias = [
  { id: "cat-1", nome: "Materiais", grupoCalculo: "MATERIAL" },
  { id: "cat-2", nome: "Insumos", grupoCalculo: "MATERIAL" },
  { id: "cat-3", nome: "Mão de Obra", grupoCalculo: "MAO_OBRA" },
  { id: "cat-4", nome: "Administração", grupoCalculo: "ADMINISTRACAO" },
  { id: "cat-5", nome: "Impostos", grupoCalculo: "IMPOSTOS" },
  { id: "cat-6", nome: "Transporte / Logística", grupoCalculo: "LOGISTICA" },
  { id: "cat-7", nome: "Margem Líquida", grupoCalculo: "MARGEM" },
];

let memoryObras: any[] = [];

let memoryItens: any[] = [];

// Persistent memory fallback on filesystem
const FALLBACK_DATA_FILE = path.join(process.cwd(), "dev_fallback_data.json");

const loadMemoryDb = () => {
  try {
    if (fs.existsSync(FALLBACK_DATA_FILE)) {
      const raw = fs.readFileSync(FALLBACK_DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.memoryObras && Array.isArray(parsed.memoryObras)) {
        memoryObras = parsed.memoryObras;
      }
      if (parsed.memoryItens && Array.isArray(parsed.memoryItens)) {
        memoryItens = parsed.memoryItens;
      }
      console.log(`[DEBUG] Persistent memory loaded from disk. Projects: ${memoryObras.length}, Items: ${memoryItens.length}`);
    } else {
      console.log("[DEBUG] No persistent memory fallback file found. Starting fresh.");
    }
  } catch (err) {
    console.error("[DEBUG] Error loading persistent memory fallback file:", err);
  }
};

const saveMemoryDb = () => {
  try {
    const payload = {
      memoryObras,
      memoryItens
    };
    fs.writeFileSync(FALLBACK_DATA_FILE, JSON.stringify(payload, null, 2), "utf-8");
    console.log(`[DEBUG] Persistent memory saved to disk. Projects: ${memoryObras.length}, Items: ${memoryItens.length}`);
  } catch (err) {
    console.error("[DEBUG] Error saving persistent memory fallback file:", err);
  }
};

// Immediately load fallback database on boot
loadMemoryDb();

const getMemoryProjectItems = (obraId: string) => {
  console.log(`[DEBUG] getMemoryProjectItems called for obraId: ${obraId}. current memoryItens count: ${memoryItens.length}`);
  return memoryItens.filter(i => i.obraId === obraId).map(i => {
    let parsedSubs: any[] = [];
    if (i.subitens) {
      if (typeof i.subitens === 'string') {
        try {
          parsedSubs = JSON.parse(i.subitens);
        } catch (e) {
          console.error(`[DEBUG] getMemoryProjectItems: JSON parse failed for subitens of item ${i.id}:`, i.subitens, e);
          parsedSubs = [];
        }
      } else if (Array.isArray(i.subitens)) {
        parsedSubs = i.subitens;
      }
    }
    console.log(`[DEBUG] Item ${i.id} (${i.descricao}) has ${parsedSubs.length} parsed subitens. Raw subitens content:`, i.subitens);
    return {
      ...i,
      subitens: parsedSubs,
      categoria: memoryCategorias.find(c => c.id === i.categoriaId) || null
    };
  });
};

const ensureAndRecalculateFixedItems = async (obraId: string, valorContrato: number) => {
  const valueContract = Number(valorContrato) || 0;

  if (dbConnected && pool) {
    try {
      const catImpostosRes = await pool.query('SELECT * FROM categorias WHERE nome = $1 LIMIT 1', ["Impostos"]);
      const catAdmRes = await pool.query('SELECT * FROM categorias WHERE nome = $1 LIMIT 1', ["Administração"]);
      const catImpostos = catImpostosRes.rows[0];
      const catAdm = catAdmRes.rows[0];

      // DEBUG: Log all items
      const allItems = await pool.query('SELECT descricao FROM itens_orcamento WHERE "obraId" = $1', [obraId]);
      console.log(`[DEBUG] Items for obra ${obraId}:`, allItems.rows.map(r => r.descricao));

      await pool.query('DELETE FROM itens_orcamento WHERE "obraId" = $1 AND descricao = $2', [obraId, "PIS/COFINS/IRPJ/CSLL"]);

      if (catImpostos) {
        const impostoItemRes = await pool.query('SELECT * FROM itens_orcamento WHERE "obraId" = $1 AND descricao = $2 LIMIT 1', [obraId, "Imposto Fixo"]);
        const impostoItem = impostoItemRes.rows[0];
        if (!impostoItem) {
          const countRes = await pool.query('SELECT COUNT(*)::int as count FROM itens_orcamento WHERE "obraId" = $1', [obraId]);
          const currentCount = countRes.rows[0].count;
          await pool.query(`
            INSERT INTO itens_orcamento (id, descricao, valor, status, observacao, ordem, "obraId", "categoriaId", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          `, [`fixed-imposto-${obraId}`, "Imposto Fixo", Math.round(valueContract * 0.098 * 100) / 100, "ATIVO", "9.8%", currentCount || 99, obraId, catImpostos.id]);
        }
      }

      if (catAdm) {
        const admItemRes = await pool.query('SELECT * FROM itens_orcamento WHERE "obraId" = $1 AND descricao = $2 LIMIT 1', [obraId, "Custo ADM"]);
        const admItem = admItemRes.rows[0];
        if (!admItem) {
          const countRes = await pool.query('SELECT COUNT(*)::int as count FROM itens_orcamento WHERE "obraId" = $1', [obraId]);
          const currentCount = countRes.rows[0].count;
          await pool.query(`
            INSERT INTO itens_orcamento (id, descricao, valor, status, observacao, ordem, "obraId", "categoriaId", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          `, [`fixed-custo-adm-${obraId}`, "Custo ADM", Math.round(valueContract * 0.05 * 100) / 100, "ATIVO", "5%", (currentCount || 99) + 1, obraId, catAdm.id]);
        }
      }

      // Now query ALL items for this project and update any item that contains a '%' in its observation
      const allItensRes = await pool.query('SELECT * FROM itens_orcamento WHERE "obraId" = $1', [obraId]);
      for (const item of allItensRes.rows) {
        const obs = item.observacao || "";
        if (obs.includes("%")) {
          const pct = parseFloat(obs.replace(/[^0-9.]/g, ""));
          if (!isNaN(pct)) {
            const calculatedValor = Math.round(valueContract * (pct / 100) * 100) / 100;
            if (Number(item.valor) !== calculatedValor) {
              await pool.query(`
                UPDATE itens_orcamento 
                SET valor = $1, "updatedAt" = NOW()
                WHERE id = $2
              `, [calculatedValor, item.id]);
            }
          }
        }
      }

    } catch (pgErr) {
      console.error("Erro recriando/recalculando itens fixos no Postgres, usando fallback mental:", pgErr);
    }
  }

  // Always sync internal memory arrays for robust dual-track execution
  memoryItens = memoryItens.filter(i => !(i.obraId === obraId && i.descricao === "PIS/COFINS/IRPJ/CSLL"));
  
  const mImpostos = memoryCategorias.find(c => c.nome === "Impostos");
  const mAdm = memoryCategorias.find(c => c.nome === "Administração");

  if (mImpostos) {
    let impostoItem = memoryItens.find(i => i.obraId === obraId && i.descricao === "Imposto Fixo");
    if (!impostoItem) {
      const idx = memoryItens.filter(i => i.obraId === obraId).length;
      memoryItens.push({
        id: `fixed-imposto-${obraId}`,
        descricao: "Imposto Fixo",
        valor: Math.round(valueContract * 0.098 * 100) / 100,
        status: "ATIVO",
        observacao: "9.8%",
        ordem: idx,
        obraId,
        categoriaId: mImpostos.id,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  if (mAdm) {
    let admItem = memoryItens.find(i => i.obraId === obraId && i.descricao === "Custo ADM");
    if (!admItem) {
      const idx = memoryItens.filter(i => i.obraId === obraId).length;
      memoryItens.push({
        id: `fixed-custo-adm-${obraId}`,
        descricao: "Custo ADM",
        valor: Math.round(valueContract * 0.05 * 100) / 100,
        status: "ATIVO",
        observacao: "5%",
        ordem: idx + 1,
        obraId,
        categoriaId: mAdm.id,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  // Dual track memory check for any items with '%' in observation
  memoryItens.forEach((item) => {
    if (item.obraId === obraId) {
      const obs = item.observacao || "";
      if (obs.includes("%")) {
        const pct = parseFloat(obs.replace(/[^0-9.]/g, ""));
        if (!isNaN(pct)) {
          item.valor = Math.round(valueContract * (pct / 100) * 100) / 100;
          item.updatedAt = new Date();
        }
      }
    }
  });

  saveMemoryDb();
};

const formatObraWithMetrics = (obra: any) => {
  const items = (obra.itens || [])
    .map((i: any) => ({
      ...i,
      categoria: i.categoria || null,
    }))
    .sort((a: any, b: any) => {
      if (a.ordem !== b.ordem) return a.ordem - b.ordem;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const activeItems = items.filter((i: any) => i.status === "ATIVO");
  const visaoGeral = activeItems.reduce((sum: number, item: any) => sum + Number(item.valor), 0);
  const valorContrato = Number(obra.valorContrato);
  const margemLiquida = valorContrato - visaoGeral;
  const percentualMargem = valorContrato > 0 ? (margemLiquida / valorContrato) * 100 : 0;

  let parsedDocs: any[] = [];
  try {
    parsedDocs = obra.documentos
      ? (typeof obra.documentos === "string" ? JSON.parse(obra.documentos) : obra.documentos)
      : [];
  } catch (err) {
    console.error("Erro parsing documentos de obra:", err);
  }

  return {
    id: obra.id,
    nome: obra.nome,
    cliente: obra.cliente,
    observacoes: obra.observacoes,
    valorContrato,
    statusContrato: obra.statusContrato || "CONSOLIDADO",
    documentos: parsedDocs,
    createdAt: obra.createdAt,
    updatedAt: obra.updatedAt,
    itens: items,
    visaoGeral,
    margemLiquida,
    percentualMargem,
    etapaLevantamento: !!obra.etapaLevantamento,
    etapaProjeto: !!obra.etapaProjeto,
    etapaCotacao: !!obra.etapaCotacao,
    etapaFabricacao: !!obra.etapaFabricacao,
    prazo: obra.prazo || null,
    numeroPedido: obra.numeroPedido || null,
    dataInicioContrato: obra.dataInicioContrato || null,
    dataFimContrato: obra.dataFimContrato || null,
  };
};

async function bootstrap() {
  const app = express();
  app.use(express.json({ limit: "150mb" }));
  app.use(express.urlencoded({ limit: "150mb", extended: true }));

  // API Status / Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date() });
  });

  // GET Supabase Database Status
  app.get("/api/db/status", async (req, res) => {
    let dbUrl = process.env.DATABASE_URL || "";
    dbUrl = sanitizeDbUrl(dbUrl);

    const isPostgres = !!dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"));
    const isHttps = !!dbUrl && dbUrl.startsWith("https://");

    if (isHttps) {
      let supabaseRef = "";
      let suggestedConnectionString = "";
      let suggestedDirectString = "";

      const match = dbUrl.match(/https:\/\/([a-z0-9\-]+)\.supabase\.(co|net)/);
      if (match) {
        supabaseRef = match[1];
        suggestedConnectionString = `postgresql://postgres.${supabaseRef}:[SUA_SENHA]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`;
        suggestedDirectString = `postgresql://postgres:[SUA_SENHA]@db.${supabaseRef}.supabase.co:5432/postgres`;
      }

      return res.json({
        configured: true,
        connected: false,
        isHttpsRestUrl: true,
        supabaseRef,
        suggestedConnectionString,
        suggestedDirectString,
        provider: "postgresql",
        error: `OCORREU UM EQUÍVOCO: Você inseriu a URL REST (https://...) do seu Supabase nas variáveis de ambiente. O Postgres precisa do link de conexão PostgreSQL.

Seu link correto do PostgreSQL deve ser parecido com:
${suggestedConnectionString || "postgresql://postgres.[SEU_REF_PROJETO]:[SUA_SENHA]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"}

Gostaria de usá-lo? Copie o link sugerido, substitua '[SUA_SENHA]' com a senha do banco definida no Supabase, e mude o segredo DATABASE_URL nas configurações do AI Studio!`,
        projectCount: 0,
        categoryCount: 0
      });
    }

    if (!isPostgres) {
      return res.json({
        configured: false,
        connected: false,
        provider: "postgresql",
        error: "DATABASE_URL não configurada ou formato inválido. Por favor, adicione sua Connection String do Supabase nas configurações.",
        projectCount: 0,
        categoryCount: 0
      });
    }

    const hasPlaceholder = dbUrl.includes("[PASSWORD]") || 
                           dbUrl.includes("<PASSWORD>") || 
                           dbUrl.includes("[SENHA]") || 
                           dbUrl.includes("<SENHA>") ||
                           dbUrl.includes("[YOUR_PASSWORD]") ||
                           dbUrl.includes("SENHA_DO_BANCO") ||
                           dbUrl.includes("YOUR_PASSWORD") ||
                           dbUrl.includes("[PROJETO]");
    
    if (hasPlaceholder) {
      return res.json({
        configured: true,
        connected: false,
        provider: "postgresql",
        error: "Sua DATABASE_URL contém marcadores de exemplo como [PASSWORD], [SENHA] ou [PROJETO]. Por favor, edite as credenciais do seu projeto e substitua esses marcadores por seus dados reais do Supabase.",
        projectCount: 0,
        categoryCount: 0
      });
    }

    try {
      // Re-initialize and inspect connection live
      const connectedNow = await checkDbConnection();
      
      if (!connectedNow || !pool) {
        return res.json({
          configured: true,
          connected: false,
          provider: "postgresql",
          error: "Não foi possível estabelecer uma conexão estável com o PostgreSQL do Supabase. Verifique se a senha informada no link DATABASE_URL está correta e se a base de dados não está pausada.",
          projectCount: 0,
          categoryCount: 0
        });
      }

      // Attempt to count to verify tables exist
      let projectCount = 0;
      let categoryCount = 0;
      let tablesExist = false;

      try {
        const checkObrasRes = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'obras'
          )
        `);
        tablesExist = checkObrasRes.rows[0].exists;

        if (tablesExist) {
          const obrasCount = await pool.query("SELECT COUNT(*)::int as count FROM obras");
          const catsCount = await pool.query("SELECT COUNT(*)::int as count FROM categorias");
          projectCount = obrasCount.rows[0].count;
          categoryCount = catsCount.rows[0].count;
        }
      } catch (tableErr) {
        tablesExist = false;
      }

      res.json({
        configured: true,
        connected: true,
        tablesExist,
        provider: "postgresql",
        projectCount,
        categoryCount,
      });
    } catch (connectErr: any) {
      res.json({
        configured: true,
        connected: false,
        provider: "postgresql",
        error: connectErr.message || "Não foi possível conectar ao banco de dados PostgreSQL do Supabase.",
        projectCount: 0,
        categoryCount: 0
      });
    }
  });

  // POST Sync Schema and Seed Supabase Database (Pure SQL execution)
  app.post("/api/db/sync", async (req, res) => {
    let dbUrl = process.env.DATABASE_URL || "";
    dbUrl = sanitizeDbUrl(dbUrl);

    if (dbUrl.startsWith("https://")) {
      const match = dbUrl.match(/https:\/\/([a-z0-9\-]+)\.supabase\.(co|net)/);
      const ref = match ? match[1] : "[SEU-REF-PROJETO]";
      return res.status(400).json({
        success: false,
        error: `Não é possível sincronizar via REST. Substitua a DATABASE_URL na aba de segredos pela Connection String do Postgres: postgresql://postgres.${ref}:[SUA_SENHA]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
      });
    }

    const isConfigured = !!dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"));
    
    if (!isConfigured) {
      return res.status(400).json({
        success: false,
        error: "DATABASE_URL não configurada. Por favor, insira uma URL de conexão válida do Supabase."
      });
    }

    const hasPlaceholder = dbUrl.includes("[PASSWORD]") || 
                           dbUrl.includes("<PASSWORD>") || 
                           dbUrl.includes("[SENHA]") || 
                           dbUrl.includes("<SENHA>") ||
                           dbUrl.includes("[YOUR_PASSWORD]") ||
                           dbUrl.includes("SENHA_DO_BANCO") ||
                           dbUrl.includes("YOUR_PASSWORD") ||
                           dbUrl.includes("[PROJETO]");

    if (hasPlaceholder) {
      return res.status(400).json({
        success: false,
        error: "Não é possível sincronizar: sua DATABASE_URL ainda contém termos fictícios como [PASSWORD] ou [SENHA]. Substitua-os pela senha real do banco de dados no Supabase antes de continuar."
      });
    }

    try {
      recreateDbClient();
      if (!pool) {
        throw new Error("Não foi possível inicializar o pool de conexões com o Postgres.");
      }

      const client = await pool.connect();
      try {
        console.log("Criando tabelas no Supabase...");
        await client.query(`
          CREATE TABLE IF NOT EXISTS categorias (
            id VARCHAR(255) PRIMARY KEY,
            nome VARCHAR(255) UNIQUE NOT NULL,
            "grupoCalculo" VARCHAR(255) NOT NULL
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
          ALTER TABLE obras ADD COLUMN IF NOT EXISTS "statusContrato" VARCHAR(255) NOT NULL DEFAULT 'CONSOLIDADO';
          ALTER TABLE obras ADD COLUMN IF NOT EXISTS "dataInicioContrato" VARCHAR(255);
          ALTER TABLE obras ADD COLUMN IF NOT EXISTS "dataFimContrato" VARCHAR(255);

          CREATE TABLE IF NOT EXISTS itens_orcamento (
            id VARCHAR(255) PRIMARY KEY,
            descricao VARCHAR(255) NOT NULL,
            valor DOUBLE PRECISION NOT NULL DEFAULT 0.0,
            status VARCHAR(255) NOT NULL DEFAULT 'ATIVO',
            observacao TEXT,
            ordem INTEGER NOT NULL DEFAULT 0,
            subitens TEXT NOT NULL DEFAULT '[]',
            "obraId" VARCHAR(255) NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
            "categoriaId" VARCHAR(255) NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS subitens TEXT NOT NULL DEFAULT '[]';
        `);

        console.log("Populando dados padrão...");
        const defaultCategories = [
          { nome: 'Materiais', grupoCalculo: 'MATERIAL' },
          { nome: 'Insumos', grupoCalculo: 'MATERIAL' },
          { nome: 'Mão de Obra', grupoCalculo: 'MAO_OBRA' },
          { nome: 'Administração', grupoCalculo: 'ADMINISTRACAO' },
          { nome: 'Impostos', grupoCalculo: 'IMPOSTOS' },
          { nome: 'Transporte / Logística', grupoCalculo: 'LOGISTICA' },
          { nome: 'Margem Líquida', grupoCalculo: 'MARGEM' },
        ];

        for (const cat of defaultCategories) {
          await client.query(`
            INSERT INTO categorias (id, nome, "grupoCalculo")
            VALUES ($1, $2, $3)
            ON CONFLICT (nome) DO UPDATE SET "grupoCalculo" = EXCLUDED."grupoCalculo"
          `, ["cat-" + generateId().substring(0, 8), cat.nome, cat.grupoCalculo]);
        }

        console.log("Banco de dados pronto para receber novos itens sem projetos de demonstracao.");
      } finally {
        client.release();
      }

      await checkDbConnection();

      res.json({
        success: true,
        message: "Banco de dados Supabase sincronizado e populado com sucesso!"
       });
    } catch (err: any) {
      console.error("Erro de sincronização com Supabase:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Erro durante o provisionamento da estrutura do banco de dados no Supabase."
      });
    }
  });

  // GET Dashboard Stats
  app.get("/api/dashboard", async (req, res) => {
    try {
      let freshObras: any[] = [];
      
      if (dbConnected && pool) {
        try {
          const dbObrasRes = await pool.query('SELECT * FROM obras ORDER BY "createdAt" DESC');
          const dbObras = dbObrasRes.rows;

          // Recalculate fixed items asynchronously for all fetched projects
          await Promise.all(dbObras.map(o => ensureAndRecalculateFixedItems(o.id, o.valorContrato)));

          // Refetch for fresh totals with joined items/categories
          const freshObrasRes = await pool.query('SELECT * FROM obras ORDER BY "createdAt" DESC');
          const allObras = freshObrasRes.rows;

          const allItensRes = await pool.query(`
            SELECT i.*, 
                   c.nome as "cat_nome", c."grupoCalculo" as "cat_grupoCalculo"
            FROM itens_orcamento i
            LEFT JOIN categorias c ON i."categoriaId" = c.id
            ORDER BY i.ordem ASC
          `);
          const allItens = allItensRes.rows;

          freshObras = allObras.map(o => {
            const items = allItens.filter(i => i.obraId === o.id).map(i => ({
              id: i.id,
              descricao: i.descricao,
              valor: Number(i.valor),
              status: i.status,
              observacao: i.observacao,
              ordem: Number(i.ordem),
              obraId: i.obraId,
              categoriaId: i.categoriaId,
              subitens: typeof i.subitens === 'string' ? JSON.parse(i.subitens) : (i.subitens || []),
              createdAt: i.createdAt,
              updatedAt: i.updatedAt,
              categoria: {
                id: i.categoriaId,
                nome: i.cat_nome,
                grupoCalculo: i.cat_grupoCalculo
              }
            }));
            return {
              ...o,
              valorContrato: Number(o.valorContrato),
              documentos: typeof o.documentos === 'string' ? JSON.parse(o.documentos) : (o.documentos || []),
              itens: items
            };
          });
        } catch (dbErr) {
          console.error("Erro consultando dashboard no pg, usando fallback mental:", dbErr);
        }
      }

      // Fallback arrays if postgres query returned zero or failed or db is disconnected
      if (!dbConnected || freshObras.length === 0) {
        await Promise.all(memoryObras.map(o => ensureAndRecalculateFixedItems(o.id, Number(o.valorContrato))));
        freshObras = memoryObras.map(o => {
          return {
            ...o,
            itens: getMemoryProjectItems(o.id)
          };
        });
      }

      const allCalculated = freshObras.map(formatObraWithMetrics);
      const obrasConsolidadas = freshObras.filter((o) => (o.statusContrato || "CONSOLIDADO") === "CONSOLIDADO");
      const obrasCalculadasConsolidadas = obrasConsolidadas.map(formatObraWithMetrics);

      const totalContratos = obrasCalculadasConsolidadas.reduce((acc, o) => acc + o.valorContrato, 0);
      const totalVisaoGeral = obrasCalculadasConsolidadas.reduce((acc, o) => acc + o.visaoGeral, 0);
      const totalMargem = totalContratos - totalVisaoGeral;
      const percentualMedio = obrasCalculadasConsolidadas.length > 0
        ? obrasCalculadasConsolidadas.reduce((acc, o) => acc + o.percentualMargem, 0) / obrasCalculadasConsolidadas.length
        : 0;

      let totalAdm = 0;
      obrasCalculadasConsolidadas.forEach((o) => {
        const activeAdm = o.itens
          .filter((i: any) => i.status === "ATIVO" && i.categoria?.nome === "Administração")
          .reduce((sum: number, item: any) => sum + Number(item.valor), 0);
        totalAdm += activeAdm;
      });

      const projetaMeta = 6000000;
      const projetaPercent = totalContratos > 0 ? (totalContratos / projetaMeta) * 100 : 0;

      const admMeta = 800000;
      const admPercent = totalAdm > 0 ? (totalAdm / admMeta) * 100 : 0;

      const costDistribution: Record<string, number> = {};
      obrasCalculadasConsolidadas.forEach((o) => {
        o.itens.forEach((i: any) => {
          if (i.status === "ATIVO") {
            const catName = i.categoria?.nome;
            if (catName && catName !== "Margem Líquida") {
              costDistribution[catName] = (costDistribution[catName] || 0) + Number(i.valor);
            }
          }
        });
      });

      const chartCosts = Object.keys(costDistribution).map((name) => ({
        name,
        value: costDistribution[name],
      }));

      res.json({
        totalContratos,
        totalVisaoGeral,
        totalMargem,
        percentualMedio,
        totalAdm,
        kpiProjecao: {
          atual: totalContratos,
          meta: projetaMeta,
          percentual: projetaPercent,
        },
        kpiAdm: {
          atual: totalAdm,
          meta: admMeta,
          percentual: admPercent,
        },
        chartCosts,
        obras: allCalculated.map((o) => ({
          id: o.id,
          nome: o.nome,
          cliente: o.cliente,
          valorContrato: o.valorContrato,
          statusContrato: o.statusContrato,
          visaoGeral: o.visaoGeral,
          margemLiquida: o.margemLiquida,
          percentualMargem: o.percentualMargem,
          createdAt: o.createdAt,
          updatedAt: o.updatedAt,
          dataInicioContrato: o.dataInicioContrato,
          dataFimContrato: o.dataFimContrato,
          documentos: o.documentos,
          etapaLevantamento: o.etapaLevantamento,
          etapaProjeto: o.etapaProjeto,
          etapaCotacao: o.etapaCotacao,
          etapaFabricacao: o.etapaFabricacao,
          prazo: o.prazo,
          numeroPedido: o.numeroPedido,
          observacoes: o.observacoes,
          despesaAdm: o.itens
            ? o.itens
                .filter((i: any) => i.status === "ATIVO" && i.categoria?.nome === "Administração")
                .reduce((sum: number, item: any) => sum + Number(item.valor), 0)
            : 0,
          itens: o.itens || [],
        })),
        projetos: allCalculated.map((o) => ({
          id: o.id,
          nome: o.nome,
          cliente: o.cliente,
          valorContrato: o.valorContrato,
          statusContrato: o.statusContrato,
          visaoGeral: o.visaoGeral,
          margemLiquida: o.margemLiquida,
          percentualMargem: o.percentualMargem,
          createdAt: o.createdAt,
          updatedAt: o.updatedAt,
          dataInicioContrato: o.dataInicioContrato,
          dataFimContrato: o.dataFimContrato,
          documentos: o.documentos,
          etapaLevantamento: o.etapaLevantamento,
          etapaProjeto: o.etapaProjeto,
          etapaCotacao: o.etapaCotacao,
          etapaFabricacao: o.etapaFabricacao,
          prazo: o.prazo,
          numeroPedido: o.numeroPedido,
          observacoes: o.observacoes,
          despesaAdm: o.itens
            ? o.itens
                .filter((i: any) => i.status === "ATIVO" && i.categoria?.nome === "Administração")
                .reduce((sum: number, item: any) => sum + Number(item.valor), 0)
            : 0,
          itens: o.itens || [],
        })),
      });
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao buscar métricas do Dashboard", details: error.message });
    }
  });

  // GET Obras (Lista completa)
  app.get(["/api/obras", "/api/projetos"], async (req, res) => {
    try {
      let freshObras: any[] = [];

      if (dbConnected && pool) {
        try {
          const dbObrasRes = await pool.query('SELECT * FROM obras ORDER BY "createdAt" DESC');
          const allObras = dbObrasRes.rows;

          const allItensRes = await pool.query(`
            SELECT i.*, 
                   c.nome as "cat_nome", c."grupoCalculo" as "cat_grupoCalculo"
            FROM itens_orcamento i
            LEFT JOIN categorias c ON i."categoriaId" = c.id
            ORDER BY i.ordem ASC
          `);
          const allItens = allItensRes.rows;

          freshObras = allObras.map(o => {
            const items = allItens.filter(i => i.obraId === o.id).map(i => ({
              id: i.id,
              descricao: i.descricao,
              valor: Number(i.valor),
              status: i.status,
              observacao: i.observacao,
              ordem: Number(i.ordem),
              obraId: i.obraId,
              categoriaId: i.categoriaId,
              subitens: typeof i.subitens === 'string' ? JSON.parse(i.subitens) : (i.subitens || []),
              createdAt: i.createdAt,
              updatedAt: i.updatedAt,
              categoria: {
                id: i.categoriaId,
                nome: i.cat_nome,
                grupoCalculo: i.cat_grupoCalculo
              }
            }));
            return {
              ...o,
              valorContrato: Number(o.valorContrato),
              documentos: typeof o.documentos === 'string' ? JSON.parse(o.documentos) : (o.documentos || []),
              itens: items
            };
          });
        } catch (dbErr) {
          console.error("Erro lendo obras no pg:", dbErr);
        }
      }

      if (!dbConnected || freshObras.length === 0) {
        freshObras = memoryObras.map(o => {
          return {
            ...o,
            itens: getMemoryProjectItems(o.id)
          };
        });
      }

      const obrasCalculadas = freshObras.map(formatObraWithMetrics);
      res.json(obrasCalculadas);
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao buscar lista de projetos", details: error.message });
    }
  });

  // GET Obra por ID (Detalhes e Itens)
  app.get(["/api/obras/:id", "/api/projetos/:id"], async (req, res) => {
    const { id } = req.params;
    try {
      let dbObra: any = null;

      if (dbConnected && pool) {
        try {
          const obraRes = await pool.query('SELECT * FROM obras WHERE id = $1 LIMIT 1', [id]);
          if (obraRes.rows.length > 0) {
            const obra = obraRes.rows[0];

            const itensResult = await pool.query(`
              SELECT i.*, 
                     c.nome as "cat_nome", c."grupoCalculo" as "cat_grupoCalculo"
              FROM itens_orcamento i
              LEFT JOIN categorias c ON i."categoriaId" = c.id
              WHERE i."obraId" = $1
              ORDER BY i.ordem ASC
            `, [id]);

            const items = itensResult.rows.map(row => ({
              id: row.id,
              descricao: row.descricao,
              valor: Number(row.valor),
              status: row.status,
              observacao: row.observacao,
              ordem: Number(row.ordem),
              obraId: row.obraId,
              categoriaId: row.categoriaId,
              subitens: typeof row.subitens === 'string' ? JSON.parse(row.subitens) : (row.subitens || []),
              createdAt: row.createdAt,
              updatedAt: row.updatedAt,
              categoria: {
                id: row.categoriaId,
                nome: row.cat_nome,
                grupoCalculo: row.cat_grupoCalculo
              }
            }));

            dbObra = {
              ...obra,
              valorContrato: Number(obra.valorContrato),
              documentos: typeof obra.documentos === 'string' ? JSON.parse(obra.documentos) : (obra.documentos || []),
              itens: items
            };
          }
        } catch (dbErr) {
          console.error(`Erro buscando obra ${id} no pg:`, dbErr);
        }
      }

      if (!dbConnected || !dbObra) {
        const o = memoryObras.find(x => x.id === id);
        if (!o) {
          return res.status(404).json({ error: "Projeto não encontrado" });
        }
        dbObra = {
          ...o,
          itens: getMemoryProjectItems(o.id)
        };
      }

      res.json(formatObraWithMetrics(dbObra));
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao buscar detalhes do projeto", details: error.message });
    }
  });

  // POST Criar nova Obra
  app.post(["/api/obras", "/api/projetos"], async (req, res) => {
    const { nome, cliente, observacoes, valorContrato, statusContrato, documentos, etapaLevantamento, etapaProjeto, etapaCotacao, etapaFabricacao, prazo, numeroPedido, dataInicioContrato, dataFimContrato } = req.body;
    if (!nome) {
      return res.status(400).json({ error: "O nome do projeto é obrigatório" });
    }

    try {
      let resultObra: any = null;
      const normalizedDocs = documentos 
        ? (Array.isArray(documentos) ? documentos : (typeof documentos === "string" ? JSON.parse(documentos) : []))
        : [];

      if (dbConnected && pool) {
        try {
          const id = "p-" + generateId();
          await pool.query(`
            INSERT INTO obras (
              id, nome, cliente, observacoes, "valorContrato", "statusContrato", documentos,
              "etapaLevantamento", "etapaProjeto", "etapaCotacao", "etapaFabricacao", prazo, "numeroPedido",
              "dataInicioContrato", "dataFimContrato", "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
          `, [
            id, nome, cliente || null, observacoes || null, Number(valorContrato) || 0.0, statusContrato || "CONSOLIDADO", JSON.stringify(normalizedDocs),
            etapaLevantamento !== undefined ? !!etapaLevantamento : false,
            etapaProjeto !== undefined ? !!etapaProjeto : false,
            etapaCotacao !== undefined ? !!etapaCotacao : false,
            etapaFabricacao !== undefined ? !!etapaFabricacao : false,
            prazo || null, numeroPedido || null,
            dataInicioContrato || null, dataFimContrato || null
          ]);

          // Recalculate fixed items for the newly created project immediately
          await ensureAndRecalculateFixedItems(id, Number(valorContrato) || 0.0);

          // Refetch with metrics
          const obraRes = await pool.query('SELECT * FROM obras WHERE id = $1 LIMIT 1', [id]);
          const obra = obraRes.rows[0];

          const itensResult = await pool.query(`
            SELECT i.*, 
                   c.nome as "cat_nome", c."grupoCalculo" as "cat_grupoCalculo"
            FROM itens_orcamento i
            LEFT JOIN categorias c ON i."categoriaId" = c.id
            WHERE i."obraId" = $1
            ORDER BY i.ordem ASC
          `, [id]);

          const items = itensResult.rows.map(row => ({
            id: row.id,
            descricao: row.descricao,
            valor: Number(row.valor),
            status: row.status,
            observacao: row.observacao,
            ordem: Number(row.ordem),
            obraId: row.obraId,
            categoriaId: row.categoriaId,
            subitens: typeof row.subitens === 'string' ? JSON.parse(row.subitens) : (row.subitens || []),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            categoria: {
              id: row.categoriaId,
              nome: row.cat_nome,
              grupoCalculo: row.cat_grupoCalculo
            }
          }));

          resultObra = {
            ...obra,
            valorContrato: Number(obra.valorContrato),
            documentos: typeof obra.documentos === 'string' ? JSON.parse(obra.documentos) : (obra.documentos || []),
            itens: items
          };
        } catch (dbErr: any) {
          console.error("[RDS INSERT ERROR] Erro bruto do driver no pg:");
          console.error(dbErr);
          throw dbErr;
        }
      } else {
        throw new Error("Conexão com AWS RDS não está ativa.");
      }

      if (!resultObra) {
        throw new Error("AWS RDS processou sem gerar erros, mas não retornou a obra.");
      }

      res.status(201).json(formatObraWithMetrics(resultObra));
    } catch (error: any) {
      res.status(500).json({ 
        error: error.message || "Erro crítico no banco de dados", 
        stack: error.stack,
        details: error.detail,
        table: error.table,
        hint: error.hint
      });
    }
  });

  // PUT Editar Obra
  app.put(["/api/obras/:id", "/api/projetos/:id"], async (req, res) => {
    const { id } = req.params;
    const { 
      nome, 
      cliente, 
      observacoes, 
      valorContrato, 
      statusContrato, 
      documentos,
      etapaLevantamento,
      etapaProjeto,
      etapaCotacao,
      etapaFabricacao,
      prazo,
      numeroPedido,
      dataInicioContrato,
      dataFimContrato
    } = req.body;

    try {
      let resultObra: any = null;

      if (dbConnected && pool) {
        try {
          const existingRes = await pool.query('SELECT * FROM obras WHERE id = $1 LIMIT 1', [id]);
          if (existingRes.rows.length > 0) {
            const existing = existingRes.rows[0];
            const updatedNome = nome !== undefined ? nome : existing.nome;
            const updatedCliente = cliente !== undefined ? (cliente || null) : existing.cliente;
            const updatedObs = observacoes !== undefined ? (observacoes || null) : existing.observacoes;
            const updatedValor = valorContrato !== undefined ? Number(valorContrato) : Number(existing.valorContrato);
            const updatedStatus = statusContrato !== undefined ? statusContrato : existing.statusContrato;
            const updatedDocs = documentos !== undefined 
              ? (typeof documentos === "string" ? documentos : JSON.stringify(documentos)) 
              : (existing.documentos !== undefined && existing.documentos !== null 
                  ? (typeof existing.documentos === "string" ? existing.documentos : JSON.stringify(existing.documentos)) 
                  : '[]');
            const updatedLev = etapaLevantamento !== undefined ? !!etapaLevantamento : existing.etapaLevantamento;
            const updatedProj = etapaProjeto !== undefined ? !!etapaProjeto : existing.etapaProjeto;
            const updatedCot = etapaCotacao !== undefined ? !!etapaCotacao : existing.etapaCotacao;
            const updatedFab = etapaFabricacao !== undefined ? !!etapaFabricacao : existing.etapaFabricacao;
             const updatedPrazo = prazo !== undefined ? prazo : existing.prazo;
            const updatedPed = numeroPedido !== undefined ? numeroPedido : existing.numeroPedido;
            const updatedInicio = dataInicioContrato !== undefined ? (dataInicioContrato || null) : existing.dataInicioContrato;
            const updatedFim = dataFimContrato !== undefined ? (dataFimContrato || null) : existing.dataFimContrato;

            await pool.query(`
              UPDATE obras SET
                nome = $1, cliente = $2, observacoes = $3, "valorContrato" = $4, "statusContrato" = $5, documentos = $6,
                "etapaLevantamento" = $7, "etapaProjeto" = $8, "etapaCotacao" = $9, "etapaFabricacao" = $10, prazo = $11, "numeroPedido" = $12,
                "dataInicioContrato" = $13, "dataFimContrato" = $14, "updatedAt" = NOW()
              WHERE id = $15
            `, [
              updatedNome, updatedCliente, updatedObs, updatedValor, updatedStatus, updatedDocs,
              updatedLev, updatedProj, updatedCot, updatedFab, updatedPrazo, updatedPed,
              updatedInicio, updatedFim, id
            ]);

            // If valorContrato was changed, we need to update the percentages for fixed items
            if (valorContrato !== undefined && Number(valorContrato) !== Number(existing.valorContrato)) {
              await ensureAndRecalculateFixedItems(id, updatedValor);
            }

            // Refetch with metrics
            const obraRes = await pool.query('SELECT * FROM obras WHERE id = $1 LIMIT 1', [id]);
            const obra = obraRes.rows[0];

            const itensResult = await pool.query(`
              SELECT i.*, 
                     c.nome as "cat_nome", c."grupoCalculo" as "cat_grupoCalculo"
              FROM itens_orcamento i
              LEFT JOIN categorias c ON i."categoriaId" = c.id
              WHERE i."obraId" = $1
              ORDER BY i.ordem ASC
            `, [id]);

            const items = itensResult.rows.map(row => ({
              id: row.id,
              descricao: row.descricao,
              valor: Number(row.valor),
              status: row.status,
              observacao: row.observacao,
              ordem: Number(row.ordem),
              obraId: row.obraId,
              categoriaId: row.categoriaId,
              subitens: typeof row.subitens === 'string' ? JSON.parse(row.subitens) : (row.subitens || []),
              createdAt: row.createdAt,
              updatedAt: row.updatedAt,
              categoria: {
                id: row.categoriaId,
                nome: row.cat_nome,
                grupoCalculo: row.cat_grupoCalculo
              }
            }));

            resultObra = {
              ...obra,
              valorContrato: Number(obra.valorContrato),
              documentos: typeof obra.documentos === 'string' ? JSON.parse(obra.documentos) : (obra.documentos || []),
              itens: items
            };
          }
        } catch (dbErr: any) {
          console.error("[RDS UPDATE ERROR] Erro bruto do driver no pg:");
          console.error(dbErr);
          throw dbErr;
        }
      } else {
        throw new Error("Conexão com AWS RDS não está ativa.");
      }

      if (!resultObra) {
        console.error(`Obra ${id} não encontrada ou falha ao atualizar`);
        return res.status(404).json({ error: "Projeto não encontrado ou falha ao atualizar" });
      }

      res.json(formatObraWithMetrics(resultObra));
    } catch (error: any) {
      console.error("Erro na rota PUT /api/obras/:id:", error);
      res.status(500).json({ error: error.message || "Erro ao atualizar dados do projeto", details: error.detail, stack: error.stack, table: error.table, hint: error.hint });
    }
  });

  // DELETE Excluir Obra
  app.delete(["/api/obras/:id", "/api/projetos/:id"], async (req, res) => {
    const { id } = req.params;
    try {
      let isRemoved = false;

      if (dbConnected && pool) {
        try {
          const existingRes = await pool.query('SELECT * FROM obras WHERE id = $1 LIMIT 1', [id]);
          if (existingRes.rows.length > 0) {
            await pool.query('DELETE FROM itens_orcamento WHERE "obraId" = $1', [id]);
            await pool.query('DELETE FROM obras WHERE id = $1', [id]);
            isRemoved = true;
          }
        } catch (dbErr: any) {
          console.error("[RDS DELETE ERROR] Erro bruto do driver no pg:");
          console.error(dbErr);
          throw dbErr;
        }
      } else {
        throw new Error("Conexão com AWS RDS não está ativa.");
      }

      if (!isRemoved) {
        return res.status(404).json({ error: "Projeto não encontrado ou falha ao excluir" });
      }

      res.json({ success: true, message: "Projeto excluído com êxito" });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao remover projeto", details: error.detail, stack: error.stack, table: error.table, hint: error.hint });
    }
  });

  // GET Categorias
  app.get("/api/categorias", async (req, res) => {
    try {
      let sorted: any[] = [];

      if (dbConnected && pool) {
        try {
          const catsRes = await pool.query('SELECT * FROM categorias ORDER BY nome ASC');
          sorted = catsRes.rows;
        } catch (dbErr) {
          console.error("Erro listando categorias no pg, usando fallback mental:", dbErr);
        }
      }

      if (!dbConnected || sorted.length === 0) {
        sorted = [...memoryCategorias].sort((a, b) => a.nome.localeCompare(b.nome));
      }

      res.json(sorted);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao buscar categorias", details: error.detail, stack: error.stack, table: error.table, hint: error.hint });
    }
  });

  // POST Criar Categoria
  app.post("/api/categorias", async (req, res) => {
    const { nome } = req.body;
    if (!nome) {
      return res.status(400).json({ error: "O nome do categoria é obrigatório" });
    }

    try {
      let novaCategoria: any = null;

      if (dbConnected && pool) {
        try {
          const dupRes = await pool.query('SELECT * FROM categorias WHERE LOWER(nome) = LOWER($1) LIMIT 1', [nome]);
          if (dupRes.rows.length > 0) {
            return res.status(400).json({ error: "Já existe uma categoria cadastrada com este nome" });
          }

          const catId = "cat-" + generateId();
          await pool.query('INSERT INTO categorias (id, nome, "grupoCalculo") VALUES ($1, $2, $3)', [catId, nome, "OUTROS"]);
          novaCategoria = { id: catId, nome, grupoCalculo: "OUTROS" };
        } catch (dbErr: any) {
          console.error("[RDS INSERT ERROR] Erro bruto do driver no pg:");
          console.error(dbErr);
          throw dbErr;
        }
      } else {
        throw new Error("Conexão com AWS RDS não está ativa.");
      }

      if (!novaCategoria) {
        throw new Error("AWS RDS processou sem gerar erros, mas não retornou a categoria.");
      }

      res.status(201).json(novaCategoria);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao cadastrar categoria", details: error.detail, stack: error.stack, table: error.table, hint: error.hint });
    }
  });

  // DELETE Excluir Categoria
  app.delete("/api/categorias/:id", async (req, res) => {
    const { id } = req.params;
    try {
      let isRemoved = false;

      if (dbConnected && pool) {
        try {
          // Remove cascade items
          await pool.query('DELETE FROM itens_orcamento WHERE "categoriaId" = $1', [id]);
          const delRes = await pool.query('DELETE FROM categorias WHERE id = $1', [id]);
          isRemoved = (delRes.rowCount ?? 0) > 0;
        } catch (dbErr: any) {
          console.error("[RDS DELETE ERROR] Erro bruto do driver no pg:");
          console.error(dbErr);
          throw dbErr;
        }
      } else {
        throw new Error("Conexão com AWS RDS não está ativa.");
      }

      if (!isRemoved) {
        return res.status(404).json({ error: "Categoria informada não existe ou falha ao excluir" });
      }

      res.json({ success: true, message: "Categoria e seus itens foram removidos permanentemente." });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao excluir categoria", details: error.detail, stack: error.stack, table: error.table, hint: error.hint });
    }
  });

  // DELETE Esvaziar Lixeira de um projeto
  app.delete(["/api/obras/:id/lixeira", "/api/projetos/:id/lixeira"], async (req, res) => {
    const { id } = req.params;
    try {
      let countRemoved = 0;

      if (dbConnected && pool) {
        try {
          const delRes = await pool.query('DELETE FROM itens_orcamento WHERE "obraId" = $1 AND status = $2', [id, "LIXEIRA"]);
          countRemoved = delRes.rowCount ?? 0;
        } catch (dbErr: any) {
          console.error("[RDS DELETE ERROR] Erro bruto do driver no pg:");
          console.error(dbErr);
          throw dbErr;
        }
      } else {
        throw new Error("Conexão com AWS RDS não está ativa.");
      }

      res.json({ success: true, message: `${countRemoved} itens removidos permanentemente.` });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao esvaziar lixeira", details: error.detail, stack: error.stack, table: error.table, hint: error.hint });
    }
  });

  // PUT Reordenar Itens
  app.put(["/api/obras/:id/reordenar", "/api/projetos/:id/reordenar"], async (req, res) => {
    const { itemIds } = req.body;
    if (!Array.isArray(itemIds)) {
      return res.status(400).json({ error: "Lista de IDs inválida" });
    }

    try {
      let orderedOk = false;

      if (dbConnected && pool) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          for (let idx = 0; idx < itemIds.length; idx++) {
            await client.query('UPDATE itens_orcamento SET ordem = $1 WHERE id = $2', [idx, itemIds[idx]]);
          }
          await client.query('COMMIT');
          orderedOk = true;
        } catch (dbErr: any) {
          await client.query('ROLLBACK');
          console.error("[RDS UPDATE ERROR] Erro bruto do driver no pg (reordenar):");
          console.error(dbErr);
          throw dbErr;
        } finally {
          client.release();
        }
      } else {
        throw new Error("Conexão com AWS RDS não está ativa.");
      }

      res.json({ success: true, message: "Itens reordenados com sucesso" });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao reordenar itens", details: error.detail, stack: error.stack, table: error.table, hint: error.hint });
    }
  });

  // POST Adicionar Item ao Orçamento de uma Obra
  app.post(["/api/obras/:id/itens", "/api/projetos/:id/itens"], async (req, res) => {
    const { id: obraId } = req.params;
    const { descricao, categoriaId, valor, status, observacao, subitens } = req.body;

    if (!descricao || !categoriaId || valor === undefined) {
      return res.status(400).json({ error: "Descrição, categoria e valor são obrigatórios" });
    }

    const subitensArray = subitens || [];
    const subitensString = JSON.stringify(subitensArray);

    try {
      let novoItem: any = null;

      if (dbConnected && pool) {
        try {
          const obraRes = await pool.query('SELECT * FROM obras WHERE id = $1 LIMIT 1', [obraId]);
          const catRes = await pool.query('SELECT * FROM categorias WHERE id = $1 LIMIT 1', [categoriaId]);

          if (obraRes.rows.length > 0 && catRes.rows.length > 0) {
            const countRes = await pool.query('SELECT COUNT(*)::int as count FROM itens_orcamento WHERE "obraId" = $1', [obraId]);
            const currentCount = countRes.rows[0].count;

            const itemId = "item-" + generateId();
            await pool.query(`
              INSERT INTO itens_orcamento (id, descricao, valor, status, observacao, ordem, subitens, "obraId", "categoriaId", "createdAt", "updatedAt")
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            `, [itemId, descricao, Number(valor), status || "ATIVO", observacao || null, currentCount, subitensString, obraId, categoriaId]);

            novoItem = {
              id: itemId,
              descricao,
              valor: Number(valor),
              status: status || "ATIVO",
              observacao: observacao || null,
              ordem: currentCount,
              subitens: subitensArray,
              obraId,
              categoriaId,
              categoria: {
                id: catRes.rows[0].id,
                nome: catRes.rows[0].nome,
                grupoCalculo: catRes.rows[0].grupoCalculo
              }
            };
          }
        } catch (dbErr: any) {
          console.error("[RDS INSERT ERROR] Erro bruto do driver no pg:");
          console.error(dbErr);
          throw dbErr;
        }
      } else {
        throw new Error("Conexão com AWS RDS não está ativa.");
      }

      if (!novoItem) {
         throw new Error("AWS RDS processou sem gerar erros, mas não retornou o item.");
      }

      res.status(201).json(novoItem);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao adicionar item de orçamento", details: error.detail, stack: error.stack, table: error.table, hint: error.hint });
    }
  });

  // PUT Atualizar Item
  app.put("/api/itens/:itemId", async (req, res) => {
    const { itemId } = req.params;
    const { descricao, categoriaId, valor, status, observacao, subitens } = req.body;

    try {
      let updatedItem: any = null;

      if (dbConnected && pool) {
        try {
          const existingRes = await pool.query('SELECT * FROM itens_orcamento WHERE id = $1 LIMIT 1', [itemId]);
          if (existingRes.rows.length > 0) {
            const existing = existingRes.rows[0];
            
            let finalCatId = existing.categoriaId;
            if (categoriaId) {
              const catExistsRes = await pool.query('SELECT * FROM categorias WHERE id = $1 LIMIT 1', [categoriaId]);
              if (catExistsRes.rows.length === 0) {
                return res.status(400).json({ error: "Categoria informada não existe" });
              }
              finalCatId = categoriaId;
            }

            const updatedDesc = descricao !== undefined ? descricao : existing.descricao;
            const updatedStatus = status !== undefined ? status : existing.status;
            const updatedObs = observacao !== undefined ? (observacao || null) : existing.observacao;

            // Recalcula o valor total baseado nos subitens se forem fornecidos ou existentes
            let updatedSubArray: any[] = [];
            if (subitens !== undefined) {
              if (Array.isArray(subitens)) {
                updatedSubArray = subitens;
              } else if (typeof subitens === 'string') {
                try {
                  updatedSubArray = JSON.parse(subitens);
                } catch (e) {
                  console.error("Failed to parse subitens in PG block", subitens);
                  updatedSubArray = [];
                }
              }
            } else {
              const currentSubStr = existing.subitens || "[]";
              if (typeof currentSubStr === "string") {
                try {
                  updatedSubArray = JSON.parse(currentSubStr);
                } catch (e) {
                  updatedSubArray = [];
                }
              } else {
                updatedSubArray = currentSubStr || [];
              }
            }

            let updatedValor = valor !== undefined ? Number(valor) : Number(existing.valor);
            if (Array.isArray(updatedSubArray) && updatedSubArray.length > 0) {
              updatedValor = updatedSubArray.reduce((acc, sub) => acc + (Number(sub.valor) || 0), 0);
            }

            const updatedSub = JSON.stringify(updatedSubArray);

            try {
              await pool.query(`
                UPDATE itens_orcamento SET
                  descricao = $1, "categoriaId" = $2, valor = $3, status = $4, observacao = $5, subitens = $6, "updatedAt" = NOW()
                WHERE id = $7
              `, [updatedDesc, finalCatId, updatedValor, updatedStatus, updatedObs, updatedSub, itemId]);
            } catch (queryErr: any) {
              // Auto-reparação: Se a coluna subitens estiver ausente por algum motivo histórico no banco real do cliente
              if (queryErr.message && (queryErr.message.includes("subitens") || queryErr.message.includes("column"))) {
                console.log("[pg Self-Heal] Tentando auto-reparar coluna subitens...");
                try {
                  await pool.query("ALTER TABLE itens_orcamento ADD COLUMN IF NOT EXISTS subitens TEXT NOT NULL DEFAULT '[]'");
                  // Tenta novamente a query original de UPDATE
                  await pool.query(`
                    UPDATE itens_orcamento SET
                      descricao = $1, "categoriaId" = $2, valor = $3, status = $4, observacao = $5, subitens = $6, "updatedAt" = NOW()
                    WHERE id = $7
                  `, [updatedDesc, finalCatId, updatedValor, updatedStatus, updatedObs, updatedSub, itemId]);
                } catch (retryErr: any) {
                  throw new Error(`Erro na auto-reparação da coluna e gravação: ${retryErr.message}`);
                }
              } else {
                throw queryErr;
              }
            }

            const freshCatRes = await pool.query('SELECT * FROM categorias WHERE id = $1 LIMIT 1', [finalCatId]);

            updatedItem = {
              id: itemId,
              descricao: updatedDesc,
              categoriaId: finalCatId,
              valor: updatedValor,
              status: updatedStatus,
              observacao: updatedObs,
              subitens: updatedSubArray,
              ordem: existing.ordem,
              obraId: existing.obraId,
              categoria: freshCatRes.rows.length > 0 ? {
                id: freshCatRes.rows[0].id,
                nome: freshCatRes.rows[0].nome,
                grupoCalculo: freshCatRes.rows[0].grupoCalculo
              } : null
            };
          }
        } catch (dbErr: any) {
          console.error("[RDS UPDATE ERROR] Erro bruto do driver no pg:");
          console.error(dbErr);
          throw dbErr;
        }
      } else {
        throw new Error("Conexão com AWS RDS não está ativa.");
      }

      if (!updatedItem) {
        return res.status(404).json({ error: "Item de orçamento não localizado ou falha ao atualizar" });
      }

      res.json(updatedItem);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao atualizar item do orçamento", details: error.detail, stack: error.stack, table: error.table, hint: error.hint });
    }
  });

  // DELETE Remover Item
  app.delete("/api/itens/:itemId", async (req, res) => {
    const { itemId } = req.params;
    try {
      let isRemoved = false;

      if (dbConnected && pool) {
        try {
          const delRes = await pool.query('DELETE FROM itens_orcamento WHERE id = $1', [itemId]);
          isRemoved = (delRes.rowCount ?? 0) > 0;
        } catch (dbErr: any) {
          console.error("[RDS DELETE ERROR] Erro bruto do driver no pg:");
          console.error(dbErr);
          throw dbErr;
        }
      } else {
        throw new Error("Conexão com AWS RDS não está ativa.");
      }

      if (!isRemoved) {
        return res.status(404).json({ error: "Item de orçamento não localizado ou falha ao excluir" });
      }

      res.json({ success: true, message: "Item removido com sucesso" });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao deletar item do orçamento", details: error.detail, stack: error.stack, table: error.table, hint: error.hint });
    }
  });

  /* ==============================================
     DEV & PROD WEB SERVER ROUTING
     ============================================== */

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express gateway running on http://localhost:${PORT}`);
    // Boot: trace the database state or use local fallback seamlessly
    checkDbConnection().then((connected) => {
      console.log(`[BOOT] Conexão inicial com banco de dados finalizada: ${connected ? "Supabase PostgreSQL ATIVO" : "Modo em Memória fall-back ATIVO"}`);
    });
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start gateway server:", err);
});
