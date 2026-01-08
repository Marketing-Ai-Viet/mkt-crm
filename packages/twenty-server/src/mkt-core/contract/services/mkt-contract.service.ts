import { Injectable, Logger } from '@nestjs/common';

import {
  CONTRACT_NUMBER_PREFIX,
  CONTRACT_SEQUENCE_DIGITS,
  DEFAULT_CONTRACT_DURATION_YEARS,
  MKT_CONTRACT_STATUS,
  TIMESTAMP_DIGITS,
} from 'src/mkt-core/contract/constants';
import {
  CONTRACT_MESSAGES,
  MKT_CONTRACT_LOG_CONTEXT,
} from 'src/mkt-core/contract/messages';
import { MktContractRepository } from 'src/mkt-core/contract/repositories';
import { UpdateContractData } from 'src/mkt-core/contract/types';
import { MktContractWorkspaceEntity } from 'src/mkt-core/contract/workspace-entity/mkt-contract.workspace-entity';
import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { EntityOwnershipUtil } from 'src/mkt-core/utils/entity-ownership.util';

/**
 * MktContractService - Business logic layer for Contract entity
 *
 * Responsibilities:
 * - Contract number generation
 * - Contract creation for orders
 * - Contract-order linking
 * - Contract updates
 */
@Injectable()
export class MktContractService {
  private readonly logger = new Logger(`${MKT_CONTRACT_LOG_CONTEXT}:Service`);

  constructor(
    private readonly contractRepository: MktContractRepository,
    private readonly orderRepository: MktOrderRepository,
    private readonly customerRepository: MktCustomerRepository,
  ) {}

