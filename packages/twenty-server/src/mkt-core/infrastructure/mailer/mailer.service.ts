import { Injectable } from '@nestjs/common';
import type { Transporter } from 'nodemailer';
import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport'; // ⬅️ quan trọng!

@Injectable()
export class MailerService {
  private transporter: Transporter<SMTPTransport.SentMessageInfo>;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'kiennt1306.dev@gmail.com',
        pass: 'mrjtjapcaaysbbdc', // phải viết LIỀN!
      },
    } as SMTPTransport.Options); // 👈 ép kiểu cho đúng
  }
  
  async sendMail(to: string, subject: string, html: string) {
    return this.transporter.sendMail({
      from: `"MyApp" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  }
}
