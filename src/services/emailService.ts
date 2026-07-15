import { Resend } from 'resend';

export async function sendEmail({
  contratoNome,
  detalhes
}: {
  contratoNome: string;
  detalhes: string;
}) {
  console.log("[EmailService] RESEND_API_KEY:", !!process.env.RESEND_API_KEY);
  console.log("[EmailService] SMTP_FROM:", process.env.SMTP_FROM);
  console.log("[EmailService] EMAIL_TO_LIST:", process.env.EMAIL_TO_LIST);

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY não configurada.");
  }

  console.log("[EmailService] Criando cliente Resend...");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const from = process.env.SMTP_FROM;
  if (!from) {
    throw new Error("SMTP_FROM não configurado.");
  }

  const toListRaw = process.env.EMAIL_TO_LIST;
  if (!toListRaw) {
    throw new Error("EMAIL_TO_LIST não configurado.");
  }
  
  const recipients = toListRaw.split(',').map(e => e.trim());

  console.log(`[EmailService] Iniciando envio para: ${recipients.join(', ')}`);
  console.log(`[EmailService] Contrato: ${contratoNome}`);

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #333;">Notificação do Sistema</h2>
      <p>Olá equipe,</p>
      <p>O contrato <strong>${contratoNome}</strong> foi enviado para sua análise.</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <tr style="background-color: #f2f2f2;">
          <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Campo</th>
          <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Valor</th>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">Contrato</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${contratoNome}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">Detalhes</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${detalhes}</td>
        </tr>
      </table>
      <p style="margin-top: 30px; font-size: 12px; color: #777;">Este e-mail foi enviado automaticamente pelo sistema.</p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: from,
      to: recipients,
      subject: `Notificação de Contrato: ${contratoNome}`,
      html: htmlContent,
    });

    if (error) {
      console.error("[EmailService] Erro:", error);
      throw error;
    }

    console.log("[EmailService] Email enviado com sucesso.");
    return data;
  } catch (error) {
    console.error("[EmailService] Erro:", error);
    throw error;
  }
}
