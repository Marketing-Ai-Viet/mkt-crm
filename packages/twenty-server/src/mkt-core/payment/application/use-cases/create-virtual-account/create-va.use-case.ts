/**
 * Create Virtual Account Use Case
 *
 * Handles the business logic for creating virtual accounts.
 */

import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { MktVirtualAccountRepository } from 'src/mkt-core/payment/repositories';
import { transferModeConfig } from 'src/mkt-core/payment/config';
import {
  IVAProvider,
  VA_PROVIDER_TOKEN,
} from 'src/mkt-core/payment/domain/ports';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

import { CreateVAInput } from './create-va.input';
import {
  CreateVAOutput,
  VADetails,
  createVACreatedOutput,
  createVAExistsOutput,
  createOrderNotFoundOutput,
  createProviderErrorOutput,
  createProviderUnavailableOutput,
  createVADisabledOutput,
} from './create-va.output';

/**
 * CreateVAUseCase
 *
 * Orchestrates virtual account creation:
 * 1. Check if VA is enabled
 * 2. Validate order exists
 * 3. Check for existing active VA
 * 4. Create VA via provider
 * 5. Save to database
 */
@Injectable()
export class CreateVAUseCase {
  private readonly logger = new Logger(CreateVAUseCase.name);

  constructor(
    @Inject(transferModeConfig.KEY)
    private readonly config: ConfigType<typeof transferModeConfig>,
    private readonly orderRepository: MktOrderRepository,
    private readonly vaRepository: MktVirtualAccountRepository,
    @Optional()
    @Inject(VA_PROVIDER_TOKEN)
    private readonly vaProvider: IVAProvider | null,
  ) {}

  /**
   * Execute the use case
   */
  async execute(input: CreateVAInput): Promise<CreateVAOutput> {
    this.logger.log({
      message: 'Creating virtual account',
      orderId: input.orderId,
    });

    try {
      // Step 1: Check if VA is enabled
      if (!this.config.va.enabled) {
        this.logger.warn('VA feature is disabled');

        return createVADisabledOutput();
      }

      // Step 2: Check if provider is available
      if (!this.vaProvider) {
        this.logger.error('VA provider not configured');

        return createProviderUnavailableOutput();
      }

      const isAvailable = await this.vaProvider.isAvailable();

      if (!isAvailable) {
        this.logger.error('VA provider is not available');

        return createProviderUnavailableOutput();
      }

      // Step 3: Find order
      const order = await this.orderRepository.findById(input.orderId);

      if (!order) {
        this.logger.warn(`Order not found: ${input.orderId}`);

        return createOrderNotFoundOutput(input.orderId);
      }

      // Step 4: Check for existing active VA
      if (!input.forceCreate) {
        const existingVA = await this.vaRepository.findActiveByOrderId(
          input.orderId,
          input.workspaceId,
        );

        if (existingVA) {
          this.logger.log(
            `Active VA already exists for order: ${input.orderId}`,
          );

          return createVAExistsOutput(this.toVADetails(existingVA));
        }
      } else {
        // Deactivate existing VAs if force creating
        await this.vaRepository.deactivateByOrderId(
          input.orderId,
          input.workspaceId,
        );
      }

      // Step 5: Calculate expiry
      const expiryHours = input.expiryHours ?? this.config.va.expiryHours;
      const expiresAt = DateTimeUtils.add(DateTimeUtils.now(), {
        hours: expiryHours,
      });

      // Step 6: Create VA via provider
      const vaResponse = await this.vaProvider.createVA({
        orderId: order.id,
        orderCode: order.orderCode,
        amount: order.totalAmount ?? 0,
        expiryMinutes: expiryHours * 60,
      });

      // Step 7: Save to database
      const savedVA = await this.vaRepository.createVA(
        {
          vaNumber: vaResponse.vaNumber,
          orderId: order.id,
          orderCode: order.orderCode,
          bankCode: vaResponse.bankCode,
          bankName: vaResponse.bankName,
          accountName: vaResponse.accountName,
          amount: order.totalAmount ?? 0,
          qrCodeUrl: vaResponse.qrCodeUrl,
          expiresAt: DateTimeUtils.toISO(expiresAt),
          provider: this.config.va.provider,
          providerResponse: vaResponse.providerResponse,
        },
        input.workspaceId,
      );

      this.logger.log({
        message: 'Virtual account created successfully',
        vaId: savedVA.id,
        vaNumber: savedVA.vaNumber,
        orderId: order.id,
      });

      return createVACreatedOutput(this.toVADetails(savedVA));
    } catch (error) {
      this.logger.error({
        message: 'Error creating virtual account',
        orderId: input.orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return createProviderErrorOutput(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  /**
   * Convert entity to VADetails
   */
  private toVADetails(va: {
    id: string;
    vaNumber: string;
    bankCode?: string;
    bankName?: string;
    accountName?: string;
    amount: number;
    qrCodeUrl?: string;
    expiresAt?: string;
    provider?: string;
  }): VADetails {
    return {
      id: va.id,
      vaNumber: va.vaNumber,
      bankCode: va.bankCode ?? '',
      bankName: va.bankName ?? '',
      accountName: va.accountName ?? '',
      amount: va.amount,
      qrCodeUrl: va.qrCodeUrl,
      expiresAt: va.expiresAt ?? '',
      provider: va.provider ?? this.config.va.provider,
    };
  }
}
