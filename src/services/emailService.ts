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

  const subject = `🎉 Novo Contrato Fechado: ${nomeCliente || 'Cliente'} - ${contratoNome}`;

  let materiaisHtml = 'Não informado';

  if (materiais) {
    try {
      if (materiais.startsWith('[')) {
        const itens = JSON.parse(materiais);
        if (Array.isArray(itens) && itens.length > 0) {
          materiaisHtml = `<ul style="margin: 0; padding-left: 20px;">${itens.map((it: any) => `
            <li style="margin-bottom: 6px;">
              <span style="color: #4a5568;">${it.material}:</span> 
              <strong style="color: #2d3748;">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(it.valor || 0)}</strong>
            </li>
          `).join('')}</ul>`;
        }
      } else {
        materiaisHtml = materiais;
      }
    } catch (e) {
      materiaisHtml = materiais;
    }
  }

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; color: #333; line-height: 1.6;">
      <h2 style="color: #1a365d; margin-bottom: 20px;">🎉 Parabéns a todos envolvidos!</h2>
      <p>Neste momento iniciamos uma nova jornada.</p>
      
      <p style="font-style: italic; color: #4a5568; margin: 20px 0;">
        Cada contrato fechado será como um carro de Fórmula 1 entrando no boxe para sua parada estratégica.<br>
        A partir desse momento, nossa equipe entra em ação sincronizada, onde cada integrante desempenha seu papel com precisão e comprometimento, 
        contribuindo para alcançar a excelência, superar expectativas e garantir a satisfação do cliente.
      </p>

      <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="color: #2d3748; margin-top: 0; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Informações do Contrato</h3>
        
        <p style="margin: 8px 0;"><strong>Nome do Cliente:</strong> ${nomeCliente && nomeCliente.trim() !== '' ? nomeCliente : 'Não informado'}</p>
        <p style="margin: 8px 0;"><strong>Nome da Obra:</strong> ${contratoNome}</p>
        <p style="margin: 8px 0;"><strong>Valor do Contrato:</strong> ${(valorContrato !== undefined && valorContrato !== null) ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorContrato) : 'Não informado'}</p>
        
        <div style="margin-top: 20px; border-top: 1px solid #e2e8f0; pt: 16px;">
          <p style="margin: 16px 0 8px 0;"><strong>Itens a serem instalados:</strong></p>
          <div style="background-color: #fff; border: 1px solid #edf2f7; padding: 16px; border-radius: 8px;">${materiaisHtml}</div>
        </div>
      </div>

      <p>O contrato em PDF está em anexo a este e-mail.</p>
      <p style="margin-top: 40px; font-size: 11px; color: #a0aec0; border-top: 1px solid #edf2f7; padding-top: 16px;">
        Este e-mail foi gerado automaticamente pelo sistema de Gestão de Obras.
      </p>
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
