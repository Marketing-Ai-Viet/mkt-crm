import { MiddlewareConsumer,Module,RequestMethod } from '@nestjs/common';

import { MktLicenseMiddleware } from 'src/mkt-core/license/mkt-license.middleware';
import { MktLicenseService } from 'src/mkt-core/license/mkt-license.service';

@Module({
  providers: [MktLicenseService],
})
export class MktLicenseModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MktLicenseMiddleware)
      .forRoutes({ path: '/graphql', method: RequestMethod.POST });
  }
}