import { MiddlewareConsumer,Module,RequestMethod } from '@nestjs/common';
import { MiddlewareModule } from 'src/engine/middlewares/middleware.module';
import { GraphQLRequestCustomMiddleware } from 'src/mkt-core/middlewares/graphql-request-custom.middleware';
import { GraphQLRequestCustomService } from 'src/mkt-core/middlewares/graphql-request-custom.service';
import { MktOrderModule } from 'src/mkt-core/order/mkt-order.module';
import { ConfigurationModule } from './configuration/configuration.module';
import { InvoiceModule } from './invoice/invoice.module';
import { VariantModule } from './variant/variant.module';

@Module({
  imports: [
    VariantModule, 
    ConfigurationModule, 
    InvoiceModule, 
    MiddlewareModule,
    MktOrderModule, // import MktOrderModule to use MktOrderService
    InvoiceModule, // import InvoiceModule to use InvoiceHookService
  ],
  providers: [
    GraphQLRequestCustomMiddleware, 
    GraphQLRequestCustomService,
  ],
  exports: [
    VariantModule, 
    ConfigurationModule, 
    InvoiceModule,
    GraphQLRequestCustomMiddleware, 
    GraphQLRequestCustomService,
  ],
})
export class MktCoreModule {
  configure(consumer: MiddlewareConsumer) {
    // custom GraphQL request middleware for mkt-core
    consumer
      .apply(GraphQLRequestCustomMiddleware)
      .forRoutes({ path: 'graphql', method: RequestMethod.ALL });
  }
}
