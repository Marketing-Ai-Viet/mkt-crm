import { MiddlewareConsumer,Module,RequestMethod } from '@nestjs/common';
import { JwtModule } from 'src/engine/core-modules/jwt/jwt.module';

// import { GlobalInvoiceInterceptor } from './interceptors/global-invoice.interceptor';
// import { InvoiceCreateInterceptor } from './interceptors/invoice-create.interceptor';
import { InvoiceMiddleware } from './middleware/invoice-middleware';
// import { MktInvoiceResolver } from './resolvers/mkt-invoice.resolver';
import { InvoiceHookService } from './services/invoice-hook.service';
// import { InvoiceOverrideService } from './services/invoice-override.service';
// import { InvoicePostProcessService } from './services/invoice-post-process.service';
// import { MktInvoiceService } from './services/mkt-invoice.service';

@Module({ 
  imports: [
    JwtModule, // Import JwtModule để sử dụng JwtService
  ],
  providers: [
    // MktInvoiceResolver,
    // MktInvoiceService,
    // InvoicePostProcessService,
    // InvoiceOverrideService,
    InvoiceHookService,
    // InvoiceCreateInterceptor,
    // GlobalInvoiceInterceptor,
    // InvoiceMiddleware,
  ],
  exports: [
    // MktInvoiceService,
    // InvoicePostProcessService,
    // InvoiceOverrideService,
    InvoiceHookService,
    // GlobalInvoiceInterceptor,
    // InvoiceMiddleware,
  ],
})
export class InvoiceModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(InvoiceMiddleware) // comment out InvoiceMiddleware for now
      .forRoutes({ path: '/graphql', method: RequestMethod.POST });
  }
}
