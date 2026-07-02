import dotenv from "dotenv";
dotenv.config({ path: ".env.production" });
dotenv.config(); // fall back to standard .env if needed

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// ================= BOOT DIAGNOSTICS & SYSTEM AUDIT =================
import path from "path";
import fs from "fs";
import pg from "pg";
import crypto from "crypto";

async function runBootDiagnostics() {
  console.log("\n===============================================================================");
  console.log("               DIAGNÓSTICO REAL DE AMBIENTE E BANCO DE DADOS (BOOT)");
  console.log("===============================================================================");
  
  const envPath = path.join(process.cwd(), ".env");
  const prodEnvPath = path.join(process.cwd(), ".env.production");
  const pm2Path = path.join(process.cwd(), "ecosystem.config.cjs");

  console.log("1. ARQUIVOS FÍSICOS PRESENTES NO DIRETÓRIO RAIZ:");
  console.log(`   - [.env local] presente? ${fs.existsSync(envPath) ? "SIM (Carregado)" : "NÃO"}`);
  console.log(`   - [.env.production (PM2)] presente? ${fs.existsSync(prodEnvPath) ? "SIM (Carregado)" : "NÃO"}`);
  console.log(`   - [ecosystem.config.cjs] presente? ${fs.existsSync(pm2Path) ? "SIM" : "NÃO"}`);

  console.log("\n2. VALORES ATUAIS DAS VARIÁVEIS DE AMBIENTE (REPRODUZIDO NO RUNTIME):");
  const varsToCheck = [
    "DATABASE_URL",
    "DATABASE_URL_RDS",
    "AWS_REGION",
    "AWS_S3_BUCKET",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "PGHOST",
    "PGPORT",
    "PGUSER",
    "PGDATABASE"
  ];

  const maskStr = (str: string) => {
    if (!str) return "N/A";
    const clean = str.replace(/"/g, "").trim();
    return clean.replace(/:([^:@]+)@/, ":******@").replace(/AKIA[A-Z0-9]{16}/, "AKIA**************");
  };

  varsToCheck.forEach(v => {
    console.log(`   - [${process.env[v] ? "SET" : "AUSENTE"}] ${v}: "${maskStr(process.env[v] || "")}"`);
  });

  console.log("\n3. ORIGEM DAS CONFIGURAÇÕES ENCONTRADAS EM DISCO:");
  if (fs.existsSync(envPath)) {
    console.log("   --> No arquivo .env local:");
    fs.readFileSync(envPath, "utf-8").split("\n").forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith("DATABASE_URL") || trimmed.startsWith("AWS_") || trimmed.startsWith("PG")) {
        console.log(`       * ${trimmed.split("=")[0]}=${maskStr(trimmed.substring(trimmed.indexOf("=")+1))}`);
      }
    });
  }

  if (fs.existsSync(prodEnvPath)) {
    console.log("   --> No arquivo .env.production:");
    fs.readFileSync(prodEnvPath, "utf-8").split("\n").forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith("DATABASE_URL") || trimmed.startsWith("AWS_") || trimmed.startsWith("PG")) {
        console.log(`       * ${trimmed.split("=")[0]}=${maskStr(trimmed.substring(trimmed.indexOf("=")+1))}`);
      }
    });
  }

  const connStr = process.env.DATABASE_URL_RDS || process.env.DATABASE_URL;
  console.log("\n4. ANÁLISE DE CONEXÃO RUNTIME:");
  if (!connStr) {
    console.error("   [ERRO CRÍTICO] Nenhuma Connection String foi informada/resolvida para o PostgreSQL!");
    console.error("   O fallback para Memória será ativado devido à FALTA DE VARIÁVEIS.");
    return;
  }

  const cleanUrl = connStr.replace(/"/g, "").trim().replace(/sslmode=[^&]+/g, "").replace(/\?&/g, "?").replace(/&&/g, "&");
  const hostMatch = cleanUrl.match(/@([^/:]+)(?::([0-9]+))?\/([^?]+)/);
  if (hostMatch) {
    console.log(`   - Host Alvo: "${hostMatch[1]}"`);
    console.log(`   - Porta Alvo: "${hostMatch[2] || "5432"}"`);
    console.log(`   - Banco de Dados Alvo: "${hostMatch[3]}"`);
  } else {
    console.log("   - Formato de URL não-padrão detectado para parsing simples.");
  }

  console.log("   - Iniciando teste de handshake socket com o banco...");
  const tPool = new pg.Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  const start = Date.now();
  try {
    const res = await tPool.query("SELECT 1 AS test_ok");
    console.log(`   --> [SUCESSO] Conexão efetuada com sucesso em ${Date.now() - start}ms!`);
    console.log(`   --> Status da Query de Verificação: OK (Retornou ${res.rows[0].test_ok})`);
  } catch (err: any) {
    console.error(`\n   [FALHA DE CONEXÃO GRÁVIDA] Erro após ${Date.now() - start}ms.`);
    console.error(`   Identificador do Erro (code): ${err.code || "Sem Código"}`);
    console.error(`   Mensagem Amigável: ${err.message}`);
    if (err.address) console.error(`   Endereço Físico IP: ${err.address}`);
    if (err.port) console.error(`   Porta do Erro: ${err.port}`);
    console.error("\n   STACK TRACE COMPLETO DO CONTRATO DE CONEXÃO:");
    console.error(err.stack);
    console.error("\n   DIAGNÓSTICO DO FALLBACK MEMORY:");
    if (err.code === "ETIMEOUT" || err.message.toLowerCase().includes("timeout")) {
      console.error("   --> CAUSA: TIMEOUT. O banco não respondeu a tempo (bloqueio de Firewall, rede, ou security group in AWS RDS).");
    } else if (err.code === "ENOTFOUND" || err.code === "EAI_AGAIN") {
      console.error("   --> CAUSA: HOST NÃO ENCONTRADO/DNS. O host informado não existe ou DNS falhou.");
    } else if (err.code === "ECONNREFUSED") {
      console.error("   --> CAUSA: CONEXÃO RECUSADA. Porta fechada ou RDS não escutando.");
    } else if (err.message.includes("certificate") || err.code === "SELF_SIGNED_CERT_IN_CHAIN") {
      console.error("   --> CAUSA: ERRO DE CERTIFICADO SSL. Falha no handshake SSL/TSL.");
    } else if (err.message.includes("password") || err.message.includes("authentication") || err.code === "28P01") {
      console.error("   --> CAUSA: ERRO DE AUTENTICAÇÃO. Usuário ou senha incorretos.");
    } else {
      console.error("   --> CAUSA: ERRO DE REDE OU CONFIGURAÇÃO DESCONHECIDA.");
    }
  } finally {
    await tPool.end().catch(() => {});
    console.log("===============================================================================\n");
  }
}

// Inicia diagnóstico de Boot assincronamente mas sem travar execução inicial
runBootDiagnostics().catch(e => console.error("Erro rodando boot diagnostics:", e));

import express from "express";
import multer from "multer";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// AWS S3 Client
let s3Client: S3Client | null = null;
const BUCKET_NAME = process.env.AWS_S3_BUCKET;

