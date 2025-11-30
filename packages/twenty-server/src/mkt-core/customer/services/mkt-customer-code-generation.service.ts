import { Injectable } from '@nestjs/common';

import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';

/**
 * Service để tạo mã customer code tự động
 * Pattern: CUSTYYYYNNN (VD: CUST2025001, CUST2025002, ...)
 * hoặc đơn giản: CUST001, CUST002, ...
 */
@Injectable()
export class MktCustomerCodeGenerationService {
  constructor(private readonly mktRepo: MktRepositoryService) {}

  /**
   * Tạo customer code tự động dựa trên năm hiện tại và số thứ tự
   * Format: CUSTYYYYNNN (VD: CUST2025001)
   */
  async generateCustomerCodeWithYear(): Promise<string> {
    const repository = await this.mktRepo.getCustomerRepository();

    const currentYear = new Date().getFullYear();
    const prefix = `CUST${currentYear}`;

    // Tìm customer code lớn nhất có prefix này
    const lastCustomer = await repository
      .createQueryBuilder('customer')
      .where('customer.mktCustomerCode LIKE :prefix', {
        prefix: `${prefix}%`,
      })
      .orderBy('customer.mktCustomerCode', 'DESC')
      .getOne();

    let nextSequence = 1;

    if (lastCustomer?.mktCustomerCode) {
      // Extract số sequence từ code cuối cùng
      const lastSequence = parseInt(
        lastCustomer.mktCustomerCode.replace(prefix, ''),
        10,
      );

      if (!isNaN(lastSequence)) {
        nextSequence = lastSequence + 1;
      }
    }

    // Format: CUSTYYYYNNN (pad 3 digits)
    return `${prefix}${nextSequence.toString().padStart(3, '0')}`;
  }

  /**
   * Tạo customer code đơn giản
   * Format: CUSTNNN (VD: CUST001, CUST002)
   */
  async generateSimpleCustomerCode(): Promise<string> {
    const repository = await this.mktRepo.getCustomerRepository();

    const prefix = 'CUST';

    // Tìm customer code lớn nhất
    const lastCustomer = await repository
      .createQueryBuilder('customer')
      .where('customer.mktCustomerCode LIKE :prefix', {
        prefix: `${prefix}%`,
      })
      .orderBy('customer.mktCustomerCode', 'DESC')
      .getOne();

    let nextSequence = 1;

    if (lastCustomer?.mktCustomerCode) {
      // Extract số sequence từ code cuối cùng
      const lastSequence = parseInt(
        lastCustomer.mktCustomerCode.replace(prefix, ''),
      );

      if (!isNaN(lastSequence)) {
        nextSequence = lastSequence + 1;
      }
    }

    // Format: CUSTNNN (pad 3 digits)
    return `${prefix}${nextSequence.toString().padStart(3, '0')}`;
  }

  /**
   * Tạo customer code tùy chỉnh với prefix riêng
   * @param customPrefix - Prefix tùy chỉnh (VD: "VIP", "CORP", ...)
   * @param sequenceLength - Độ dài số sequence (default: 3)
   */
  async generateCustomCustomerCode(
    customPrefix: string,
    sequenceLength: number = 3,
  ): Promise<string> {
    const repository = await this.mktRepo.getCustomerRepository();

    // Tìm customer code lớn nhất với prefix này
    const lastCustomer = await repository
      .createQueryBuilder('customer')
      .where('customer.mktCustomerCode LIKE :prefix', {
        prefix: `${customPrefix}%`,
      })
      .orderBy('customer.mktCustomerCode', 'DESC')
      .getOne();

    let nextSequence = 1;

    if (lastCustomer?.mktCustomerCode) {
      // Extract số sequence từ code cuối cùng
      const lastSequence = parseInt(
        lastCustomer.mktCustomerCode.replace(customPrefix, ''),
        10,
      );

      if (!isNaN(lastSequence)) {
        nextSequence = lastSequence + 1;
      }
    }

    return `${customPrefix}${nextSequence.toString().padStart(sequenceLength, '0')}`;
  }

  /**
   * Kiểm tra xem customer code đã tồn tại chưa
   */
  async isCustomerCodeExists(customerCode: string): Promise<boolean> {
    const repository = await this.mktRepo.getCustomerRepository();

    const count = await repository
      .createQueryBuilder('customer')
      .where('customer.mktCustomerCode = :customerCode', { customerCode })
      .getCount();

    return count > 0;
  }

  /**
   * Tạo customer code duy nhất (đảm bảo không trùng)
   * Retry nếu code bị trùng
   */
  async generateUniqueCustomerCode(
    useYearPrefix: boolean = true,
  ): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const code = useYearPrefix
        ? await this.generateCustomerCodeWithYear()
        : await this.generateSimpleCustomerCode();

      const exists = await this.isCustomerCodeExists(code);

      if (!exists) {
        return code;
      }

      attempts++;
    }

    throw new Error(
      'Unable to generate unique customer code after multiple attempts',
    );
  }
}
