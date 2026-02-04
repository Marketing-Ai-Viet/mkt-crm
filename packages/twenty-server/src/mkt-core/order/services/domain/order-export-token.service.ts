import { Injectable, Logger } from '@nestjs/common';

import * as crypto from 'crypto';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import { ExportFormatEnum } from 'src/mkt-core/order/dto/order-export.dto';

// ============================================
// CONSTANTS
// ============================================

const EXPORT_TOKEN_LOG_CONTEXT = 'OrderExportToken';

/**
 * Cấu hình cho export token
 */
export const EXPORT_TOKEN_CONFIG = {
  /** Thời gian hết hạn token (giây) - mặc định 5 phút */
  TOKEN_TTL_SECONDS: 5 * 60,

  /** Prefix cho cache key */
  CACHE_KEY_PREFIX: 'order-export-token',
} as const;

/**
 * Input type cho token - hỗ trợ cả filter và IDs
 */
export type ExportTokenInput = {
  // Filter-based export
  customerId?: string;
  salesStaffId?: string;
  // IDs-based export
  orderIds?: string[];
  // Common
  format?: ExportFormatEnum;
};

/**
 * Data được lưu trong token
 */
export type ExportTokenData = {
  workspaceId: string;
  userId: string;
  input?: ExportTokenInput;
  createdAt: number;
};

// ============================================
// SERVICE
// ============================================

/**
 * OrderExportTokenService - Quản lý short-lived tokens cho export
 *
 * Flow:
 * 1. GraphQL mutation gọi generateToken() → trả về token
 * 2. Frontend redirect đến REST endpoint với token
 * 3. REST endpoint gọi validateAndConsumeToken() → lấy export params
 * 4. Token bị xóa sau khi sử dụng (one-time use)
 */
@Injectable()
export class OrderExportTokenService {
  private readonly logger = new Logger(EXPORT_TOKEN_LOG_CONTEXT);

  constructor(
    @InjectCacheStorage(CacheStorageNamespace.ModuleMessaging)
    private readonly cacheStorage: CacheStorageService,
  ) {}

  /**
   * Generate token cho export request
   *
   * @param workspaceId - Workspace ID
   * @param userId - User ID
   * @param input - Export input params (filter hoặc IDs)
   * @returns Generated token
   */
  async generateToken(
    workspaceId: string,
    userId: string,
    input?: ExportTokenInput,
  ): Promise<string> {
    // Generate random token
    const token = crypto.randomBytes(32).toString('hex');

    // Data để lưu
    const tokenData: ExportTokenData = {
      workspaceId,
      userId,
      input,
      createdAt: Date.now(),
    };

    // Lưu vào cache với TTL
    const cacheKey = this.getCacheKey(token);

    await this.cacheStorage.set(
      cacheKey,
      tokenData,
      EXPORT_TOKEN_CONFIG.TOKEN_TTL_SECONDS * 1000, // Convert to ms
    );

    this.logger.log(
      `Generated export token for user ${userId}, workspace ${workspaceId}`,
    );

    return token;
  }

  /**
   * Validate và consume token (one-time use)
   *
   * @param token - Token để validate
   * @returns Token data nếu valid, null nếu không
   */
  async validateAndConsumeToken(
    token: string,
  ): Promise<ExportTokenData | null> {
    const cacheKey = this.getCacheKey(token);

    // Get token data
    const tokenData = await this.cacheStorage.get<ExportTokenData>(cacheKey);

    if (!tokenData) {
      this.logger.warn(
        `Invalid or expired export token: ${token.slice(0, 8)}...`,
      );

      return null;
    }

    // Delete token (one-time use)
    await this.cacheStorage.del(cacheKey);

    this.logger.log(
      `Consumed export token for user ${tokenData.userId}, workspace ${tokenData.workspaceId}`,
    );

    return tokenData;
  }

  /**
   * Get cache key cho token
   */
  private getCacheKey(token: string): string {
    return `${EXPORT_TOKEN_CONFIG.CACHE_KEY_PREFIX}:${token}`;
  }
}
