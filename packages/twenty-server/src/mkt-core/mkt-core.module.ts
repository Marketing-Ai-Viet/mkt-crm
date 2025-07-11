import { Module } from '@nestjs/common';
import { MailerModule } from './infrastructure/mailer/mailer.module';
import { OtpModule } from './libs/otp/otp.module';
@Module({
  imports: [
    OtpModule,
    MailerModule
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class MKTCoreModule {}