import { Module } from '@nestjs/common';
import { AuthModule } from 'src/engine/core-modules/auth/auth.module';
import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { CacheStorageModule } from 'src/engine/core-modules/cache-storage/cache-storage.module';
import { DomainManagerModule } from 'src/engine/core-modules/domain-manager/domain-manager.module';
import { UserModule } from 'src/engine/core-modules/user/user.module';
import { MktTwoFacetorAuthenticationResolver } from 'src/mkt-core/mkt-two-facetor-authentication/mkt-two-facetor-authentication.resolver';
import { MktTwoFacetorAuthenticationService } from 'src/mkt-core/mkt-two-facetor-authentication/mkt-two-facetor-authentication.service';

@Module({
  imports: [
    CacheStorageModule,
    AuthModule,
    UserModule,
    TokenModule,
    DomainManagerModule,
  ],
  providers: [
    MktTwoFacetorAuthenticationService,
    MktTwoFacetorAuthenticationResolver,
  ],
  exports: [MktTwoFacetorAuthenticationService],
})
export class MktTwoFacetorAuthenticationModule {}
