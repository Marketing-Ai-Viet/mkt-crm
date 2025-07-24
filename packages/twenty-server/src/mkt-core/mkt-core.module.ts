import { Module } from '@nestjs/common';
import { CustomersModule } from './libs/customers/customers.module';
import { OtpModule } from './libs/otp/otp.module';
@Module({
  imports: [
    OtpModule,
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