import { Module } from '@nestjs/common';
import { MailerModule } from './infrastructure/mailer/mailer.module';
import { LicenseModule } from './libs/license/license.module';
import { OtpModule } from './libs/otp/otp.module';
import {CustomersModule} from 'src/mkt-core/customers/customers.module';
@Module({
  imports: [
    // OtpModule,
    // MailerModule,
    // LicenseModule,
    // Module Example
    CustomersModule
  ],
  controllers: [],
  providers: [],
  exports: [
    // Module Example
    CustomersModule
  ],
})
export class MKTCoreModule {}