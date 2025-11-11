import { Injectable, Logger } from '@nestjs/common';

import { FieldActorSource } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { MktContractWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-contract.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';

export type CreateContractData = {
  name: string;
  contractNumber: string;
  orderId: string;
  startDate?: string;
  endDate?: string;
  createdBy?: string;
  workspaceId: string;
};

@Injectable()
export class MktContractService {
  private readonly logger = new Logger(MktContractService.name);

  constructor(private readonly mktRepo: MktRepositoryService) {}

  /**
   * Generate unique contract number
   */
  async generateContractNumber(workspaceId: string): Promise<string> {
    try {
      const contractRepository = await this.getContractRepo(workspaceId);

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const datePrefix = `${year}${month}${day}`;

      // Find the highest contract number for today
      const todayContracts = await contractRepository
        .createQueryBuilder('contract')
        .where('contract.contractNumber LIKE :pattern', {
          pattern: `CT${datePrefix}%`,
        })
        .orderBy('contract.contractNumber', 'DESC')
        .limit(1)
        .getOne();

      let nextNumber = 1;

      if (todayContracts?.contractNumber) {
        // Extract number from existing contract code (e.g., CT20241201001 -> 1)
        const match = todayContracts.contractNumber.match(/CT\d{8}(\d{3})$/);

        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      // Generate new contract code: CT + YYYYMMDD + 3-digit number
      const contractNumber = `CT${datePrefix}${String(nextNumber).padStart(3, '0')}`;

      // Double-check uniqueness
      const existingContract = await contractRepository.findOne({
        where: { contractNumber },
      });

      if (existingContract) {
        // If somehow duplicate, try with timestamp
        const timestamp = Date.now().toString().slice(-6);

        return `CT${datePrefix}${timestamp}`;
      }

      this.logger.log(`Generated contract number: ${contractNumber}`);

      return contractNumber;
    } catch (error) {
      this.logger.error('Failed to generate contract number:', error);

      throw new Error('Failed to generate contract number');
    }
  }

  /**
   * Create contract for order
   */
  async createContractForOrder(
    order: MktOrderWorkspaceEntity,
    workspaceId: string,
    mktCustomerId: string | null,
    generatedOrderCode: string | null,
  ): Promise<MktContractWorkspaceEntity> {
    try {
      this.logger.log(`Creating contract for order: ${order.id}`);

      const contractRepository = await this.getContractRepo(workspaceId);

      // Generate contract data
      const contractNumber = await this.generateContractNumber(workspaceId);

      const contractName = await this.generateContractName(
        order,
        mktCustomerId,
        generatedOrderCode,
      );

      const startDate = new Date().toISOString();

      // Default contract duration: 1 year from now
      const endDate = new Date();

      endDate.setFullYear(endDate.getFullYear() + 1);

      // Create the contract entity
      const contract = contractRepository.create({
        name: contractName,
        contractNumber,
        startDate: startDate,
        endDate: endDate.toISOString(),
      });

      // Set the createdBy field
      contract.createdBy = order.createdBy || {
        source: FieldActorSource.SYSTEM,
        workspaceMemberId: null,
        name: 'System',
      };

      // Save the contract
      const savedContract = await contractRepository.save(contract);

      this.logger.log(
        `Successfully created contract ${contractNumber} for order ${order.id}`,
      );

      return savedContract;
    } catch (error) {
      this.logger.error(
        `Failed to create contract for order ${order.id}:`,
        error,
      );

      throw new Error('Failed to create contract for order');
    }
  } /**
   * Link contract to order
   */

  async linkContractToOrder(
    contractId: string,
    orderId: string,
    workspaceId: string,
  ): Promise<void> {
    try {
      this.logger.log(`Linking contract ${contractId} to order ${orderId}`);

      const orderRepository =
        await this.mktRepo.getOrderRepositoryByWorkspaceId(workspaceId);

      await orderRepository.update(orderId, {
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
   */
  private async generateContractName(
    order: MktOrderWorkspaceEntity,
    mktCustomerId: string | null,
    orderCode: string | null,
  ): Promise<string> {
    try {
      const mktCustomerRepo = await this.mktRepo.getRepository(
        MktCustomerWorkspaceEntity,
      );
      let customerName = 'Unknown Customer';

      if (mktCustomerId) {
        const customer = await mktCustomerRepo.findOne({
          where: { id: mktCustomerId },
        });

        if (customer?.name) customerName = customer.name;
      }

      return `Hợp đồng ${orderCode} - ${customerName}`;
    } catch (error) {
      this.logger.error('Failed to generate contract name:', error);

      return `Hợp đồng ${new Date().toLocaleDateString('vi-VN')}`;
    }
  }

  /**
   * Update contract information
   */
  async updateContract(
    contractId: string,
    updateData: Partial<MktContractWorkspaceEntity>,
    workspaceId: string,
  ): Promise<void> {
    try {
      this.logger.log(`Updating contract ${contractId}`);

      const contractRepository = await this.getContractRepo(workspaceId);

      await contractRepository.update(contractId, updateData);

      this.logger.log(`Successfully updated contract ${contractId}`);
    } catch (error) {
      this.logger.error(`Failed to update contract ${contractId}:`, error);

      throw new Error('Failed to update contract');
    }
  }

  /**
   * Find contract by ID
   */
  async findContractById(
    contractId: string,
    workspaceId: string,
  ): Promise<MktContractWorkspaceEntity | null> {
    try {
      const contractRepository = await this.getContractRepo(workspaceId);

      return await contractRepository.findOne({
        where: { id: contractId },
        relations: ['mktOrders'],
      });
    } catch (error) {
      this.logger.error(`Failed to find contract ${contractId}:`, error);

      return null;
    }
  }

  /**
   * Get contract repository with workspace context
   */
  private async getContractRepo(workspaceId: string) {
    if (!workspaceId) return this.mktRepo.getContractRepository();

    return this.mktRepo.getContractRepositoryByWorkspaceId(workspaceId);
  }
}
