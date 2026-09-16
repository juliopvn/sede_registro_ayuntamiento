import { getEnv } from "@/lib/env";

export interface Mailer {
  sendMagicLinkEmail(to: string, link: string): Promise<void>;
}

function buildMagicLinkHtml(link: string): string {
  return `
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="font-size: 20px; color: #1B2A4A;">Acceso a la Sede Electrónica</h1>
      <p style="color: #4B5567; font-size: 15px;">
        Pulsa el siguiente enlace para acceder. Caduca en 15 minutos y solo puede usarse una vez.
      </p>
      <p style="margin: 24px 0;">
        <a href="${link}" style="background: #A8322D; color: #fff; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: 600;">
          Acceder a la Sede
        </a>
      </p>
      <p style="color: #94A0B4; font-size: 13px;">
        Si no has solicitado este acceso, puedes ignorar este correo.
      </p>
    </div>
  `;
}

class SmtpMailer implements Mailer {
  async sendMagicLinkEmail(to: string, link: string): Promise<void> {
    const env = getEnv();
    const { default: nodemailer } = await import("nodemailer");

    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: false,
    });

    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject: "Tu acceso a la Sede Electrónica",
      html: buildMagicLinkHtml(link),
    });
  }
}

class ResendMailer implements Mailer {
  async sendMagicLinkEmail(to: string, link: string): Promise<void> {
    const env = getEnv();
    const { Resend } = await import("resend");
    const resend = new Resend(env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject: "Tu acceso a la Sede Electrónica",
      html: buildMagicLinkHtml(link),
    });

    if (error) {
      throw new Error(`Error enviando email vía Resend: ${error.message}`);
    }
  }
}

let mailer: Mailer | undefined;

export function getMailer(): Mailer {
  if (!mailer) {
    mailer = getEnv().EMAIL_PROVIDER === "resend" ? new ResendMailer() : new SmtpMailer();
  }
  return mailer;
}
