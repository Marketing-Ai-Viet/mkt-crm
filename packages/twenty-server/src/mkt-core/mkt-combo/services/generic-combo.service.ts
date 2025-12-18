import { Injectable, Logger } from '@nestjs/common';

import { MktSupportedLanguage } from 'src/mkt-core/mkt-product-integration/types';
import { MktGenericComboRepository } from 'src/mkt-core/mkt-combo/repositories/mkt-generic-combo.repository';
import { MktGenericComboItemRepository } from 'src/mkt-core/mkt-combo/repositories/mkt-generic-combo-item.repository';
import { MktGenericComboWorkspaceEntity } from 'src/mkt-core/mkt-combo/objects/mkt-generic-combo.workspace-entity';
import {
  GenericComboWithItems,
  CreateGenericComboData,
  UpdateGenericComboData,
  CreateGenericComboItemData,
  PaginatedGenericComboResult,
  GenericComboFilter,
  GenericComboCalculationResult,
  GenericComboSnapshot,
} from 'src/mkt-core/mkt-combo/types/generic-combo.types';
import { GenericComboValidationResult } from 'src/mkt-core/mkt-combo/services/generic-combo-validation.service';
import {
  GenericComboNotFoundError,
  GenericComboValidationException,
} from 'src/mkt-core/mkt-combo/errors/generic-combo.errors';
import { GENERIC_COMBO_LOG_CONTEXT } from 'src/mkt-core/mkt-combo/constants/generic-combo.constants';

import { GenericComboCalculationService } from './generic-combo-calculation.service';
import { GenericComboValidationService } from './generic-combo-validation.service';
import { GenericComboSnapshotService } from './generic-combo-snapshot.service';
import { GenericComboCacheService } from './generic-combo-cache.service';

/**
 * GenericComboService - Facade service cho Generic Combo
 *
 * Orchestrate các services con:
 * - Repository: Data access
 * - CalculationService: Tính giá (hỗ trợ nhiều item types)
 * - ValidationService: Validation
 * - SnapshotService: Tạo snapshot
 * - CacheService: Caching
 */
@Injectable()
export class GenericComboService {
  private readonly logger = new Logger(GENERIC_COMBO_LOG_CONTEXT);

  constructor(
    private readonly comboRepository: MktGenericComboRepository,
    private readonly itemRepository: MktGenericComboItemRepository,
    private readonly calculationService: GenericComboCalculationService,
    private readonly validationService: GenericComboValidationService,
    private readonly snapshotService: GenericComboSnapshotService,
    private readonly cacheService: GenericComboCacheService,
  ) {}

  // ============================================
  // READ OPERATIONS
  // ============================================

  /**
   * Lấy combo theo ID với items
   */
  async getComboById(
    workspaceId: string,
    comboId: string,
  ): Promise<GenericComboWithItems | null> {
    return this.comboRepository.findByIdWithItems(workspaceId, comboId);
  }

  /**
   * Lấy combo theo code với items
   */
  async getComboByCode(
    workspaceId: string,
    comboCode: string,
  ): Promise<GenericComboWithItems | null> {
    // Check cache first
    const cachedId = await this.cacheService.getComboIdByCode(
      workspaceId,
      comboCode,
    );

    if (cachedId) {
      return this.comboRepository.findByIdWithItems(workspaceId, cachedId);
    }

    // Fetch from DB
    const result = await this.comboRepository.findActiveByCode(
      workspaceId,
      comboCode,
    );

    if (result) {
      // Cache code mapping
      await this.cacheService.setCodeMapping(
        workspaceId,
        comboCode,
        result.combo.id,
      );
    }

    return result;
  }

  /**
   * Lấy danh sách combos với phân trang
   */
  async getCombosPaginated(
    workspaceId: string,
    options: { limit: number; offset: number },
    filter?: GenericComboFilter,
  ): Promise<PaginatedGenericComboResult<MktGenericComboWorkspaceEntity>> {
    return this.comboRepository.findAllActivePaginated(
      workspaceId,
      options,
      filter,
    );
  }

  // ============================================
  // WRITE OPERATIONS
  // ============================================

  /**
   * Tạo combo mới
   */
  async createCombo(
    workspaceId: string,
    data: CreateGenericComboData,
  ): Promise<MktGenericComboWorkspaceEntity> {
    // Validate dữ liệu
    const validation = await this.validationService.validateCreateData(
      workspaceId,
      data,
    );

    if (!validation.valid) {
      throw new GenericComboValidationException(
        `Invalid combo data: ${validation.errors.map((e) => e.message).join(', ')}`,
        validation.errors,
      );
    }

    // Tạo combo
    const combo = await this.comboRepository.create(workspaceId, data);

    this.logger.log(`Created generic combo ${combo.id} (${combo.comboCode})`);

    return combo;
  }

