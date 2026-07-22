import { Resend } from 'resend';

export async function sendEmail({
  contratoNome,
  nomeCliente,
  detalhes,
  pdfBase64,
  valorContrato,
  materiais,
  metragemAInstalar,
  municipio,
  uf
}: {
  contratoNome: string;
  nomeCliente?: string;
  detalhes: string;
  pdfBase64?: string;
  valorContrato?: number;
  materiais?: string;
  metragemAInstalar?: string;
  municipio?: string;
  uf?: string;
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
      if (typeof materiais === 'string' && materiais.startsWith('[')) {
        const itens = JSON.parse(materiais);
        if (Array.isArray(itens) && itens.length > 0) {
          const validItens = itens.filter((it: any) => it && (typeof it === 'string' ? it.trim() : it.material?.trim()));
          if (validItens.length > 0) {
            materiaisHtml = `<ul style="margin: 0; padding-left: 20px;">${validItens.map((it: any) => {
              const name = typeof it === 'string' ? it : it.material;
              return `
                <li style="margin-bottom: 6px; color: #2d3748; font-weight: 600;">
                  ${name}
                </li>
              `;
            }).join('')}</ul>`;
          }
        }
      } else if (typeof materiais === 'string') {
        materiaisHtml = materiais;
      }
    } catch (e) {
      materiaisHtml = String(materiais);
    }
  }

  let cidadeDisplay = 'Não informada';
  if (municipio && uf) {
    cidadeDisplay = `${municipio} / ${uf}`;
  } else if (municipio) {
    cidadeDisplay = municipio;
  } else if (uf) {
    cidadeDisplay = uf;
  }

  let metragemDisplay = 'Não informada';
  if (metragemAInstalar && metragemAInstalar.trim() !== '') {
    const rawVal = metragemAInstalar.trim();
    metragemDisplay = rawVal.toLowerCase().includes('m²') || rawVal.toLowerCase().includes('m2') ? rawVal : `${rawVal} m²`;
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
        <p style="margin: 8px 0;"><strong>Cidade:</strong> ${cidadeDisplay}</p>
        <p style="margin: 8px 0;"><strong>Metragem do Contrato:</strong> ${metragemDisplay}</p>
        
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

export async function sendVerificationCodeEmail({
  email,
  code,
  usuarioNome
}: {
  email: string;
  code: string;
  usuarioNome: string;
}) {
  console.log("[EmailService] Enviando código para:", email);

  if (!process.env.RESEND_API_KEY) {
    console.warn("\n==================================================");
    console.warn(`[DEVELOPMENT MODE] RESEND_API_KEY não configurada.`);
    console.warn(`CÓDIGO DE VERIFICAÇÃO PARA ${email}: ${code}`);
    console.warn("==================================================\n");
    return { mock: true, code };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const from = process.env.SMTP_FROM || "onboarding@resend.dev";

  const subject = `🔑 Seu código de verificação para alteração de senha: ${code}`;

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 500px; margin: auto; color: #333; line-height: 1.6; border: 1px solid #edf2f7; border-radius: 12px; padding: 32px; background-color: #ffffff;">
      <h2 style="color: #1a365d; margin-top: 0; margin-bottom: 24px; text-align: center; font-size: 22px;">Alteração de Senha</h2>
      <p>Olá, <strong>${usuarioNome}</strong>!</p>
      <p>Recebemos uma solicitação para alterar a senha da sua conta no sistema <strong>Projeto Certo</strong>.</p>
      <p>Utilize o código de verificação abaixo para confirmar sua identidade e concluir a alteração. Este código expira em 10 minutos.</p>
      
      <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; margin: 28px 0;">
        <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1a365d;">${code}</span>
      </div>

      <p style="font-size: 13px; color: #718096; text-align: center;">Se você não solicitou essa alteração, pode ignorar este e-mail com segurança.</p>
      
      <div style="margin-top: 32px; font-size: 11px; color: #a0aec0; border-top: 1px solid #edf2f7; padding-top: 16px; text-align: center;">
        Este é um e-mail automático gerado pelo sistema de Gestão de Obras. Por favor, não responda.
      </div>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: from,
      to: [email],
      subject: subject,
      html: htmlContent,
    });

    if (error) {
      console.error("[EmailService] Erro Resend ao enviar código:", error);
      throw error;
    }

    console.log("[EmailService] Código enviado com sucesso para:", email);
    return data;
  } catch (error) {
    console.error("[EmailService] Exceção ao enviar código:", error);
    throw error;
  }
}
