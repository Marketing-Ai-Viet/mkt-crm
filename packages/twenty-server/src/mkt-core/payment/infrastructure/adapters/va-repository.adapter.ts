/**
 * VA Repository Adapter
 *
 * Implements IVARepositoryPort by wrapping MktVirtualAccountRepository.
 */

import { Injectable } from '@nestjs/common';

import { MktVirtualAccountRepository } from 'src/mkt-core/payment/repositories';
import {
  IVARepositoryPort,
  VAForMatching,
  CreateVAData,
} from 'src/mkt-core/payment/domain/ports';

@Injectable()
export class VARepositoryAdapter implements IVARepositoryPort {
  constructor(private readonly vaRepository: MktVirtualAccountRepository) {}

  /**
   * Find VA by VA number
   */
  async findByVANumber(vaNumber: string): Promise<VAForMatching | null> {
    return this.vaRepository.findByVANumberForMatching(vaNumber);
  }

  /**
   * Find VA by order ID
   */
  async findByOrderId(orderId: string): Promise<VAForMatching | null> {
    return this.vaRepository.findByOrderIdForMatching(orderId);
  }

  /**
   * Find active VA by order ID
   */
  async findActiveByOrderId(orderId: string): Promise<VAForMatching | null> {
    return this.vaRepository.findActiveByOrderIdForMatching(orderId);
  }

  /**
   * Save new VA
   */
  async save(data: CreateVAData): Promise<VAForMatching> {
    return this.vaRepository.saveForMatching(data);
  }

  /**
   * Deactivate VA
   */
  async deactivate(id: string): Promise<void> {
    return this.vaRepository.deactivate(id);
  }
}