  /**
   * Cập nhật combo
   */
  async updateCombo(
    workspaceId: string,
    comboId: string,
    data: UpdateGenericComboData,
  ): Promise<MktGenericComboWorkspaceEntity> {
    const existing = await this.comboRepository.findById(workspaceId, comboId);

    if (!existing) {
      throw new GenericComboNotFoundError(comboId);
    }

    const updated = await this.comboRepository.update(
      workspaceId,
      comboId,
      data,
    );

    if (!updated) {
      throw new GenericComboNotFoundError(comboId);
    }

    // Invalidate cache
    await this.cacheService.invalidateCombo(workspaceId, comboId);

    if (existing.comboCode) {
      await this.cacheService.invalidateCodeMapping(
        workspaceId,
        existing.comboCode,
      );
    }

    this.logger.log(`Updated generic combo ${comboId}`);

    return updated;
  }

  /**
   * Xóa combo (soft delete)
   */
  async deleteCombo(workspaceId: string, comboId: string): Promise<void> {
    const existing = await this.comboRepository.findById(workspaceId, comboId);

    if (!existing) {
      throw new GenericComboNotFoundError(comboId);
    }

    await this.comboRepository.softDelete(workspaceId, comboId);

    // Invalidate cache
    await this.cacheService.invalidateCombo(workspaceId, comboId);

    if (existing.comboCode) {
      await this.cacheService.invalidateCodeMapping(
        workspaceId,
        existing.comboCode,
      );
    }

    this.logger.log(`Deleted generic combo ${comboId}`);
  }

  // ============================================
  // ITEM OPERATIONS
  // ============================================

  /**
   * Thêm items vào combo
   */
  async addItemsToCombo(
    workspaceId: string,
    comboId: string,
    items: CreateGenericComboItemData[],
  ): Promise<void> {
    const existing = await this.comboRepository.findById(workspaceId, comboId);

    if (!existing) {
      throw new GenericComboNotFoundError(comboId);
    }

    await this.itemRepository.createMany(workspaceId, comboId, items);

    // Invalidate cache
    await this.cacheService.invalidateCombo(workspaceId, comboId);

    this.logger.log(`Added ${items.length} items to combo ${comboId}`);
  }

  /**
   * Xóa item khỏi combo
   */
  async removeItemFromCombo(
    workspaceId: string,
    comboId: string,
    itemId: string,
  ): Promise<void> {
    await this.itemRepository.delete(workspaceId, itemId);

    // Invalidate cache
    await this.cacheService.invalidateCombo(workspaceId, comboId);

    this.logger.log(`Removed item ${itemId} from combo ${comboId}`);
  }

  // ============================================
  // CALCULATION & VALIDATION
  // ============================================

  /**
   * Tính giá combo với caching
   */
  async calculateComboPrice(
    workspaceId: string,
    comboId: string,
    language: MktSupportedLanguage = 'vi',
  ): Promise<GenericComboCalculationResult> {
    // Check cache first
    const cached = await this.cacheService.getCalculation(workspaceId, comboId);

    if (cached) {
      return cached;
    }

    // Lấy combo với items
    const comboWithItems = await this.comboRepository.findByIdWithItems(
      workspaceId,
      comboId,
    );

    if (!comboWithItems) {
      throw new GenericComboNotFoundError(comboId);
    }

    const { combo, items } = comboWithItems;

    // Tính giá
    const result = await this.calculationService.calculateComboPrice(
      workspaceId,
      combo,
      items,
      language,
    );

    // Cache result
    await this.cacheService.setCalculation(workspaceId, comboId, result);

    return result;
  }

  /**
   * Validate combo cho order
   */
  async validateForOrder(
    workspaceId: string,
    comboId: string,
  ): Promise<GenericComboValidationResult> {
    return this.validationService.validateForOrder(workspaceId, comboId);
  }

  // ============================================
  // SNAPSHOT
  // ============================================

  /**
   * Tạo snapshot cho combo (dùng khi tạo order)
   */
  async createComboSnapshot(
    workspaceId: string,
    comboId: string,
    language: MktSupportedLanguage = 'vi',
  ): Promise<GenericComboSnapshot> {
    // Validate trước
    const validation = await this.validateForOrder(workspaceId, comboId);

    if (!validation.valid) {
      throw new GenericComboValidationException(
        `Combo is not valid for order: ${validation.errors.map((e) => e.message).join(', ')}`,
        validation.errors,
      );
    }

    // Safe access sau khi validate passed
    if (!validation.combo) {
      throw new GenericComboNotFoundError(comboId);
    }

    const { combo, items } = validation.combo;

    // Tính giá
    const calculationResult = await this.calculationService.calculateComboPrice(
      workspaceId,
      combo,
      items,
      language,
    );

    // Tạo snapshot
    const snapshot = await this.snapshotService.createComboSnapshot(
      combo,
      items,
      calculationResult,
      language,
    );

    return snapshot;
  }

  /**
   * Verify checksum của snapshot
   */
  verifySnapshot(snapshot: GenericComboSnapshot): boolean {
    return this.snapshotService.verifyChecksum(snapshot);
  }
}