function initializeS3Client() {
  const REQUIRED_AWS_VARS = ["AWS_REGION", "AWS_S3_BUCKET", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"];
  
  for (const varName of REQUIRED_AWS_VARS) {
    if (!process.env[varName]) {
      throw new Error(`[ERROR] Variável de ambiente ${varName} ausente.`);
    }
  }

  s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  console.log(`[BOOT] S3 Client inicializado com sucesso no bucket ${BUCKET_NAME}`);
}

// Local storage setup
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadLocal = multer({ storage: storage });

const upload = multer({ storage: multer.memoryStorage() });

/*
  S3 Folder Structure: obras/{obra_id}/{categoria_lower}/
*/

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

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
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
const { Pool } = pg;

const PORT = Number(process.env.PORT) || 3000;
let rdsPoolNative: pg.Pool | null = null;
let dbConnectedRds = false;

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
  let urlRds = process.env.DATABASE_URL || process.env.DATABASE_URL_RDS || "";
  urlRds = sanitizeDbUrl(urlRds);

  // Tentando RDS
  if (urlRds && (urlRds.startsWith("postgres://") || urlRds.startsWith("postgresql://")) && !checkHasPlaceholder(urlRds)) {
    try {
      if (rdsPoolNative) rdsPoolNative.end().catch(() => {});
      const cleanUrl = urlRds.replace(/sslmode=[^&]+/g, "").replace(/\?&/g, "?").replace(/&&/g, "&");
      rdsPoolNative = new Pool({
        connectionString: cleanUrl,
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
    console.error("[pg] Nenhuma DATABASE_URL ou DATABASE_URL_RDS válida configurada.");
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
        const res = await Promise.race([
          rdsPoolNative.query("SELECT 1 AS ok"),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout de conexão RDS (4s)")), 4000))
        ]) as any;
        dbConnectedRds = true;
        console.log("[pg] Conexão EXCLUSIVA com AWS RDS estabelecida com sucesso. SELECT 1 status:", res.rows[0].ok);
        console.log("RDS CONNECTION ACTIVE");
      } catch (e: any) {
        dbConnectedRds = false;
        console.warn(`[pg] AWS RDS falhou no Health Check:`, e);
      }
    } else {
      dbConnectedRds = false;
    }

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
          );
        `);

        // Ensure no duplicates exist in case the table was created without a unique constraint
        await pool.query('DELETE FROM categorias a USING categorias b WHERE a.id < b.id AND LOWER(a.nome) = LOWER(b.nome)');
        // Ensure the unique index exists for ON CONFLICT to work
        await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_nome_unique ON categorias (nome)');

        await pool.query(`
          DO $$ BEGIN
              CREATE TYPE categoria_documento AS ENUM (
                'EDITAL', 'CONTRATO', 'MEDICAO', 'ART', 'CNO', 'ORCAMENTO', 
                'LEVANTAMENTO', 'NF', 'COMPROVANTE', 'OUTROS'
              );
          EXCEPTION
              WHEN duplicate_object THEN null;
          END $$;
          
          CREATE TABLE IF NOT EXISTS documentos (
            id VARCHAR(255) PRIMARY KEY,
            obra_id VARCHAR(255) NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
            nome_arquivo VARCHAR(255) NOT NULL,
            nome_original VARCHAR(255) NOT NULL,
            extensao VARCHAR(50) NOT NULL,
            mime_type VARCHAR(100) NOT NULL,
            tamanho_bytes BIGINT NOT NULL,
            categoria categoria_documento NOT NULL,
            s3_key VARCHAR(512),
            s3_url VARCHAR(1024),
            caminho_local VARCHAR(512),
            hash_arquivo VARCHAR(255),
            observacao TEXT,
            uploaded_by VARCHAR(255),
            versao INTEGER DEFAULT 1,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            deleted_at TIMESTAMP WITH TIME ZONE
          );
          
          ALTER TABLE documentos ALTER COLUMN s3_key DROP NOT NULL;
          ALTER TABLE documentos ALTER COLUMN s3_url DROP NOT NULL;
          ALTER TABLE documentos ADD COLUMN IF NOT EXISTS caminho_local VARCHAR(512);
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
            "custoAdm" DOUBLE PRECISION,
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
        await pool.query('ALTER TABLE obras ADD COLUMN IF NOT EXISTS "custoAdm" DOUBLE PRECISION');

        // Create table configuracoes_sistema for system-wide configs like custo_adm_global
        await pool.query(`
          CREATE TABLE IF NOT EXISTS configuracoes_sistema (
            chave VARCHAR(255) PRIMARY KEY,
            valor VARCHAR(255) NOT NULL
          )
        `);

        // Create table usuarios
        await pool.query(`
          CREATE TABLE IF NOT EXISTS usuarios (
            id VARCHAR(255) PRIMARY KEY,
            nome VARCHAR(255) NOT NULL,
            nome_usuario VARCHAR(255) UNIQUE,
            email VARCHAR(255) UNIQUE NOT NULL,
            senha VARCHAR(255) NOT NULL,
            nivel VARCHAR(50) NOT NULL DEFAULT 'OPERADOR',
            permissoes TEXT NOT NULL,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nome_usuario VARCHAR(255) UNIQUE');
        await pool.query("UPDATE usuarios SET nome_usuario = LOWER(SPLIT_PART(email, '@', 1)) WHERE nome_usuario IS NULL");

        // Create table sessoes
        await pool.query(`
          CREATE TABLE IF NOT EXISTS sessoes (
            id VARCHAR(255) PRIMARY KEY,
            "usuarioId" VARCHAR(255) NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            expiracao TIMESTAMP WITH TIME ZONE NOT NULL,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Seed default admin
        const checkAdmin = await pool.query("SELECT id FROM usuarios WHERE email = $1", ["admin@projetocerto.com"]);
        if (checkAdmin.rowCount === 0) {
          const adminId = "usr-admin-seed";
          const adminPwdHash = hashPassword("admin123");
          const adminPerms = JSON.stringify({
            modulos: {
              dashboard: true,
              contratosConsolidados: true,
              orcamentosAFechar: true,
              etapasContrato: true,
              levantamentosOrcamentos: true,
              usuarios: true
            },
            indicadores: {
              totalContratos: true,
              totalVisaoGeral: true,
              totalMargem: true,
              percentualMedio: true,
              totalAdm: true,
              kpiProjecao: true,
              kpiAdm: true,
              graficoCustos: true
            },
            colunas: {
              valorContrato: true,
              custoAdm: true,
              valorItens: true,
              subestruturas: true
            },
            acoes: {
              visualizar: true,
              editar: true
            }
          });

          await pool.query(
            'INSERT INTO usuarios (id, nome, nome_usuario, email, senha, nivel, permissoes) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [adminId, "Administrador", "admin", "admin@projetocerto.com", adminPwdHash, "ADMIN", adminPerms]
          );
          console.log("[pg Sync] Seeding default admin user (admin@projetocerto.com / admin123)");
        }

        // Initialize levantamentos table if not exist
        await pool.query(`
          CREATE TABLE IF NOT EXISTS levantamentos (
            id VARCHAR(255) PRIMARY KEY,
            ref VARCHAR(255) NOT NULL,
            obra VARCHAR(255) NOT NULL,
            cliente VARCHAR(255) NOT NULL,
            "dataSolicitacao" VARCHAR(255) NOT NULL,
            abc VARCHAR(255),
            solicitante VARCHAR(255),
            responsavel VARCHAR(255) NOT NULL,
            status VARCHAR(255) NOT NULL,
            previsao VARCHAR(255),
            "qtdM2" DOUBLE PRECISION,
            "statusEnvio" VARCHAR(255) NOT NULL,
            "contratoAFecharId" VARCHAR(255),
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Check columns and add link to Obras
        await pool.query('ALTER TABLE obras ADD COLUMN IF NOT EXISTS "levantamentoId" VARCHAR(255)');
        await pool.query('ALTER TABLE levantamentos ADD COLUMN IF NOT EXISTS "contratoAFecharId" VARCHAR(255)');
        await pool.query('ALTER TABLE levantamentos ADD COLUMN IF NOT EXISTS subestruturas TEXT');
        await pool.query('ALTER TABLE levantamentos ADD COLUMN IF NOT EXISTS subestruturas_pc TEXT');
        await pool.query('ALTER TABLE levantamentos ADD COLUMN IF NOT EXISTS "origemLeads" VARCHAR(255) DEFAULT \'Projeto Certo\'');
        await pool.query('UPDATE levantamentos SET "origemLeads" = \'Projeto Certo\'');
        await pool.query('ALTER TABLE levantamentos ALTER COLUMN "cliente" DROP NOT NULL');
        await pool.query('ALTER TABLE levantamentos ALTER COLUMN "statusEnvio" DROP NOT NULL');
        await pool.query('ALTER TABLE levantamentos ALTER COLUMN "responsavel" DROP NOT NULL');
        await pool.query('ALTER TABLE levantamentos ALTER COLUMN "status" DROP NOT NULL');
        await pool.query('ALTER TABLE levantamentos ALTER COLUMN "dataSolicitacao" DROP NOT NULL');
        await pool.query('ALTER TABLE levantamentos ALTER COLUMN "obra" DROP NOT NULL');

        // No longer enforcing a strict UNIQUE constraint on "ref" across all months, since refs reset monthly.

        // Cria a tabela filha levantamento_materiais se não existir
        await pool.query(`
          CREATE TABLE IF NOT EXISTS levantamento_materiais (
            id VARCHAR(255) PRIMARY KEY,
            levantamento_id VARCHAR(255) NOT NULL REFERENCES levantamentos(id) ON DELETE CASCADE,
            material TEXT NOT NULL,
            qtd_m2 DOUBLE PRECISION NOT NULL DEFAULT 0.0,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Migrar datas de solicitação existentes para o formato brasileiro DD/MM/AAAA de forma robusta
        try {
          console.log("[pg Sync] Normalizando formatos de datas de solicitação para brasileiro (DD/MM/AAAA)...");
          const allLevsRes = await pool.query('SELECT id, "dataSolicitacao", previsao FROM levantamentos');
          for (const row of allLevsRes.rows) {
            const convertedDate = convertDateToBR(row.dataSolicitacao);
            const convertedPrevisao = row.previsao ? convertDateToBR(row.previsao) : null;
            if (convertedDate !== row.dataSolicitacao || (row.previsao && convertedPrevisao !== row.previsao)) {
              await pool.query(
                'UPDATE levantamentos SET "dataSolicitacao" = $1, previsao = $2 WHERE id = $3',
                [convertedDate, convertedPrevisao, row.id]
              );
            }
          }
          console.log("[pg Sync] Todas as datas de solicitação normalizadas com sucesso!");
        } catch (e: any) {
          console.error("Erro ao normalizar datas de levantamentos:", e);
        }

        // Migrar dados de Material PC para Material HD de forma definitiva se houver
        try {
          console.log("[pg Sync] Migrando dados de Material PC para Material HD...");
          const allLevsRes = await pool.query('SELECT id, subestruturas, subestruturas_pc FROM levantamentos');
          for (const row of allLevsRes.rows) {
            let subListHD: any[] = [];
            let subListPC: any[] = [];
            
            if (row.subestruturas) {
              try {
                subListHD = typeof row.subestruturas === "string" ? JSON.parse(row.subestruturas) : row.subestruturas;
              } catch (e) {
                subListHD = [];
              }
            }
            if (!Array.isArray(subListHD)) subListHD = [];

            if (row.subestruturas_pc) {
              try {
                subListPC = typeof row.subestruturas_pc === "string" ? JSON.parse(row.subestruturas_pc) : row.subestruturas_pc;
              } catch (e) {
                subListPC = [];
              }
            }
            if (!Array.isArray(subListPC)) subListPC = [];

            if (subListPC.length > 0) {
              console.log(`[pg Sync] Migrando ${subListPC.length} itens PC para HD no levantamento ${row.id}...`);
              // Convert PC items to HD format
              const convertedPCtoHD = subListPC.map((item: any) => {
                let rawQty = item.qtdPC !== undefined ? item.qtdPC : (item.qtdM2 || 0);
                if (typeof rawQty === "string") {
                  rawQty = rawQty.trim().replace(/\./g, "").replace(",", ".");
                }
                const parsedQty = parseFloat(rawQty) || 0;

                let rawVal = item.valorUnitario;
                if (typeof rawVal === "string") {
                  rawVal = rawVal.trim().replace(/\./g, "").replace(",", ".");
                }
                const parsedVal = parseFloat(rawVal) || 0;

                return {
                  material: item.material || "Material PC Migrado",
                  qtdHD: parsedQty,
                  qtdM2: parsedQty,
                  valorUnitario: parsedVal
                };
              });
              
              // Append to HD items
              const mergedHD = [...subListHD, ...convertedPCtoHD];
              
              // Update database
              await pool.query(
                'UPDATE levantamentos SET subestruturas = $1, subestruturas_pc = $2, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $3',
                [JSON.stringify(mergedHD), '[]', row.id]
              );
            }
          }
          console.log("[pg Sync] Migração de Material PC para Material HD concluída com sucesso!");
        } catch (e: any) {
          console.error("Erro na migração de Material PC para Material HD:", e);
        }

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
        // Seed default categories
        await seedCategories(pool);

        // ONE-TIME CLEAN REMOVED: Automatic database wiping is strictly disabled to prevent loss of user data on server restart.
        console.log("[pg Sync] Carga de tabelas garantida e protegida contra limpezas involuntárias.");
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

// Standard mock ID generator
function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Helper to convert any input date string to Brazilian format DD/MM/YYYY
function convertDateToBR(dateStr: string): string {
  if (!dateStr || typeof dateStr !== "string") return "";
  
  const clean = dateStr.trim();
  
  // Try matching standard ISO format YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = clean.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  if (isoMatch) {
    const [_, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }
  
  // Match DD/MM/YYYY or MM/DD/YYYY formats
  const slashesMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (slashesMatch) {
    const [_, part1, part2, year] = slashesMatch;
    const p1 = parseInt(part1, 10);
    const p2 = parseInt(part2, 10);
    
    if (p1 > 12) {
      // Must be DD/MM/YYYY
      const day = String(p1).padStart(2, "0");
      const month = String(p2).padStart(2, "0");
      return `${day}/${month}/${year}`;
    } else if (p2 > 12) {
      // Must be MM/DD/YYYY (American) since month cannot be > 12
      const day = String(p2).padStart(2, "0");
      const month = String(p1).padStart(2, "0");
      return `${day}/${month}/${year}`;
    } else {
      // Both are <= 12. Format neatly as DD/MM/YYYY
      const day = String(p1).padStart(2, "0");
      const month = String(p2).padStart(2, "0");
      return `${day}/${month}/${year}`;
    }
  }
  
  // Try JavaScript Date parser
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  }
  
  return clean;
}

const seedCategories = async (pool: any) => {
  const mandatoryCategories = [
    { nome: 'Materiais', grupoCalculo: 'MATERIAL' },
    { nome: 'Insumos', grupoCalculo: 'MATERIAL' },
    { nome: 'Mão de Obra', grupoCalculo: 'MAO_OBRA' },
    { nome: 'Administração', grupoCalculo: 'ADMINISTRACAO' },
    { nome: 'Impostos', grupoCalculo: 'IMPOSTOS' },
    { nome: 'Transporte / Logística', grupoCalculo: 'LOGISTICA' },
    { nome: 'Margem Líquida', grupoCalculo: 'MARGEM' },
  ];

  console.log("[BOOTSTRAP] Verificando categorias obrigatórias...");
  let createdCount = 0;
  let verifiedCount = 0;

  for (const cat of mandatoryCategories) {
    try {
      const res = await pool.query(`
        INSERT INTO categorias (id, nome, "grupoCalculo")
        VALUES ($1, $2, $3)
        ON CONFLICT (nome) DO UPDATE SET "grupoCalculo" = EXCLUDED."grupoCalculo"
        RETURNING (xmax = 0) AS inserted;
      `, ["cat-" + Math.random().toString(36).substring(2, 10), cat.nome, cat.grupoCalculo]);
      
      verifiedCount++;
      if (res.rows[0].inserted) {
        console.log(`[BOOTSTRAP] Categoria ${cat.nome} criada.`);
        createdCount++;
      } else {
        console.log(`[BOOTSTRAP] Categoria ${cat.nome} OK.`);
      }
    } catch (err) {
      console.error(`[BOOTSTRAP] Falha ao criar categoria ${cat.nome}:`, err);
      throw new Error(`Bootstrap Failure: categoria "${cat.nome}" não pôde ser criada.`);
    }
  }

  console.log(`[BOOTSTRAP] Total categorias verificadas: ${verifiedCount}`);
  console.log(`[BOOTSTRAP] Total categorias criadas: ${createdCount}`);
};

const ensureAndRecalculateFixedItems = async (obraId: string, valorContrato: number) => {
  const valueContract = Number(valorContrato) || 0;

  if (dbConnected && pool) {
    try {
      const catImpostosRes = await pool.query('SELECT * FROM categorias WHERE nome = $1 LIMIT 1', ["Impostos"]);
      const catAdmRes = await pool.query('SELECT * FROM categorias WHERE nome = $1 LIMIT 1', ["Administração"]);
      const catImpostos = catImpostosRes.rows[0];
      const catAdm = catAdmRes.rows[0];

      // Retrieve custom/individual ADM cost, else check system setting
      let resolvedPct = 5.0;
      const obraRes = await pool.query('SELECT "custoAdm" FROM obras WHERE id = $1 LIMIT 1', [obraId]);
      if (obraRes.rows.length > 0) {
        const row = obraRes.rows[0];
        if (row.custoAdm !== null && row.custoAdm !== undefined) {
          resolvedPct = Number(row.custoAdm);
        } else {
          // Check global
          const configRes = await pool.query("SELECT valor FROM configuracoes_sistema WHERE chave = 'custo_adm_global' LIMIT 1");
          if (configRes.rows.length > 0) {
            const valStr = configRes.rows[0].valor;
            if (valStr !== null && valStr !== undefined && valStr !== "") {
              resolvedPct = Number(valStr);
            } else {
              resolvedPct = 5.0;
            }
          }
        }
      }

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
        const calculatedValue = Math.round(valueContract * (resolvedPct / 100) * 100) / 100;

        if (!admItem) {
          const countRes = await pool.query('SELECT COUNT(*)::int as count FROM itens_orcamento WHERE "obraId" = $1', [obraId]);
          const currentCount = countRes.rows[0].count;
          await pool.query(`
            INSERT INTO itens_orcamento (id, descricao, valor, status, observacao, ordem, "obraId", "categoriaId", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          `, [`fixed-custo-adm-${obraId}`, "Custo ADM", calculatedValue, "ATIVO", `${resolvedPct}%`, (currentCount || 99) + 1, obraId, catAdm.id]);
        } else {
          // Update the already existing Custo ADM row to reflect resolved percentage and recalculated value
          await pool.query(`
            UPDATE itens_orcamento 
            SET valor = $1, observacao = $2, "updatedAt" = NOW()
            WHERE id = $3
          `, [calculatedValue, `${resolvedPct}%`, admItem.id]);
        }
      }

      // Now query ALL items for this project and update any item that contains a '%' in its observation
      const allItensRes = await pool.query('SELECT * FROM itens_orcamento WHERE "obraId" = $1', [obraId]);
      for (const item of allItensRes.rows) {
        // Skip Custo ADM because we handled it above
        if (item.descricao === "Custo ADM") continue;

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
      console.error("[RDS ERROR] Erro recriando/recalculando itens fixos no Postgres:");
      console.error(pgErr);
      throw pgErr;
    }
  }
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
    custoAdm: obra.custoAdm !== null && obra.custoAdm !== undefined ? Number(obra.custoAdm) : null,
  };
};

async function bootstrap() {
  console.log(`[BOOT] Inicializando servidor na porta ${PORT}...`);
  try {
    initializeS3Client();
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  }
  const app = express();
  app.use(express.json({ limit: "150mb" }));
  app.use(express.urlencoded({ limit: "150mb", extended: true }));

  // API Status / Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date() });
  });

  // Authentication middleware
  const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if ((req as any).user) {
      return next(); // Already authenticated by previous middleware
    }
    
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Sessão não informada ou inválida." });
      }

      const token = authHeader.split(" ")[1];
      const sessionRes = await pool.query(`
        SELECT s.id as session_id, s.expiracao, u.id, u.nome, u.nome_usuario, u.email, u.nivel, u.permissoes 
        FROM sessoes s 
        JOIN usuarios u ON s."usuarioId" = u.id 
        WHERE s.id = $1
      `, [token]);

      if (sessionRes.rowCount === 0) {
        return res.status(401).json({ error: "Sessão expirada ou inválida." });
      }

      const session = sessionRes.rows[0];
      if (new Date(session.expiracao) < new Date()) {
        await pool.query('DELETE FROM sessoes WHERE id = $1', [token]);
        return res.status(401).json({ error: "Sessão expirada." });
      }

      // Parse permissions
      let permissoesObj = {};
      try {
        permissoesObj = typeof session.permissoes === 'string' ? JSON.parse(session.permissoes) : session.permissoes;
      } catch (e) {
        permissoesObj = {};
      }

      (req as any).user = {
        id: session.id,
        nome: session.nome,
        nome_usuario: session.nome_usuario,
        email: session.email,
        nivel: session.nivel,
        permissoes: permissoesObj
      };

      next();
    } catch (err: any) {
      console.error("Erro no middleware de autenticação:", err);
      res.status(500).json({ error: "Erro interno de autenticação." });
    }
  };

  // POST /api/login
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "E-mail/Usuário e senha são obrigatórios." });
      }

      const loginInput = email.trim().toLowerCase();
      const userRes = await pool.query('SELECT * FROM usuarios WHERE email = $1 OR LOWER(nome_usuario) = $1', [loginInput]);
      if (userRes.rowCount === 0) {
        return res.status(401).json({ error: "Credenciais inválidas." });
      }

      const user = userRes.rows[0];
      const inputHash = hashPassword(password);
      if (inputHash !== user.senha) {
        return res.status(401).json({ error: "Credenciais inválidas." });
      }

      // Create a session
      const sessionId = crypto.randomUUID();
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30); // 30 days session validity

      await pool.query(
        'INSERT INTO sessoes (id, "usuarioId", expiracao) VALUES ($1, $2, $3)',
        [sessionId, user.id, expirationDate]
      );

      let permissoesObj = {};
      try {
        permissoesObj = typeof user.permissoes === 'string' ? JSON.parse(user.permissoes) : user.permissoes;
      } catch (e) {
        permissoesObj = {};
      }

      res.json({
        token: sessionId,
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          nivel: user.nivel,
          permissoes: permissoesObj
        }
      });
    } catch (err: any) {
      console.error("Erro no login:", err);
      res.status(500).json({ error: "Erro interno ao realizar login." });
    }
  });

  // Global API Authentication Guard
  app.use("/api", (req, res, next) => {
    // /health and /login are defined before this middleware, so they won't even hit it, 
    // but we add them here for safety.
    const publicRoutes = ["/health", "/login", "/db/status", "/db/sync"];
    if (publicRoutes.includes(req.path)) {
      return next();
    }
    return requireAuth(req, res, next);
  });

  // GET /api/me
  app.get("/api/me", requireAuth, (req, res) => {
    res.json({ user: (req as any).user });
  });

  // POST /api/logout
  app.post("/api/logout", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        await pool.query('DELETE FROM sessoes WHERE id = $1', [token]);
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error("Erro no logout:", err);
      res.status(500).json({ error: "Erro ao realizar logout." });
    }
  });

  // GET /api/usuarios
  app.get("/api/usuarios", requireAuth, async (req, res) => {
    try {
      const currentUser = (req as any).user;
      if (currentUser.nivel !== 'ADMIN') {
        return res.status(403).json({ error: "Acesso negado." });
      }

      if (dbConnected && pool) {
        const usersRes = await pool.query('SELECT id, nome, nome_usuario, email, nivel, permissoes, "createdAt", "updatedAt" FROM usuarios ORDER BY nome ASC');
        const users = usersRes.rows.map(u => {
          let permissoesObj = {};
          try {
            permissoesObj = typeof u.permissoes === 'string' ? JSON.parse(u.permissoes) : u.permissoes;
          } catch (e) {
            permissoesObj = {};
          }
          return {
            id: u.id,
            nome: u.nome,
            nome_usuario: u.nome_usuario,
            email: u.email,
            nivel: u.nivel,
            permissoes: permissoesObj,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt
          };
        });

        res.json(users);
      } else {
        res.status(500).json({ error: "Conexão com AWS RDS inativa." });
      }
    } catch (err: any) {
      console.error("Erro ao listar usuários:", err);
      res.status(500).json({ error: "Erro interno ao listar usuários." });
    }
  });

  // POST /api/usuarios
  app.post("/api/usuarios", requireAuth, async (req, res) => {
    try {
      const currentUser = (req as any).user;
      if (currentUser.nivel !== 'ADMIN') {
        return res.status(403).json({ error: "Acesso negado." });
      }

      const { nome, nome_usuario, email, senha, nivel, permissoes } = req.body;
      if (!nome || !nome_usuario || !email || !senha || !nivel) {
        return res.status(400).json({ error: "Nome, nome de usuário, e-mail, senha e nível são obrigatórios." });
      }

      if (dbConnected && pool) {
        const checkRes = await pool.query('SELECT id FROM usuarios WHERE email = $1 OR nome_usuario = $2', [email.trim().toLowerCase(), nome_usuario.trim().toLowerCase()]);
        if (checkRes.rowCount > 0) {
          return res.status(400).json({ error: "E-mail ou nome de usuário já cadastrado." });
        }

        const userId = `usr-${crypto.randomUUID()}`;
        const hashed = hashPassword(senha);
        const permsStr = typeof permissoes === 'string' ? permissoes : JSON.stringify(permissoes || {});

        await pool.query(
          'INSERT INTO usuarios (id, nome, nome_usuario, email, senha, nivel, permissoes) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [userId, nome.trim(), nome_usuario.trim().toLowerCase(), email.trim().toLowerCase(), hashed, nivel, permsStr]
        );

        res.json({ success: true, id: userId });
      } else {
        res.status(500).json({ error: "Conexão com AWS RDS inativa." });
      }
    } catch (err: any) {
      console.error("Erro ao criar usuário:", err);
      res.status(500).json({ error: "Erro interno ao criar usuário." });
    }
  });

  // PUT /api/usuarios/:id
  app.put("/api/usuarios/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = (req as any).user;
      if (currentUser.nivel !== 'ADMIN') {
        return res.status(403).json({ error: "Acesso negado." });
      }

      const { id } = req.params;
      const { nome, nome_usuario, email, senha, nivel, permissoes } = req.body;

      if (dbConnected && pool) {
        const checkRes = await pool.query('SELECT id, senha FROM usuarios WHERE id = $1', [id]);
        if (checkRes.rowCount === 0) {
          return res.status(404).json({ error: "Usuário não encontrado." });
        }

        const checkUniq = await pool.query('SELECT id FROM usuarios WHERE (email = $1 OR nome_usuario = $2) AND id != $3', [email.trim().toLowerCase(), nome_usuario.trim().toLowerCase(), id]);
        if (checkUniq.rowCount > 0) {
          return res.status(400).json({ error: "E-mail ou nome de usuário já cadastrado." });
        }

        let updatedSenha = checkRes.rows[0].senha;
        if (senha && senha.trim() !== "") {
          updatedSenha = hashPassword(senha);
        }

        const permsStr = typeof permissoes === 'string' ? permissoes : JSON.stringify(permissoes || {});

        await pool.query(
          'UPDATE usuarios SET nome = $1, nome_usuario = $2, email = $3, senha = $4, nivel = $5, permissoes = $6, "updatedAt" = NOW() WHERE id = $7',
          [nome.trim(), nome_usuario.trim().toLowerCase(), email.trim().toLowerCase(), updatedSenha, nivel, permsStr, id]
        );

        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Conexão com AWS RDS inativa." });
      }
    } catch (err: any) {
      console.error("Erro ao atualizar usuário:", err);
      res.status(500).json({ error: "Erro interno ao atualizar usuário." });
    }
  });

  // DELETE /api/usuarios/:id
  app.delete("/api/usuarios/:id", requireAuth, async (req, res) => {
    try {
      const currentUser = (req as any).user;
      if (currentUser.nivel !== 'ADMIN') {
        return res.status(403).json({ error: "Acesso negado." });
      }

      const { id } = req.params;
      if (id === 'usr-admin-seed') {
        return res.status(400).json({ error: "O administrador padrão não pode ser excluído." });
      }

      if (dbConnected && pool) {
        const delRes = await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
        if (delRes.rowCount === 0) {
          return res.status(404).json({ error: "Usuário não encontrado." });
        }

        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Conexão com AWS RDS inativa." });
      }
    } catch (err: any) {
      console.error("Erro ao excluir usuário:", err);
      res.status(500).json({ error: "Erro interno ao excluir usuário." });
    }
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
        `);

        // Ensure no duplicates exist in case the table was created without a unique constraint
        await client.query('DELETE FROM categorias a USING categorias b WHERE a.id < b.id AND LOWER(a.nome) = LOWER(b.nome)');
        // Ensure the unique index exists for ON CONFLICT to work
        await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_nome_unique ON categorias (nome)');

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
            documentos TEXT NOT NULL DEFAULT '[]',
            "dataInicioContrato" VARCHAR(255),
            "dataFimContrato" VARCHAR(255),
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          ALTER TABLE obras ADD COLUMN IF NOT EXISTS "statusContrato" VARCHAR(255) NOT NULL DEFAULT 'CONSOLIDADO';
          ALTER TABLE obras ADD COLUMN IF NOT EXISTS "dataInicioContrato" VARCHAR(255);
          ALTER TABLE obras ADD COLUMN IF NOT EXISTS "dataFimContrato" VARCHAR(255);
          ALTER TABLE obras ADD COLUMN IF NOT EXISTS "custoAdm" DOUBLE PRECISION;

          CREATE TABLE IF NOT EXISTS configuracoes_sistema (
            chave VARCHAR(255) PRIMARY KEY,
            valor VARCHAR(255) NOT NULL
          );

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
        } catch (dbErr: any) {
          console.error("[RDS SELECT ERROR] Erro consultando dashboard no pg:");
          console.error(dbErr);
          throw dbErr;
        }
      } else {
        throw new Error("Conexão inicial com Postgres está inativa. Verifique o AWS RDS.");
      }

      if (!dbConnected) {
        throw new Error("Conexão inicial com Postgres está inativa. Verifique o AWS RDS.");
      }

      const allCalculated = freshObras.map(formatObraWithMetrics);
      const obrasConsolidadas = freshObras.filter((o) => o.statusContrato === "CONSOLIDADO");
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
          .filter((i: any) => i.status === "ATIVO" && i.descricao === "Custo ADM")
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
                .filter((i: any) => i.status === "ATIVO" && i.descricao === "Custo ADM")
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
                .filter((i: any) => i.status === "ATIVO" && i.descricao === "Custo ADM")
                .reduce((sum: number, item: any) => sum + Number(item.valor), 0)
            : 0,
          itens: o.itens || [],
        })),
      });
    } catch (error: any) {
      console.error("[GET /api/dashboard] FAILED:", error);
      res.status(500).json({ error: error.message || "Erro ao buscar métricas do Dashboard", details: error.detail, stack: error.stack, table: error.table, hint: error.hint });
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
        } catch (dbErr: any) {
          console.error("[RDS SELECT ERROR] Erro lendo obras no pg:");
          console.error(dbErr);
          throw dbErr;
        }
      } else {
        throw new Error("Conexão inicial com Postgres está inativa. Verifique o AWS RDS.");
      }

      if (!dbConnected) {
        throw new Error("Conexão inicial com Postgres está inativa. Verifique o AWS RDS.");
      }

      const obrasCalculadas = freshObras.map(formatObraWithMetrics);
      res.json(obrasCalculadas);
    } catch (error: any) {
      console.error("[GET /api/obras] FAILED:", error);
      res.status(500).json({ error: error.message || "Erro ao buscar lista de projetos", details: error.detail, stack: error.stack, table: error.table, hint: error.hint });
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
        } catch (dbErr: any) {
          console.error(`[RDS SELECT ERROR] Erro buscando obra ${id} no pg:`);
          console.error(dbErr);
          throw dbErr;
        }
      } else {
        throw new Error("Conexão inicial com Postgres está inativa. Verifique o AWS RDS.");
      }

      if (!dbConnected) {
        throw new Error("Conexão inicial com Postgres está inativa. Verifique o AWS RDS.");
      }

      if (!dbObra) {
        return res.status(404).json({ error: "Projeto não encontrado" });
      }

      res.json(formatObraWithMetrics(dbObra));
    } catch (error: any) {
      console.error(`[GET /api/obras/${req.params.id}] FAILED:`, error);
      res.status(500).json({ error: error.message || "Erro ao buscar detalhes do projeto", details: error.detail, stack: error.stack, table: error.table, hint: error.hint });
    }
  });

  // GET Custo ADM Global
  
// --- Documentos Endpoints ---
app.post("/api/documentos/upload", upload.single("file"), async (req, res) => {
  console.log("[UPLOAD START]");

  if (!s3Client || !process.env.AWS_REGION || !process.env.AWS_S3_BUCKET || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error("[UPLOAD ERROR] AWS S3 não configurado corretamente.");
    return res.status(503).json({ error: "S3 não configurado corretamente" });
  }

  try {
    const { obra_id, categoria, observacao } = req.body;
    const file = req.file;

    if (!file || !obra_id || !categoria) {
      return res.status(400).json({ error: "Dados incompletos" });
    }

    console.log("[S3 UPLOAD START]");
    const s3KeyGenerated = `obras/${obra_id}/${categoria.toLowerCase()}/${Date.now()}_${file.originalname}`;
    
    await s3Client.send(new PutObjectCommand({ 
      Bucket: BUCKET_NAME, 
      Key: s3KeyGenerated, 
      Body: file.buffer, 
      ContentType: file.mimetype 
    }));
    
    const s3_key = s3KeyGenerated;
    const s3_url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3KeyGenerated}`;
    
    console.log(`[S3 UPLOAD SUCCESS] Key: ${s3_key}`);

    const docId = `doc-${generateId()}`;
    
    console.log("[DB INSERT START]");
    await pool.query(`
      INSERT INTO documentos (id, obra_id, nome_arquivo, nome_original, extensao, mime_type, tamanho_bytes, categoria, s3_key, s3_url, observacao)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [docId, obra_id, file.originalname, file.originalname, path.extname(file.originalname), file.mimetype, file.size, categoria, s3_key, s3_url, observacao]);

    console.log("[UPLOAD SUCCESS]");
    res.status(201).json({ id: docId, url: s3_url, message: "Arquivo carregado no S3 com sucesso" });
  } catch (err) {
    console.error("[UPLOAD ERROR]:", err);
    res.status(500).json({ error: "Falha na operação de upload S3" });
  }
});

app.get("/api/documentos/:obra_id", async (req, res) => {
  try {
    const docs = await pool.query('SELECT * FROM documentos WHERE obra_id = $1 AND deleted_at IS NULL', [req.params.obra_id]);
    res.json(docs.rows);
  } catch (err) { res.status(500).json({ error: "Falha busca" }); }
});

app.get("/api/documentos/:id/download", async (req, res) => {
  if (!s3Client) return res.status(503).json({ error: "Serviço S3 não configurado" });
  try {
    const doc = await pool.query('SELECT s3_key FROM documentos WHERE id = $1', [req.params.id]);
    if (doc.rows.length === 0) return res.status(404).end();
    const url = await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: BUCKET_NAME, Key: doc.rows[0].s3_key }), { expiresIn: 3600 });
    res.json({ url });
  } catch (err) { res.status(500).json({ error: "Falha url" }); }
});

app.delete("/api/documentos/:id", async (req, res) => {
  if (!s3Client) return res.status(503).json({ error: "Serviço S3 não configurado" });
  try {
    const doc = await pool.query('SELECT s3_key FROM documentos WHERE id = $1', [req.params.id]);
    if (doc.rows.length === 0) return res.status(404).end();
    await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: doc.rows[0].s3_key }));
    await pool.query('DELETE FROM documentos WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: "Falha exclusão" }); }
});

app.get("/api/configuracoes/custo-adm-global", async (req, res) => {
    try {
      let globalValue = 5.0; // fallback standard default
      if (dbConnected && pool) {
        const configRes = await pool.query("SELECT valor FROM configuracoes_sistema WHERE chave = 'custo_adm_global' LIMIT 1");
        if (configRes.rows.length > 0) {
          globalValue = Number(configRes.rows[0].valor) || 5.0;
        }
      }
      res.json({ valor: globalValue });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST Atualizar Custo ADM Global e recalcular obras (filtrado por statusContrato se houver)
  app.post("/api/configuracoes/custo-adm-global", async (req, res) => {
    const { valor, statusContrato } = req.body;
    const newGlobal = Number(valor);
    if (isNaN(newGlobal) || newGlobal < 0) {
      return res.status(400).json({ error: "Valor de custo global inválido" });
    }

    try {
      if (dbConnected && pool) {
        const oldConfigRes = await pool.query("SELECT valor FROM configuracoes_sistema WHERE chave = 'custo_adm_global' LIMIT 1");
        const oldVal = oldConfigRes.rows.length > 0 ? oldConfigRes.rows[0].valor : "5.0";

        await pool.query(`
          INSERT INTO configuracoes_sistema (chave, valor)
          VALUES ('custo_adm_global', $1)
          ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor
        `, [String(newGlobal)]);

        console.log(`[ADM GLOBAL]`);
        console.log(`Valor anterior: ${oldVal}%`);
        console.log(`Novo valor: ${newGlobal}%`);

        await pool.query('BEGIN');
        try {
          const countObrasRes = await pool.query('SELECT COUNT(*) as count FROM obras');
          const countObras = countObrasRes.rows[0].count;

          const obrasRes = await pool.query('UPDATE obras SET "custoAdm" = $1', [newGlobal]);
          const itensRes = await pool.query(`
            UPDATE itens_orcamento
            SET valor = obras."valorContrato" * ($1 / 100.0)
            FROM obras
            WHERE itens_orcamento."obraId" = obras.id
              AND itens_orcamento.descricao = 'Custo ADM'
          `, [newGlobal]);

          await pool.query('COMMIT');
          
          console.log(`Quantidade de obras encontradas: ${countObras}`);
          console.log(`Quantidade de obras atualizadas: ${obrasRes.rowCount}`);
          console.log(`Quantidade de itens atualizados: ${itensRes.rowCount}`);

          res.status(200).json({ success: true, message: "Custo ADM global e registros atualizados" });
        } catch (updateError) {
          await pool.query('ROLLBACK');
          throw updateError;
        }
      } else {
        res.status(400).json({ error: "Banco de dados offline" });
      }
    } catch (error: any) {
      console.error("[CUSTO ADM GLOBAL UPDATE ERROR]:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST Atualizar Custo ADM Individual
  app.post(["/api/obras/:id/custo-adm", "/api/projetos/:id/custo-adm"], async (req, res) => {
    const { id } = req.params;
    const { custoAdm } = req.body; // percentage input, e.g. 12 or null to use global

    try {
      if (dbConnected && pool) {
        const obraRes = await pool.query('SELECT * FROM obras WHERE id = $1 LIMIT 1', [id]);
        if (obraRes.rows.length === 0) {
          return res.status(404).json({ error: "Projeto não encontrado" });
        }
        const obra = obraRes.rows[0];

        const valToSave = custoAdm === null || custoAdm === undefined || String(custoAdm).trim() === "" ? null : Number(custoAdm);
        
        await pool.query('UPDATE obras SET "custoAdm" = $1, "updatedAt" = NOW() WHERE id = $2', [valToSave, id]);

        await ensureAndRecalculateFixedItems(id, obra.valorContrato);

        const updatedObraRes = await pool.query('SELECT * FROM obras WHERE id = $1 LIMIT 1', [id]);
        const updatedItemRes = await pool.query(`
          SELECT i.*, 
                 c.nome as "cat_nome", c."grupoCalculo" as "cat_grupoCalculo"
          FROM itens_orcamento i
          LEFT JOIN categorias c ON i."categoriaId" = c.id
          WHERE i."obraId" = $1
          ORDER BY i.ordem ASC
        `, [id]);

        const items = updatedItemRes.rows.map(row => ({
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

        const fullObra = {
          ...updatedObraRes.rows[0],
          valorContrato: Number(updatedObraRes.rows[0].valorContrato),
          documentos: typeof updatedObraRes.rows[0].documentos === 'string' ? JSON.parse(updatedObraRes.rows[0].documentos) : (updatedObraRes.rows[0].documentos || []),
          itens: items
        };

        const calculated = formatObraWithMetrics(fullObra);
        res.json(calculated);
      } else {
        res.status(400).json({ error: "Banco offline" });
      }
    } catch (error: any) {
      console.error("[CUSTO ADM INDIVIDUAL UPDATE ERROR]:", error);
      res.status(500).json({ error: error.message });
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
          await seedCategories(pool);
          
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
    const { permanent } = req.query;
    try {
      let isRemoved = false;
      let msg = "";

      if (dbConnected && pool) {
        try {
          const existingRes = await pool.query('SELECT * FROM obras WHERE id = $1 LIMIT 1', [id]);
          if (existingRes.rows.length > 0) {
            const row = existingRes.rows[0];
            const originalStatus = row.statusContrato;
            const levId = row.levantamentoId;

            if (permanent === "true") {
              // Reset linked levantamentos if permanent deletion
              if (levId) {
                await pool.query('UPDATE levantamentos SET "contratoAFecharId" = NULL, "statusEnvio" = \'Pendente\' WHERE id = $1', [levId]);
              }
              await pool.query('DELETE FROM itens_orcamento WHERE "obraId" = $1', [id]);
              await pool.query('DELETE FROM obras WHERE id = $1', [id]);
              isRemoved = true;
              msg = "Projeto excluído permanentemente";
            } else {
              // Soft delete
              const nextStatus = originalStatus === "A_FECHAR" ? "EXCLUIDO_ORCAMENTO" : "EXCLUIDO_CONTRATO";
              await pool.query('UPDATE obras SET "statusContrato" = $1 WHERE id = $2', [nextStatus, id]);
              
              // Reset linked levantamentos on soft deletion too so they can be re-sent if needed
              if (levId) {
                await pool.query('UPDATE levantamentos SET "contratoAFecharId" = NULL, "statusEnvio" = \'Pendente\' WHERE id = $1', [levId]);
              }

              isRemoved = true;
              msg = "Projeto enviado para a Lixeira";
            }
          }
        } catch (dbErr: any) {
          console.error("[RDS DELETE ERROR] Erro bruto do driver no pg:");
          console.error(dbErr);
          throw dbErr;
        }
      } else {
        throw new Error("Conexão com AWS RDS não está activa.");
      }

      if (!isRemoved) {
        return res.status(404).json({ error: "Projeto não encontrado ou falha ao excluir" });
      }

      res.json({ success: true, message: msg });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao remover projeto", details: error.detail, stack: error.stack, table: error.table, hint: error.hint });
    }
  });

  // POST Restaurar Obra
  app.post(["/api/obras/:id/restaurar", "/api/projetos/:id/restaurar"], async (req, res) => {
    const { id } = req.params;
    try {
      if (dbConnected && pool) {
        const checkRes = await pool.query('SELECT * FROM obras WHERE id = $1', [id]);
        if (checkRes.rows.length === 0) {
          return res.status(404).json({ error: "Projeto não encontrado." });
        }
        const row = checkRes.rows[0];
        let nextStatus = "CONSOLIDADO";
        if (row.statusContrato === "EXCLUIDO_ORCAMENTO") {
          nextStatus = "A_FECHAR";
        }
        
        // Relink levantamento if applicable
        if (row.levantamentoId) {
          await pool.query(`
            UPDATE levantamentos 
            SET "contratoAFecharId" = $1, "statusEnvio" = 'Enviado' 
            WHERE id = $2
          `, [id, row.levantamentoId]);
        }

        await pool.query('UPDATE obras SET "statusContrato" = $1 WHERE id = $2', [nextStatus, id]);
        res.json({ success: true, message: "Projeto restaurado com sucesso." });
      } else {
        res.status(500).json({ error: "Conexão com AWS RDS inativa." });
      }
    } catch (error: any) {
      console.error("Erro ao restaurar obra:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- NOVO MÓDULO: LEVANTAMENTOS / ORÇAMENTOS ---

  // GET Levantamentos (all, joined with materials map)
  app.get("/api/levantamentos", async (req, res) => { // get levantamentos route
    try {
      if (dbConnected && pool) {
        const query = `
          SELECT l.*
          FROM levantamentos l
          ORDER BY l."dataSolicitacao" DESC, l."createdAt" DESC
        `;
        const result = await pool.query(query);

         const list = result.rows.map(row => {
           let subList: any[] = [];
           if (row.subestruturas) {
             try {
               subList = typeof row.subestruturas === "string" ? JSON.parse(row.subestruturas) : row.subestruturas;
             } catch (e) {
               subList = [];
             }
           }
           if (!subList || subList.length === 0) {
             if (row.materialId && row.qtdM2) {
               subList = [{
                 materialId: row.materialId,
                 qtdM2: Number(row.qtdM2),
                 valorUnitario: 0.0
               }];
             }
           }

           const enrichedHD = subList.map((item: any) => {
             return {
               material: item.material || "Produto HD",
               qtdHD: Number(item.qtdHD !== undefined ? item.qtdHD : (item.qtdM2 || 0)),
               valorUnitario: Number(item.valorUnitario || 0)
             };
           });

           let subListPC: any[] = [];
           if (row.subestruturas_pc) {
             try {
               subListPC = typeof row.subestruturas_pc === "string" ? JSON.parse(row.subestruturas_pc) : row.subestruturas_pc;
             } catch (e) {
               subListPC = [];
             }
           }
           const enrichedPC = subListPC.map((item: any) => {
             return {
               material: item.material || "Produto PC",
               qtdPC: Number(item.qtdPC !== undefined ? item.qtdPC : 0),
               valorUnitario: Number(item.valorUnitario || 0)
             };
           });

           return {
             id: row.id,
             ref: row.ref,
             obra: row.obra,
             cliente: row.cliente || "",
             dataSolicitacao: row.dataSolicitacao,
             abc: row.abc,
             solicitante: row.solicitante || "",
             responsavel: row.responsavel,
             status: (row.status === "CONCLUIDO" || row.status === "Concluido") ? "Concluído" :
                     (row.status === "EM_ANDAMENTO" || row.status === "Desenvolvendo") ? "Em Desenvolvimento" :
                     (row.status === "PENDENTE" || row.status === "Pendente") ? "Pendente" :
                     (row.status === "FINALIZADO" || row.status === "Finalizado") ? "Finalizado" : (row.status || "Pendente"),
             previsao: row.previsao || "",
             materialId: row.materialId,
             qtdM2: Number(row.qtdM2),
             statusEnvio: (row.statusEnvio === "Enviado") ? "Enviado" : "Proposta a Enviar",
             contratoAFecharId: row.contratoAFecharId,
             createdAt: row.createdAt,
             updatedAt: row.updatedAt,
             subestruturas: enrichedHD,
             subestruturas_pc: [],
             origemLeads: row.origemLeads || "Projeto Certo"
           };
         });
         res.json(list);
      } else {
        res.status(500).json({ error: "Conexão com AWS RDS inativa." });
      }
    } catch (error: any) {
      console.error("Erro no GET /api/levantamentos:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST Criar Levantamento
  app.post("/api/levantamentos", async (req, res) => {
    const { obra, cliente, dataSolicitacao, abc, solicitante, responsavel, status, previsao, subestruturas, subestruturas_pc, statusEnvio, origemLeads } = req.body;
    if (!obra || !dataSolicitacao || !responsavel || !status || !statusEnvio) {
      return res.status(400).json({ error: "Faltam campos obrigatórios." });
    }
    try {
      if (dbConnected && pool) {
        const id = "lv-" + generateId().substring(0, 8);
        
        // Helper to parse month and year from dataSolicitacao
        const parseMonthYear = (dateStr: string) => {
          if (!dateStr || typeof dateStr !== "string") {
            const d = new Date();
            return { month: d.getMonth() + 1, year: d.getFullYear() };
          }
          const clean = dateStr.trim();
          if (clean.includes("/")) {
            const parts = clean.split("/");
            if (parts.length === 3) {
              const m = parseInt(parts[1], 10);
              const y = parseInt(parts[2], 10);
              if (!isNaN(m) && !isNaN(y)) {
                return { month: m, year: y };
              }
            }
          }
          if (clean.includes("-")) {
            const parts = clean.split("-");
            if (parts.length === 3) {
              if (parts[0].length === 4) {
                const m = parseInt(parts[1], 10);
                const y = parseInt(parts[0], 10);
                if (!isNaN(m) && !isNaN(y)) {
                  return { month: m, year: y };
                }
              } else if (parts[2].length === 4) {
                const m = parseInt(parts[1], 10);
                const y = parseInt(parts[2], 10);
                if (!isNaN(m) && !isNaN(y)) {
                  return { month: m, year: y };
                }
              }
            }
          }
          const parsedDate = new Date(clean);
          if (!isNaN(parsedDate.getTime())) {
            return { month: parsedDate.getMonth() + 1, year: parsedDate.getFullYear() };
          }
          const d = new Date();
          return { month: d.getMonth() + 1, year: d.getFullYear() };
        };

        const { month: targetMonth, year: targetYear } = parseMonthYear(dataSolicitacao);

        const allRefsRes = await pool.query("SELECT ref, \"dataSolicitacao\" FROM levantamentos WHERE ref LIKE 'LV%'");
        let nextNum = 1;
        const matchingNums: number[] = [];

        for (const row of allRefsRes.rows) {
          const rowDateStr = row.dataSolicitacao;
          const { month: rowMonth, year: rowYear } = parseMonthYear(rowDateStr);
          if (rowMonth === targetMonth && rowYear === targetYear) {
            const refStr = row.ref || "";
            const numPart = refStr.replace(/^LV/i, "");
            const parsed = parseInt(numPart, 10);
            if (!isNaN(parsed)) {
              matchingNums.push(parsed);
            }
          }
        }

        if (matchingNums.length > 0) {
          nextNum = Math.max(...matchingNums) + 1;
        }

        const ref = `LV${String(nextNum).padStart(2, '0')}`;

        const subListHD = Array.isArray(subestruturas) ? subestruturas : [];
        const subStrHD = JSON.stringify(subListHD);

        await pool.query(`
          INSERT INTO levantamentos (
            id, ref, obra, cliente, "dataSolicitacao", abc, solicitante, responsavel, status, previsao, "statusEnvio", subestruturas, subestruturas_pc, "origemLeads"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
          id,
          ref,
          obra,
          cliente || "",
          convertDateToBR(dataSolicitacao),
          abc || "",
          solicitante || "",
          responsavel,
          status,
          previsao ? convertDateToBR(previsao) : "",
          statusEnvio,
          subStrHD,
          '[]',
          origemLeads || "Projeto Certo"
        ]);

        const query = `
          SELECT l.*
          FROM levantamentos l
          WHERE l.id = $1
        `;
        const createdRes = await pool.query(query, [id]);
        const row = createdRes.rows[0];
        res.json({
          ...row,
          status: (row.status === "CONCLUIDO" || row.status === "Concluido") ? "Concluído" :
                  (row.status === "EM_ANDAMENTO" || row.status === "Desenvolvendo") ? "Em Desenvolvimento" :
                  (row.status === "PENDENTE" || row.status === "Pendente") ? "Pendente" :
                  (row.status === "FINALIZADO" || row.status === "Finalizado") ? "Finalizado" : (row.status || "Pendente"),
          statusEnvio: (row.statusEnvio === "Enviado") ? "Enviado" : "Proposta a Enviar",
          subestruturas: subListHD,
          subestruturas_pc: [],
          origemLeads: row.origemLeads || "Projeto Certo"
        });
      } else {
        res.status(500).json({ error: "Conexão com AWS RDS inativa." });
      }
    } catch (error: any) {
      console.error("Erro no POST /api/levantamentos:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // PUT Atualizar Levantamento
  app.put("/api/levantamentos/:id", async (req, res) => {
    const { id } = req.params;
    const { obra, cliente, dataSolicitacao, abc, solicitante, responsavel, status, previsao, subestruturas, subestruturas_pc, statusEnvio, origemLeads } = req.body;
    try {
      if (dbConnected && pool) {
        const checkRes = await pool.query('SELECT * FROM levantamentos WHERE id = $1', [id]);
        if (checkRes.rows.length === 0) {
          return res.status(404).json({ error: "Levantamento não encontrado." });
        }

        const subListHD = Array.isArray(subestruturas) ? subestruturas : [];
        const subStrHD = JSON.stringify(subListHD);

        await pool.query(`
          UPDATE levantamentos SET
            obra = COALESCE($1, obra),
            cliente = $2,
            "dataSolicitacao" = COALESCE($3, "dataSolicitacao"),
            abc = COALESCE($4, abc),
            solicitante = $5,
            responsavel = COALESCE($6, responsavel),
            status = COALESCE($7, status),
            previsao = COALESCE($8, previsao),
            "statusEnvio" = COALESCE($9, "statusEnvio"),
            subestruturas = $10,
            subestruturas_pc = $11,
            "origemLeads" = COALESCE($12, "origemLeads"),
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE id = $13
        `, [
          obra || null,
          cliente || "",
          dataSolicitacao ? convertDateToBR(dataSolicitacao) : null,
          abc === undefined ? null : abc,
          solicitante || "",
          responsavel || null,
          status || null,
          previsao ? convertDateToBR(previsao) : null,
          statusEnvio || null,
          subStrHD,
          '[]',
          origemLeads || null,
          id
         ]);

         const query = `
           SELECT l.*
           FROM levantamentos l
           WHERE l.id = $1
         `;
         const updatedRes = await pool.query(query, [id]);
         const row = updatedRes.rows[0];
         res.json({
           ...row,
           status: (row.status === "CONCLUIDO" || row.status === "Concluido") ? "Concluído" :
                   (row.status === "EM_ANDAMENTO" || row.status === "Desenvolvendo") ? "Em Desenvolvimento" :
                   (row.status === "PENDENTE" || row.status === "Pendente") ? "Pendente" :
                   (row.status === "FINALIZADO" || row.status === "Finalizado") ? "Finalizado" : (row.status || "Pendente"),
           statusEnvio: (row.statusEnvio === "Enviado") ? "Enviado" : "Proposta a Enviar",
           subestruturas: subListHD,
           subestruturas_pc: [],
           origemLeads: row.origemLeads || "Projeto Certo"
         });
      } else {
        res.status(500).json({ error: "Conexão com AWS RDS inativa." });
      }
    } catch (error: any) {
      console.error("Erro no PUT /api/levantamentos/:id:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // PATCH Atualizar apenas o status de envio de um levantamento
  app.patch("/api/levantamentos/:id/status-envio", async (req, res) => {
    const { id } = req.params;
    const { statusEnvio } = req.body;
    try {
      if (dbConnected && pool) {
        await pool.query('UPDATE levantamentos SET "statusEnvio" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2', [statusEnvio, id]);
        res.json({ success: true, statusEnvio });
      } else {
        res.status(500).json({ error: "Conexão com AWS RDS inativa." });
      }
    } catch (error: any) {
      console.error("Erro no PATCH /api/levantamentos/:id/status-envio:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE Excluir Levantamento
  app.delete("/api/levantamentos/:id", async (req, res) => {
    const { id } = req.params;
    const { permanent } = req.query;
    try {
      if (dbConnected && pool) {
        if (permanent === "true") {
          await pool.query('UPDATE obras SET "levantamentoId" = NULL WHERE "levantamentoId" = $1', [id]);
          await pool.query('DELETE FROM levantamentos WHERE id = $1', [id]);
          res.json({ success: true, message: "Levantamento excluído permanentemente." });
        } else {
          await pool.query('UPDATE levantamentos SET status = \'EXCLUIDO\' WHERE id = $1', [id]);
          res.json({ success: true, message: "Levantamento enviado para a Lixeira." });
        }
      } else {
        res.status(500).json({ error: "Conexão com AWS RDS inativa." });
      }
    } catch (error: any) {
      console.error("Erro no DELETE /api/levantamentos/:id:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST Restaurar Levantamento
  app.post("/api/levantamentos/:id/restaurar", async (req, res) => {
    const { id } = req.params;
    try {
      if (dbConnected && pool) {
        const checkRes = await pool.query('SELECT * FROM levantamentos WHERE id = $1', [id]);
        if (checkRes.rows.length === 0) {
          return res.status(404).json({ error: "Levantamento não encontrado." });
        }
        const row = checkRes.rows[0];
        // If it was linked to a contract, restored status is Concluído, otherwise Pendente
        const nextStatus = row.contratoAFecharId ? "Concluído" : "Pendente";
        await pool.query('UPDATE levantamentos SET status = $1 WHERE id = $2', [nextStatus, id]);
        res.json({ success: true, message: "Levantamento restaurado com sucesso." });
      } else {
        res.status(500).json({ error: "Conexão com AWS RDS inativa." });
      }
    } catch (error: any) {
      console.error("Erro no POST /api/levantamentos/:id/restaurar:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST Enviar Levantamento para Orçamentos a Fechar
  app.post("/api/levantamentos/:id/enviar-contrato", async (req, res) => {
    const { id } = req.params;
    try {
      if (dbConnected && pool) {
        const query = `
          SELECT l.*
          FROM levantamentos l
          WHERE l.id = $1
        `;
        const levRes = await pool.query(query, [id]);
        if (levRes.rows.length === 0) {
          return res.status(404).json({ error: "Levantamento não encontrado." });
        }
        const lev = levRes.rows[0];

        if (lev.contratoAFecharId) {
          return res.status(400).json({ error: "Este levantamento já foi enviado para Orçamentos a Fechar." });
        }

        // Parse subestruturas HD
        let subListHD: any[] = [];
        if (lev.subestruturas) {
          try {
            subListHD = typeof lev.subestruturas === 'string' ? JSON.parse(lev.subestruturas) : lev.subestruturas;
          } catch (e) {
            subListHD = [];
          }
        }
        if (!subListHD || subListHD.length === 0) {
          return res.status(400).json({ error: "Faltando item em Material HD" });
        }

        // Calculate total value
        let totalValor = 0;
        const processedItems = subListHD.map((item: any) => {
          const q = item.qtdHD !== undefined ? item.qtdHD : (item.qtdM2 || 0);
          const itemVal = (Number(q) || 0) * (Number(item.valorUnitario) || 0);
          totalValor += itemVal;
          return {
            material: item.material || "Produto HD",
            qtdHD: Number(q) || 0,
            valorUnitario: Number(item.valorUnitario) || 0,
            itemVal
          };
        });

        const obraId = "p-" + generateId().substring(0, 10);
        
        // Build observation list
        const obs = `Enviado a partir do Levantamento ${lev.ref}.`;

        // Start transaction
        await pool.query('BEGIN');
        try {
          // Insert new Obra as A_FECHAR (Orçamentos a fechar)
          await pool.query(`
            INSERT INTO obras (
              id, nome, cliente, observacoes, "valorContrato", "statusContrato", "levantamentoId", "prazo"
            ) VALUES ($1, $2, $3, $4, $5, 'A_FECHAR', $6, $7)
          `, [obraId, lev.obra, lev.cliente || "", obs, totalValor, lev.id, lev.previsao || 'Não definido']);

          // Find or create SUBESTRUTURA category
          let catId = "cat-subestrutura";
          const catRes = await pool.query('SELECT id FROM categorias WHERE LOWER(nome) = LOWER($1) LIMIT 1', ["SUBESTRUTURA"]);
          if (catRes.rows.length > 0) {
            catId = catRes.rows[0].id;
          } else {
            await pool.query('INSERT INTO categorias (id, nome, "grupoCalculo") VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [catId, "SUBESTRUTURA", "MATERIAL"]);
          }

          // Insert ONE itens_orcamento for all subestrutura
          const itemId = "item-" + generateId().substring(0, 10);
          const itemDescStr = `MATERIAL SUB ESTRUTURA`;
          const itemObsStr = `Enviado a partir do Levantamento ${lev.ref}.`;
          
          // Map processedItems to subitems format
          const subitens = processedItems.map(item => ({
            id: generateId(),
            descricao: item.material,
            qtd: parseFloat(item.qtdHD as any) || 0,
            valor: parseFloat(item.valorUnitario as any) || 0
          }));
          
          await pool.query(`
            INSERT INTO itens_orcamento (
              id, descricao, valor, status, observacao, ordem, subitens, "obraId", "categoriaId"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            itemId,
            itemDescStr,
            totalValor,
            'ATIVO',
            itemObsStr,
            1,
            JSON.stringify(subitens),
            obraId,
            catId
          ]);

          await pool.query(`
            UPDATE levantamentos SET "contratoAFecharId" = $1, "statusEnvio" = 'Enviado', "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2
          `, [obraId, id]);

          await pool.query('COMMIT');
        } catch (err) {
          await pool.query('ROLLBACK');
          console.error("Error in transaction:", err);
          throw err;
        }

        res.json({
          success: true,
          message: "Levantamento enviado com sucesso para Orçamentos a Fechar!",
          contratoAFecharId: obraId
        });
      } else {
        res.status(500).json({ error: "Conexão com AWS RDS inativa." });
      }
    } catch (error: any) {
      console.error("Erro ao enviar levantamento para orçamento:", error);
      res.status(500).json({ error: error.message });
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
        } catch (dbErr: any) {
          console.error("[RDS SELECT ERROR] Erro listando categorias no pg:");
          console.error(dbErr);
          throw dbErr;
        }
      } else {
        throw new Error("Conexão com AWS RDS inativa.");
      }

      if (!dbConnected) {
        throw new Error("Conexão com banco de dados indisponível");
      }

      res.json(sorted);
    } catch (error: any) {
      console.error("[GET /api/categorias] FAILED:", error);
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
              updatedValor = updatedSubArray.reduce((acc, sub) => acc + ((Number(sub.qtd !== undefined ? sub.qtd : 1) * Number(sub.valor)) || 0), 0);
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

            // Sync customized Custo ADM items to the parent project's individual 'custoAdm' column
            if (updatedDesc === "Custo ADM") {
              let pctVal: number | null = null;
              if (updatedObs && updatedObs.includes("%")) {
                pctVal = parseFloat(updatedObs.replace(/[^0-9.]/g, ""));
              } else if (updatedObs === "Valor Fixo") {
                const parentObraRes = await pool.query('SELECT "valorContrato" FROM obras WHERE id = $1 LIMIT 1', [existing.obraId]);
                if (parentObraRes.rows.length > 0) {
                  const vc = Number(parentObraRes.rows[0].valorContrato) || 0;
                  if (vc > 0) {
                    pctVal = Math.round((updatedValor / vc) * 100 * 1000) / 1000;
                  }
                }
              }

              if (pctVal !== null && !isNaN(pctVal)) {
                await pool.query('UPDATE obras SET "custoAdm" = $1, "updatedAt" = NOW() WHERE id = $2', [pctVal, existing.obraId]);
                const parentObraRes = await pool.query('SELECT "valorContrato" FROM obras WHERE id = $1 LIMIT 1', [existing.obraId]);
                if (parentObraRes.rows.length > 0) {
                  const vc = Number(parentObraRes.rows[0].valorContrato) || 0;
                  await ensureAndRecalculateFixedItems(existing.obraId, vc);
                }
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
    console.log(`Server running on port ${PORT} at 0.0.0.0`);
    console.log(`[S3 STATUS] ${s3Client ? "ATIVADO" : "DESATIVADO"}`);
    // Boot: trace the database state or use local fallback seamlessly
    checkDbConnection().then((connected) => {
      console.log(`[BOOT] Conexão inicial com banco de dados finalizada: ${connected ? "Supabase PostgreSQL ATIVO" : "Modo em Memória fall-back ATIVO"}`);
    });
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start gateway server:", err);
});
