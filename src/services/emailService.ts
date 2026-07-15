import { Resend } from 'resend';

export async function sendEmail({
  contratoNome,
  nomeCliente,
  detalhes,
  pdfBase64,
  valorContrato,
  materiais
}: {
  contratoNome: string;
  nomeCliente?: string;
  detalhes: string;
  pdfBase64?: string;
  valorContrato?: number;
  materiais?: string;
}) {
  console.log("[EmailService] RESEND_API_KEY:", !!process.env.RESEND_API_KEY);
  console.log("[EmailService] SMTP_FROM:", process.env.SMTP_FROM);
  console.log("[EmailService] EMAIL_TO_LIST:", process.env.EMAIL_TO_LIST);

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY não configurada.");
  }

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

  console.log(`[EmailService] Enviando para: ${recipients.join(', ')}`);

  const subject = `Contrato Fechado ${nomeCliente || 'Cliente'} - ${contratoNome}`;

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; color: #333; line-height: 1.6;">
      <h2 style="color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px;">Novo Contrato Fechado</h2>
      <p>Olá equipe,</p>
      <p>Segue os dados do novo contrato fechado para seguirmos com o processo:</p>
      
      <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Nome do Cliente:</strong> ${nomeCliente || 'Não informado'}</p>
        <p style="margin: 5px 0;"><strong>Nome da Obra:</strong> ${contratoNome}</p>
        <p style="margin: 5px 0;"><strong>Valor do Contrato:</strong> ${valorContrato ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorContrato) : 'Não informado'}</p>
        <p style="margin: 15px 0 5px 0;"><strong>Materiais:</strong></p>
        <div style="background-color: #fff; border: 1px solid #edf2f7; padding: 10px; border-radius: 4px; white-space: pre-wrap;">${materiais || 'Não informado'}</div>
      </div>

      <p>O contrato em PDF está em anexo a este e-mail.</p>
      <p style="margin-top: 30px; font-size: 12px; color: #718096;">Este e-mail foi gerado automaticamente pelo sistema de Gestão de Obras.</p>
    </div>
  `;

  try {
    const emailOptions: any = {
      from: from,
      to: recipients,
      subject: subject,
      html: htmlContent,
    };

    if (pdfBase64) {
      // Base64 looks like "data:application/pdf;base64,..."
      const base64Data = pdfBase64.includes('base64,') 
        ? pdfBase64.split('base64,')[1] 
        : pdfBase64;
        
      emailOptions.attachments = [
        {
          filename: `Contrato_${contratoNome.replace(/\s+/g, '_')}.pdf`,
          content: base64Data,
        }
      ];
    }

    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      console.error("[EmailService] Erro Resend:", error);
      throw error;
    }

    console.log("[EmailService] Email enviado com sucesso.");
    return data;
  } catch (error) {
    console.error("[EmailService] Erro Exception:", error);
    throw error;
  }
}
