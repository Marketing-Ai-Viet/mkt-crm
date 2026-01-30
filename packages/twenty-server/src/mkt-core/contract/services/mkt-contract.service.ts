import { Injectable, Logger } from '@nestjs/common';

import {
  CONTRACT_NUMBER_PREFIX,
  CONTRACT_SEQUENCE_DIGITS,
  DEFAULT_CONTRACT_DURATION_YEARS,
  DEFAULT_CONTRACT_TYPE,
  MKT_CONTRACT_STATUS,
  ORDER_ACTION_TO_CONTRACT_TYPE,
  TIMESTAMP_DIGITS,
} from 'src/mkt-core/contract/constants';
import {
  CONTRACT_MESSAGES,
  CONTRACT_RESPONSE_MESSAGES,
} from 'src/mkt-core/contract/messages';
import { MktContractRepository } from 'src/mkt-core/contract/repositories';
import {
  UpdateContractData,
  ServiceResult,
  CreateContractServiceInput,
  UpdateContractServiceInput,
  CreateContractResult,
  UpdateContractResult,
  DeleteContractResult,
  RestoreContractResult,
  CustomerContractStats,
  ContractQueryOptions,
  StatusDistributionItem,
} from 'src/mkt-core/contract/types';
import { MktContractWorkspaceEntity } from 'src/mkt-core/contract/workspace-entity/mkt-contract.workspace-entity';
import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

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
  private readonly logger = new Logger(MktContractService.name);

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
  async generateContractNumber(): Promise<string> {
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
        await this.contractRepository.isContractNumberExists(contractNumber);

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
   *
   * @param order - Order entity
   * @param workspaceId - Workspace ID
   * @param mktCustomerId - Customer ID
   * @param generatedOrderCode - Order code
   * @param orderAction - Order action để xác định loại hợp đồng (NEW_ORDER, TRIAL_TO_PAID, LICENSE_RENEWING, CHANGE_VARIANT)
   */
  async createContractForOrder(
    order: MktOrderWorkspaceEntity,
    workspaceId: string,
    mktCustomerId: string | null,
    generatedOrderCode: string | null,
    orderAction?: string,
  ): Promise<MktContractWorkspaceEntity> {
    try {
      this.logger.log(`Creating contract for order: ${order.id}`);

      // Generate contract data
      const contractNumber = await this.generateContractNumber();

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

      // Determine contract type from order action
      const contractType = orderAction
        ? (ORDER_ACTION_TO_CONTRACT_TYPE[orderAction] ?? DEFAULT_CONTRACT_TYPE)
        : DEFAULT_CONTRACT_TYPE;

      // Create the contract with ownership fields
      // Status = PENDING_CONVERSION: Contract được tạo để tham chiếu, đợi chuyển đổi thành hợp đồng chính thức
      const savedContract =
        await this.contractRepository.createContractWithOwnership(
          {
            name: contractName,
            contractNumber,
            contractType,
            startDate: DateTimeUtils.toDate(now),
            endDate: DateTimeUtils.toDate(endDateTime),
            status: MKT_CONTRACT_STATUS.PENDING_CONVERSION,
            customerId: mktCustomerId,
          },
          order.createdById ?? undefined,
          order.accountOwnerId ?? undefined,
        );

      this.logger.log(
        `Successfully created contract ${contractNumber} (type: ${contractType}) for order ${order.id}`,
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
  ): Promise<void> {
    try {
      this.logger.log(`Linking contract ${contractId} to order ${orderId}`);

      await this.orderRepository.update(orderId, {
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
        const customer =
          await this.customerRepository.findByIdOrNull(mktCustomerId);

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
  ): Promise<void> {
    try {
      this.logger.log(`Updating contract ${contractId}`);

      await this.contractRepository.updateContract(contractId, updateData);

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
  ): Promise<MktContractWorkspaceEntity | null> {
    try {
      return await this.contractRepository.findByIdWithRelations(contractId, [
        'mktOrders',
      ]);
    } catch (error) {
      this.logger.error(`Failed to find contract ${contractId}:`, error);

      return null;
    }
  }

  // ============================================================================
  // GRAPHQL MUTATION OPERATIONS
  // ============================================================================

  /**
   * Create contract from GraphQL input
   */
  async createContractFromInput(
    input: CreateContractServiceInput,
  ): Promise<ServiceResult<CreateContractResult>> {
    try {
      const contractNumber =
        input.contractNumber ?? (await this.generateContractNumber());

      const contract =
        await this.contractRepository.createContractWithOwnership(
          {
            name: input.name,
            contractNumber,
            contractType: input.contractType,
            status: MKT_CONTRACT_STATUS.ACTIVE,
            startDate: input.startDate
              ? DateTimeUtils.fromISO(input.startDate).toJSDate()
              : undefined,
            endDate: input.endDate
              ? DateTimeUtils.fromISO(input.endDate).toJSDate()
              : undefined,
            signedDate: input.signedDate
              ? DateTimeUtils.fromISO(input.signedDate).toJSDate()
              : undefined,
            filePath: input.filePath,
            fileName: input.fileName,
            description: input.description,
            customerId: input.customerId,
            accountOwnerId: input.accountOwnerId ?? input.workspaceMemberId,
          },
          input.workspaceMemberId,
          input.accountOwnerId,
        );

      this.logger.log(CONTRACT_MESSAGES.LOG.CREATE_SUCCESS(contract.id));

      return {
        success: true,
        data: {
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          status: contract.status as MKT_CONTRACT_STATUS,
        },
      };
    } catch (error) {
      this.logger.error('Failed to create contract:', error);

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : CONTRACT_RESPONSE_MESSAGES.FAILURE.CREATE_FAILED,
      };
    }
  }

  /**
   * Update contract from GraphQL input
   */
  async updateContractFromInput(
    input: UpdateContractServiceInput,
  ): Promise<ServiceResult<UpdateContractResult>> {
    try {
      const existingContract = await this.contractRepository.findByIdOrNull(
        input.id,
      );

      if (!existingContract) {
        return {
          success: false,
          error: CONTRACT_RESPONSE_MESSAGES.FAILURE.NOT_FOUND(input.id),
        };
      }

      const previousStatus = existingContract.status as MKT_CONTRACT_STATUS;

      const updateData = this.buildUpdateData(input);

      await this.contractRepository.updateContract(input.id, updateData);

      this.logger.log(CONTRACT_MESSAGES.LOG.UPDATE_SUCCESS(input.id));

      return {
        success: true,
        data: {
          contractId: input.id,
          previousStatus,
          newStatus: (input.status ?? previousStatus) as MKT_CONTRACT_STATUS,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to update contract ${input.id}:`, error);

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : CONTRACT_RESPONSE_MESSAGES.FAILURE.UPDATE_FAILED,
      };
    }
  }

  /**
   * Update contract status
   */
  async updateStatus(
    contractId: string,
    newStatus: MKT_CONTRACT_STATUS,
  ): Promise<ServiceResult<UpdateContractResult>> {
    try {
      const existingContract =
        await this.contractRepository.findByIdOrNull(contractId);

      if (!existingContract) {
        return {
          success: false,
          error: CONTRACT_RESPONSE_MESSAGES.FAILURE.NOT_FOUND(contractId),
        };
      }

      const previousStatus = existingContract.status as MKT_CONTRACT_STATUS;

      await this.contractRepository.updateContract(contractId, {
        status: newStatus,
      });

      this.logger.log(
        CONTRACT_MESSAGES.LOG.STATUS_CHANGED(
          contractId,
          previousStatus,
          newStatus,
        ),
      );

      return {
        success: true,
        data: {
          contractId,
          previousStatus,
          newStatus,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to update status for contract ${contractId}:`,
        error,
      );

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : CONTRACT_RESPONSE_MESSAGES.FAILURE.STATUS_UPDATE_FAILED,
      };
    }
  }

  /**
   * Soft delete contract
   */
  async softDelete(
    contractId: string,
  ): Promise<ServiceResult<DeleteContractResult>> {
    try {
      const existingContract =
        await this.contractRepository.findByIdOrNull(contractId);

      if (!existingContract) {
        return {
          success: false,
          error: CONTRACT_RESPONSE_MESSAGES.FAILURE.NOT_FOUND(contractId),
        };
      }

      await this.contractRepository.softDeleteContract(contractId);

      this.logger.log(CONTRACT_MESSAGES.LOG.SOFT_DELETE_SUCCESS(contractId));

      return {
        success: true,
        data: { contractId },
      };
    } catch (error) {
      this.logger.error(`Failed to delete contract ${contractId}:`, error);

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : CONTRACT_RESPONSE_MESSAGES.FAILURE.DELETE_FAILED,
      };
    }
  }

  /**
   * Restore soft deleted contract
   */
  async restore(
    contractId: string,
  ): Promise<ServiceResult<RestoreContractResult>> {
    try {
      const repository = await this.contractRepository.getRepository();
      const contract = await repository.findOne({
        where: { id: contractId },
        withDeleted: true,
      });

      if (!contract) {
        return {
          success: false,
          error: CONTRACT_RESPONSE_MESSAGES.FAILURE.NOT_FOUND(contractId),
        };
      }

      if (!contract.deletedAt) {
        return {
          success: false,
          error: CONTRACT_RESPONSE_MESSAGES.FAILURE.NOT_DELETED,
        };
      }

      await repository.update(contractId, {
        deletedAt: null,
      } as never);

      this.logger.log(`Restored contract: ${contractId}`);

      return {
        success: true,
        data: {
          contractId,
          status: contract.status as MKT_CONTRACT_STATUS,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to restore contract ${contractId}:`, error);

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : CONTRACT_RESPONSE_MESSAGES.FAILURE.RESTORE_FAILED,
      };
    }
  }

  // ============================================================================
  // GRAPHQL QUERY OPERATIONS
  // ============================================================================

  /**
   * Find contract by ID with hierarchical filtering
   */
  async findByIdWithFilter(
    contractId: string,
    options?: ContractQueryOptions,
  ): Promise<MktContractWorkspaceEntity | null> {
    const whereClause = this.buildWhereClause({ id: contractId }, options);

    return this.contractRepository.findOneWithWhere(whereClause);
  }

  /**
   * Find contract by number with hierarchical filtering
   */
  async findByNumberWithFilter(
    contractNumber: string,
    options?: ContractQueryOptions,
  ): Promise<MktContractWorkspaceEntity | null> {
    const whereClause = this.buildWhereClause({ contractNumber }, options);

    return this.contractRepository.findOneWithWhere(whereClause);
  }

  /**
   * Find contracts by customer with hierarchical filtering
   */
  async findByCustomerWithFilter(
    customerId: string,
    options?: ContractQueryOptions,
  ): Promise<MktContractWorkspaceEntity[]> {
    const whereClause = this.buildWhereClause({ customerId }, options);

    return this.contractRepository.findManyWithWhere(whereClause);
  }

  /**
   * Find contracts by status with hierarchical filtering
   */
  async findByStatusWithFilter(
    status: MKT_CONTRACT_STATUS,
    options?: ContractQueryOptions,
  ): Promise<MktContractWorkspaceEntity[]> {
    const whereClause = this.buildWhereClause({ status }, options);

    return this.contractRepository.findManyWithWhere(whereClause);
  }

  /**
   * Find all contracts with pagination and hierarchical filtering
   */
  async findAllWithFilter(
    options?: ContractQueryOptions,
  ): Promise<MktContractWorkspaceEntity[]> {
    const whereClause = this.buildWhereClause({}, options);

    return this.contractRepository.findManyWithWhere(whereClause, {
      take: options?.take ?? 50,
      skip: options?.skip ?? 0,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get status distribution statistics
   */
  async getStatusDistribution(): Promise<{
    distribution: StatusDistributionItem[];
    totalCount: number;
  }> {
    const distribution = await this.contractRepository.getStatusDistribution();
    const totalCount = distribution.reduce((sum, item) => sum + item.count, 0);

    return { distribution, totalCount };
  }

  /**
   * Get customer contract statistics
   */
  async getCustomerStats(customerId: string): Promise<CustomerContractStats> {
    const contracts =
      await this.contractRepository.findByCustomerId(customerId);

    const activeCount = contracts.filter(
      (c) => c.status === MKT_CONTRACT_STATUS.ACTIVE,
    ).length;

    const expiredCount = contracts.filter(
      (c) => c.status === MKT_CONTRACT_STATUS.EXPIRED,
    ).length;

    const sortedByDate = [...contracts].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      return dateA - dateB;
    });

    const firstContract = sortedByDate[0];
    const lastContract = sortedByDate[sortedByDate.length - 1];

    return {
      contractCount: contracts.length,
      activeCount,
      expiredCount,
      firstContractDate: firstContract?.createdAt?.toString(),
      lastContractDate: lastContract?.createdAt?.toString(),
    };
  }

  /**
   * Find expiring contracts within date range
   */
  async findExpiringInRange(
    startDate: string,
    endDate: string,
  ): Promise<MktContractWorkspaceEntity[]> {
    const start = DateTimeUtils.fromISO(startDate).toJSDate();
    const end = DateTimeUtils.fromISO(endDate).toJSDate();

    return this.contractRepository.findExpiringContracts(start, end);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Build update data from input, filtering undefined values
   */
  private buildUpdateData(
    input: UpdateContractServiceInput,
  ): UpdateContractData {
    const updateData: UpdateContractData = {};

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.contractNumber !== undefined) {
      updateData.contractNumber = input.contractNumber;
    }

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    if (input.contractType !== undefined) {
      updateData.contractType = input.contractType;
    }

    if (input.startDate !== undefined) {
      updateData.startDate = input.startDate
        ? DateTimeUtils.fromISO(input.startDate).toJSDate()
        : undefined;
    }

    if (input.endDate !== undefined) {
      updateData.endDate = input.endDate
        ? DateTimeUtils.fromISO(input.endDate).toJSDate()
        : undefined;
    }

    if (input.signedDate !== undefined) {
      updateData.signedDate = input.signedDate
        ? DateTimeUtils.fromISO(input.signedDate).toJSDate()
        : null;
    }

    if (input.filePath !== undefined) {
      updateData.filePath = input.filePath;
    }

    if (input.fileName !== undefined) {
      updateData.fileName = input.fileName;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.customerId !== undefined) {
      updateData.customerId = input.customerId;
    }

    if (input.accountOwnerId !== undefined) {
      updateData.accountOwnerId = input.accountOwnerId;
    }

    return updateData;
  }

  /**
   * Build where clause with hierarchical filter
   */
  private buildWhereClause(
    baseWhere: Record<string, unknown>,
    options?: ContractQueryOptions,
  ): Record<string, unknown> | Record<string, unknown>[] {
    // No filter or full access - return base where only
    if (!options?.filter || options.hasFullAccess) {
      return baseWhere;
    }

    // Merge base where with hierarchical filter
    if (Array.isArray(options.filter)) {
      return options.filter.map((f) => ({ ...baseWhere, ...f }));
    }

    return { ...baseWhere, ...options.filter };
  }
}
