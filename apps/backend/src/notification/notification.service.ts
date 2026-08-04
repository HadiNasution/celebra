import { Injectable } from "@nestjs/common";
import * as nodemailer from "nodemailer";

@Injectable()
export class NotificationService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  async sendCredentials(
    email: string,
    name: string,
    password: string,
    slug: string,
  ) {
    const dashboardUrl = `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/${slug}/dashboard`;
    const body = `Hi ${name},\n\nYour Celebra account is ready!\n\nDashboard: ${dashboardUrl}\nEmail: ${email}\nPassword: ${password}\n\nPlease change your password after login.\n\n— Team Celebra`;

    if (this.transporter) {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM ?? "noreply@celebra.com",
        to: email,
        subject: "Your Celebra Account is Ready",
        text: body,
      });
    } else {
      // ponytail: no SMTP configured, log to console for dev
      console.log(`\n[NEW ACCOUNT] ${email}\n[DASHBOARD] ${dashboardUrl}\n[PASSWORD] ${password}\n`);
    }

    // ponytail: WhatsApp notification placeholder — add real provider when needed
  }
}
