import { Injectable,NestMiddleware } from '@nestjs/common';
import { NextFunction,Request,Response } from 'express';
import { InvoiceHookService } from '../services/invoice-hook.service';

@Injectable()
export class InvoiceMiddleware implements NestMiddleware {
  constructor(
    private readonly invoiceHookService: InvoiceHookService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    // only process for GraphQL requests
    if (req.path === '/graphql' && req.method === 'POST') {
      const body = req.body;
      
      // check if it is CreateOneMktInvoice mutation
      if (body?.operationName === 'CreateOneMktInvoice') {
        console.log('🔄 InvoiceMiddleware: Intercepted CreateOneMktInvoice request');
        console.log('📋 Request body:', JSON.stringify(body, null, 2));
        
        // save original response to intercept
        const originalSend = res.send;
        res.send = function(data: any) {
          try {
            const responseData = JSON.parse(data);
            
            // if there is data and invoice is created
            if (responseData?.data?.createMktInvoice?.id) {
              const invoiceId = responseData.data.createMktInvoice.id;
              console.log(`🔄 InvoiceMiddleware: Invoice created with ID: ${invoiceId}`);
              
              // call service to update name from orderItem
              this.invoiceHookService.afterInvoiceCreated(invoiceId)
                .then(() => {
                  console.log(`✅ InvoiceMiddleware: Successfully processed invoice ${invoiceId}`);
                })
                .catch((error: any) => {
                  console.error(`❌ InvoiceMiddleware: Error processing invoice ${invoiceId}:`, error);
                });
            }
          } catch (error: any) {
            console.error('❌ InvoiceMiddleware: Error parsing response:', error);
          }
          
          // call original send
          return originalSend.call(this, data);
        }.bind(this);
      }
    }
    
    next();
  }
}
