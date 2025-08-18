import { MiddlewareConsumer,Module,RequestMethod } from '@nestjs/common';
import { GraphQLRequestCustomMiddleware } from 'src/mkt-core/middlewares/graphql-request-custom.middleware';
import { MktMiddlewareModule } from 'src/mkt-core/middlewares/middleware.module';
import { MktOrderModule } from 'src/mkt-core/order/mkt-order.module';
import { ConfigurationModule } from './configuration/configuration.module';
import { InvoiceModule } from './invoice/invoice.module';
import { VariantModule } from './variant/variant.module';

@Module({
  imports: [
    VariantModule, 
    ConfigurationModule, 
    InvoiceModule, 
    MktMiddlewareModule,
    MktOrderModule,
    InvoiceModule,
  ],
})
export class MktCoreModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(GraphQLRequestCustomMiddleware)
      .forRoutes({ path: 'graphql', method: RequestMethod.ALL });
  }
}
