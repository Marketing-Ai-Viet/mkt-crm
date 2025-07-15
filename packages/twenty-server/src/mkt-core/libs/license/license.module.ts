import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicenseStatusHistory } from './entities/license-status-history.entity';
import { License } from './entities/license.entity';
import { LicenseResolver } from './license.resolver';
import { LicenseService } from './license.service';

@Module({
  imports: [TypeOrmModule.forFeature([License, LicenseStatusHistory], 'core')], 
  providers: [LicenseService, LicenseResolver],
  exports: [LicenseService],
})
export class LicenseModule {}