  /**
   * Generate unique contract number
   * Format: CT + YYYYMMDD + 3-digit sequence
   * Example: CT20241201001
   */
  async generateContractNumber(workspaceId: string): Promise<string> {
    try {
      const now = DateTimeUtils.now();
      const year = now.year;
      const month = String(now.month).padStart(2, '0');
      const day = String(now.day).padStart(2, '0');
      const datePrefix = `${year}${month}${day}`;

      // Tìm số hợp đồng lớn nhất của ngày hôm nay
      const lastContractNumber =
        await this.contractRepository.findLastNumberWithPrefix(
          `${CONTRACT_NUMBER_PREFIX}${datePrefix}`,
          workspaceId,
        );

      let nextNumber = 1;

      if (lastContractNumber) {
        // Trích xuất số từ mã hợp đồng (e.g., CT20241201001 -> 1)
        const regex = new RegExp(
          `${CONTRACT_NUMBER_PREFIX}\\d{8}(\\d{${CONTRACT_SEQUENCE_DIGITS}})$`,
        );
        const match = lastContractNumber.match(regex);

        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      // Tạo mã hợp đồng mới: CT + YYYYMMDD + 3-digit number
      const contractNumber = `${CONTRACT_NUMBER_PREFIX}${datePrefix}${String(nextNumber).padStart(CONTRACT_SEQUENCE_DIGITS, '0')}`;

      // Kiểm tra trùng lặp
      // TODO : Cải thiện hiệu suất
      const existingContract =
        await this.contractRepository.isContractNumberExists(
          contractNumber,
          workspaceId,
        );

      if (existingContract) {
        // Nếu trùng, sử dụng timestamp
        const timestamp = DateTimeUtils.toMillis(now)
          .toString()
          .slice(-TIMESTAMP_DIGITS);

        return `${CONTRACT_NUMBER_PREFIX}${datePrefix}${timestamp}`;
      }

      this.logger.log(
        CONTRACT_MESSAGES.LOG.GENERATE_NUMBER_SUCCESS(contractNumber),
      );

      return contractNumber;
    } catch (error) {
      this.logger.error(CONTRACT_MESSAGES.ERROR.GENERATE_NUMBER_FAILED, error);

      throw new Error(CONTRACT_MESSAGES.ERROR.GENERATE_NUMBER_FAILED);
    }
  }

  /**
   * Create contract for order
   * Tạo hợp đồng mới khi đơn hàng được xác nhận
   */
  async createContractForOrder(
    order: MktOrderWorkspaceEntity,
    workspaceId: string,
    mktCustomerId: string | null,
    generatedOrderCode: string | null,
  ): Promise<MktContractWorkspaceEntity> {
    try {
      this.logger.log(`Creating contract for order: ${order.id}`);

      // Generate contract data
      const contractNumber = await this.generateContractNumber(workspaceId);

      const contractName = await this.generateContractName(
        workspaceId,
        mktCustomerId,
        generatedOrderCode,
      );

      const now = DateTimeUtils.now();

      // Default contract duration: 1 year from now
      const endDateTime = DateTimeUtils.add(now, {
        years: DEFAULT_CONTRACT_DURATION_YEARS,
      });

      // Build ownership fields from order's ownership
      const ownershipFields = EntityOwnershipUtil.buildOwnershipFields({
        workspaceMemberId: order.createdById ?? undefined,
        accountOwnerId: order.accountOwnerId ?? undefined,
      });

      // Create the contract using repository
      const savedContract = await this.contractRepository.create(
        {
          name: contractName,
          contractNumber,
          startDate: DateTimeUtils.toDate(now),
          endDate: DateTimeUtils.toDate(endDateTime),
          status: MKT_CONTRACT_STATUS.ACTIVE,
          customerId: mktCustomerId,
          ...ownershipFields,
        },
        workspaceId,
      );

      this.logger.log(
        `Successfully created contract ${contractNumber} for order ${order.id}`,
      );

      return savedContract;
    } catch (error) {
      this.logger.error(
        `Failed to create contract for order ${order.id}:`,
        error,
      );

      throw new Error(CONTRACT_MESSAGES.ERROR.CREATE_FAILED(order.id));
    }
  }

  /**
   * Link contract to order
   * Liên kết hợp đồng với đơn hàng
   */
  async linkContractToOrder(
    contractId: string,
    orderId: string,
    workspaceId: string,
  ): Promise<void> {
    try {
      this.logger.log(`Linking contract ${contractId} to order ${orderId}`);

      await this.orderRepository.update(workspaceId, orderId, {
        mktContractId: contractId,
      });

      this.logger.log(
        `Successfully linked contract ${contractId} to order ${orderId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to link contract ${contractId} to order ${orderId}:`,
        error,
      );

      throw new Error('Failed to link contract to order');
    }
  }

  /**
   * Generate contract name based on order
   * Format: Hợp đồng {orderCode} - {customerName}
   */
  private async generateContractName(
    workspaceId: string,
    mktCustomerId: string | null,
    orderCode: string | null,
  ): Promise<string> {
    try {
      let customerName = 'Unknown Customer';

      if (mktCustomerId) {
        const customer = await this.customerRepository.findByIdOrNull(
          mktCustomerId,
          workspaceId,
        );

        if (customer?.name) {
          customerName = customer.name;
        }
      }

      return `Hợp đồng ${orderCode} - ${customerName}`;
    } catch (error) {
      this.logger.error('Failed to generate contract name:', error);

      // Fallback với ngày tạo
      const now = DateTimeUtils.now();
      const formattedDate = DateTimeUtils.format(now, 'dd/MM/yyyy');

      return `Hợp đồng ${formattedDate}`;
    }
  }

  /**
   * Update contract information
   */
  async updateContract(
    contractId: string,
    updateData: UpdateContractData,
    workspaceId: string,
  ): Promise<void> {
    try {
      this.logger.log(`Updating contract ${contractId}`);

      await this.contractRepository.update(contractId, updateData, workspaceId);

      this.logger.log(CONTRACT_MESSAGES.LOG.UPDATE_SUCCESS(contractId));
    } catch (error) {
      this.logger.error(`Failed to update contract ${contractId}:`, error);

      throw new Error(CONTRACT_MESSAGES.ERROR.UPDATE_FAILED(contractId));
    }
  }

  /**
   * Find contract by ID with relations
   */
  async findContractById(
    contractId: string,
    workspaceId: string,
  ): Promise<MktContractWorkspaceEntity | null> {
    try {
      return await this.contractRepository.findByIdWithRelations(
        contractId,
        ['mktOrders'],
        workspaceId,
      );
    } catch (error) {
      this.logger.error(`Failed to find contract ${contractId}:`, error);

      return null;
    }
  }
}
