import { Injectable } from '@nestjs/common';
import { MKT_INVOICE_STATUS } from 'src/mkt-core/invoice/mkt-invoice.workspace-entity';
import { InvoiceHookService } from 'src/mkt-core/invoice/services/invoice-hook.service';
import { MktOrderService } from 'src/mkt-core/order/mkt-order.service';

// import enum from entity
enum ORDER_STATUS {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  FULFILLED = 'fulfilled',
}

enum MKT_LICENSE_STATUS {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

@Injectable()
export class GraphQLRequestCustomService {
  constructor(
    private readonly mktOrderService: MktOrderService,
    private readonly invoiceHookService: InvoiceHookService,
  ) {}

  /**
   * process custom for GraphQL request
   */
  async customizeGraphQLRequest(operationName: string, variables: any, authorizationHeader?: string): Promise<void> {
    console.log(`🎯 GraphQL Request Customization - Operation: ${operationName}`);
    
    if (!variables || !variables.input) {
      console.log('⚠️ No input variables found, skipping customization');
      return;
    }

    console.log('📥 GraphQL Request Customization - Input before:', JSON.stringify(variables.input, null, 2));

    switch (operationName) {
      case 'CreateOneMktInvoice':
        await this.customizeMktInvoiceRequest(variables.input, authorizationHeader);
        break;
      case 'CreateOneMktOrder':
        // await this.customizeMktOrderRequest(variables.input);
        break;
      case 'CreateOneMktProduct':
        // await this.customizeMktProductRequest(variables.input);
        break;
      case 'CreateOneMktLicense':
        // await this.customizeMktLicenseRequest(variables.input);
        break;
      case 'CreateOneCustomer':
        // await this.customizeCustomerRequest(variables.input);
        break;
      default:
        console.log(`⚠️ No customization found for operation: ${operationName}`);
    }

    console.log('📤 GraphQL Request Customization - Input after:', JSON.stringify(variables.input, null, 2));
  }

  /**
   * process custom for MktInvoice
   */
  async customizeMktInvoiceRequest(input: any, authorizationHeader?: string): Promise<void> {
    console.log('🔄 Processing MktInvoice request:', JSON.stringify(input, null, 2));
    
    // process empty name
    if (input.name === '' || !input.name) {
      console.log('📝 Name is empty, generating new name...');
      if (input.mktOrderId) {
        console.log(`🔗 Found mktOrderId: ${input.mktOrderId}`);
        // get order data and create name from order item names
        input.name = await this.generateInvoiceNameFromOrder(input.mktOrderId, authorizationHeader);
      } else {
        console.log('⚠️ No mktOrderId found, using default name');
        input.name = this.generateDefaultName('Invoice');
      }
    }

    // auto set status if not have
    if (!input.status) {
      input.status = MKT_INVOICE_STATUS.DRAFT;
    }

    // auto set amount if not have
    if (!input.amount && input.mktOrderId) {
      // get amount from order
      input.amount = '0'; // use string instead of number
    }
    
    console.log('✅ MktInvoice request processed:', JSON.stringify(input, null, 2));
  }

  /**
   * create default name
   */
  private generateDefaultName(type: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${type}-${timestamp}-${randomSuffix}`;
  }

  /**
   * create invoice name from order data (merge order item names) - use database
   */
  private async generateInvoiceNameFromOrder(orderId: string, authorizationHeader?: string): Promise<string> {
    try {
      console.log(`🎯 Generating invoice name for order: ${orderId}`);
      
      // use InvoiceHookService to get orderItem names from database
      const orderItemName = await this.invoiceHookService.updateInvoiceNameFromOrderItemDirectly(orderId, authorizationHeader);
      
      if (!orderItemName) {
        console.log('⚠️ No orderItem name found from database, using fallback');
        return this.generateInvoiceName(orderId);
      }

      console.log(`📋 Retrieved orderItem name from database: ${orderItemName}`);

      // create invoice name from orderItem name
      const timestamp = new Date().toISOString().split('T')[0];
      
      // limit name length to avoid too long
      const maxLength = 50;
      const truncatedName = orderItemName.length > maxLength 
        ? orderItemName.substring(0, maxLength) + '...'
        : orderItemName;

      const result = `INV-${truncatedName}-${timestamp}`;
      console.log(`✨ Generated invoice name from database: ${result}`);
      return result;
    } catch (error) {
      console.error('❌ Error generating invoice name from database:', error);
      console.error('❌ Error details:', error.message);
      // fallback if error
      return this.generateInvoiceName(orderId);
    }
  }

  /**
   * create invoice name (fallback method)
   */
  private generateInvoiceName(orderId: string): string {
    const orderSuffix = orderId.slice(0, 8);
    const timestamp = new Date().toISOString().split('T')[0];
    return `INV-${orderSuffix}-${timestamp}`;
  }
}
