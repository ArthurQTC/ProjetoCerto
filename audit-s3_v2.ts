import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";

async function audit() {
  const vars = {
    AWS_REGION: process.env.AWS_REGION,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID
  };

  console.log("--- Validação de Variáveis de Ambiente ---");
  console.log(`Região configurada: ${vars.AWS_REGION || "NÃO CONFIGURADO"}`);
  console.log(`Bucket configurado: ${vars.AWS_S3_BUCKET || "NÃO CONFIGURADO"}`);
  console.log(`Access Key (masked): ${vars.AWS_ACCESS_KEY_ID ? "****" + vars.AWS_ACCESS_KEY_ID.slice(-4) : "NÃO CONFIGURADO"}`);

  if (!vars.AWS_REGION || !vars.AWS_S3_BUCKET || !vars.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error("\nERRO: Variáveis de ambiente faltando.");
    process.exit(1);
  }

  const s3Client = new S3Client({
    region: vars.AWS_REGION,
    credentials: {
      accessKeyId: vars.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  console.log("\n--- Validação de Conexão S3 ---");
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: vars.AWS_S3_BUCKET }));
    console.log("RESULTADO: Conexão bem-sucedida! Bucket acessível.");
  } catch (err: any) {
    console.error("RESULTADO: FALHA NA CONEXÃO.");
    console.error(`Erro: ${err.name} - ${err.message}`);
    process.exit(1);
  }
}
audit();
