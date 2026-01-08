import { Injectable } from '@nestjs/common';

import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * Service để tạo mã customer code tự động
 * Pattern: CUS-YYYY-NNNNNN (VD: CUS-2025-000001)
 * hoặc đơn giản: CUST001, CUST002, ...
 */
@Injectable()
export class MktCustomerCodeGenerationService {
  constructor(private readonly customerRepository: MktCustomerRepository) {}

  /**
   * Tạo customer code tự động dựa trên năm hiện tại và số thứ tự
   * Format: CUS-YYYY-NNNNNN (VD: CUS-2025-000001)
   */
  async generateCustomerCodeWithYear(): Promise<string> {
    const repository = await this.customerRepository.getRepository();

    const now = DateTimeUtils.now();
    const currentYear = now.year;
    const prefix = `CUS-${currentYear}-`;

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

    // Format: CUS-YYYY-NNNNNN (pad 6 digits)
    return `${prefix}${nextSequence.toString().padStart(6, '0')}`;
  }

  /**
   * Tạo customer code đơn giản
   * Format: CUSTNNN (VD: CUST001, CUST002)
   */
  async generateSimpleCustomerCode(): Promise<string> {
    const repository = await this.customerRepository.getRepository();

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
    sequenceLength = 3,
  ): Promise<string> {
    const repository = await this.customerRepository.getRepository();

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
    return this.customerRepository.isCodeExists(customerCode);
  }

  /**
   * Tạo customer code duy nhất (đảm bảo không trùng)
   * Retry nếu code bị trùng
   */
  async generateUniqueCustomerCode(useYearPrefix = true): Promise<string> {
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
