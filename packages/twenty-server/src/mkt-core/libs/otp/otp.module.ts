import { Module } from '@nestjs/common';
import { RedisClientModule } from 'src/engine/core-modules/redis-client/redis-client.module';
import { MailerModule } from 'src/mkt-core/infrastructure/mailer/mailer.module';
import { OtpAuthAppService } from './otp-auth-app.service';
import { OtpResolver } from './otp.resolver';
import { OtpService } from './otp.service';
@Module({
  imports: [RedisClientModule, MailerModule],
  providers: [OtpService, OtpAuthAppService, OtpResolver],
  exports: [OtpService, OtpAuthAppService],
})
export class OtpModule {}
