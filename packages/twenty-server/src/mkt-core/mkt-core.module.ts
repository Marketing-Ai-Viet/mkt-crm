import { Module } from '@nestjs/common';
import { MailerModule } from './infrastructure/mailer/mailer.module';
import { LicenseModule } from './libs/license/license.module';
import { OtpModule } from './libs/otp/otp.module';
@Module({
  imports: [
    OtpModule,
    MailerModule,
    LicenseModule
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class MKTCoreModule {}