import { Module } from '@nestjs/common';

import { CoreEngineModule } from 'src/engine/core-modules/core-engine.module';
import { MKTCoreModule } from 'src/mkt-core/mkt-core.module';
@Module({
  imports: [CoreEngineModule,MKTCoreModule],
  providers: [],
  exports: [CoreEngineModule,MKTCoreModule],
})
export class GraphQLConfigModule {}
