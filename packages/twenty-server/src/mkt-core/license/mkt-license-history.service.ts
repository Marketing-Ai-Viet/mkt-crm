import { Injectable, Logger } from '@nestjs/common';

import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { FieldActorSource } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { Metadata } from 'src/mkt-core/license/hooks/mkt-license-update-one.pre-query.hook';
import { MKT_LICENSE_STATUS } from 'src/mkt-core/license/license.constants';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { MktLicenseHistoryWorkspaceEntity } from 'src/mkt-core/license/objects/mkt-license-history.workspace-entity';

export type HistoryItem = {
  name: string;
  action: string;
  note: string;
  createdByName?: string;
  createdAt?: Date;
};

@Injectable()
export class MktLicenseHistoryService {
  private readonly logger = new Logger(MktLicenseHistoryService.name);
  private createdByName: string | null;
  private createdAt: string | null;
  private note: string | undefined | null;
  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  /**
   * Check and record variant changes from metadata
   */
  async checkAndRecordVariantChanges(
    authContext: AuthContext,
    license: MktLicenseWorkspaceEntity,
    newMetadata: Metadata | string,
  ): Promise<MktLicenseHistoryWorkspaceEntity | null | undefined> {
    try {
      // Parse metadata if it's a string
      let parsedMetadata: Metadata;

      if (typeof newMetadata === 'string') {
        parsedMetadata = JSON.parse(newMetadata) as Metadata;
      } else {
        parsedMetadata = newMetadata;
      }

      // Get current variant ID from license
      const currentVariantId = license?.mktVariantId;

      if (!parsedMetadata.variants) {
        return;
      }

      const newVariant = parsedMetadata.variants[0];

      if (!newVariant || !currentVariantId) {
        return;
      }

      // Check if variant changed
      if (currentVariantId !== newVariant.mktVariantId) {
        // Create custom history entry for variant change
        return await this.addHistoryEntryFromLicense(
          authContext,
          license,
          'VARIANT_CHANGED',
        );
      }
    } catch (error) {
      this.logger.error('Failed to check variant changes:', {
        error: error.message,
        licenseId: license.id,
      });
    }
  }

  /**
   * Add history entry for license update
   */
  async addHistoryEntryFromLicense(
    authContext: AuthContext,
    license: MktLicenseWorkspaceEntity,
    status?: string,
    note?: string | undefined,
  ): Promise<MktLicenseHistoryWorkspaceEntity | null | undefined> {
    this.note = note;
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) return null;

    try {
      const licenseRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktLicenseWorkspaceEntity>(
          workspaceId,
          'mktLicense',
          { shouldBypassPermissionChecks: true },
        );

      const licenseHistoryRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktLicenseHistoryWorkspaceEntity>(
          workspaceId,
          'mktLicenseHistory',
          { shouldBypassPermissionChecks: true },
        );

      // Get current history
      const currentHistory = this.getLicenseHistory(license);

      // Create history item based on the status or changes
      const historyItem = {
        ...(await this.createHistoryItemFromUpdate(authContext, status)),
        createdByName: this.createdByName || undefined,
        createdAt: this.createdAt ? new Date(this.createdAt) : undefined,
        ...(this.note ? { note: this.note } : {}),
      };

      if (historyItem) {
        const updatedHistory = [historyItem, ...currentHistory];

        // 1. Update the license with new history (JSON field)
        await licenseRepository.update(
          { id: license.id },
          {
            history: JSON.stringify(updatedHistory) as unknown as JSON,
          },
        );

        // 2. Create new record in mktLicenseHistory table
        const userName =
          authContext.user?.firstName && authContext.user?.lastName
            ? `${authContext.user.firstName} ${authContext.user.lastName}`
            : authContext.user?.email || 'Unknown User';

        const newLicenseHistory = licenseHistoryRepository.create({
          name: historyItem.name,
          action: historyItem.action,
          note: historyItem.note,
          mktLicenseId: license.id,
          position: updatedHistory.length,
          createdBy: {
            source: FieldActorSource.MANUAL,
            workspaceMemberId: authContext.workspaceMemberId || null,
            name: userName,
            context: {},
          },
        });

        // Explicitly set createdBy after create
        newLicenseHistory.createdBy = {
          source: FieldActorSource.MANUAL,
          workspaceMemberId: authContext.workspaceMemberId || null,
          name: userName,
          context: {},
        };

        await licenseHistoryRepository.save(newLicenseHistory);

        return newLicenseHistory;
      }
    } catch (error) {
      this.logger.error('Failed to update license history:', {
        error: error.message,
        licenseId: license.id,
      });

      return null;
    }
  }

  /**
   * Get history array from license entity
   */
  private getLicenseHistory(license: MktLicenseWorkspaceEntity): HistoryItem[] {
    if (!license?.history) {
      return [];
    }

    try {
      let historyString: string;

      if (typeof license.history === 'string') {
        historyString = license.history;
      } else {
        historyString = JSON.stringify(license.history);
      }

      const parsedHistory = JSON.parse(historyString);

      if (Array.isArray(parsedHistory)) {
        const validItems = parsedHistory.filter((item) => {
          return this.isValidHistoryItem(item);
        });

        return validItems;
      } else {
        return [];
      }
    } catch (error) {
      this.logger.warn('Failed to parse license history:', error);

      return [];
    }
  }

  /**
   * Validate if an object is a valid HistoryItem
   */
  private isValidHistoryItem(item: unknown): item is HistoryItem {
    return (
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Record<string, unknown>).name === 'string' &&
      typeof (item as Record<string, unknown>).action === 'string' &&
      typeof (item as Record<string, unknown>).note === 'string'
    );
  }

  /**
   * Create history item based on license update
   */
  async createHistoryItemFromUpdate(
    authContext: AuthContext,
    status?: string,
  ): Promise<HistoryItem | null> {
    const timestamp = new Date().toISOString();
    const userId = authContext.user?.id || 'system';
    const userName =
      authContext.user?.firstName && authContext.user?.lastName
        ? `${authContext.user.firstName} ${authContext.user.lastName}`
        : authContext.user?.email || 'Unknown User';

    this.createdByName = userName;
    this.createdAt = timestamp;
    // Create history based on status
    switch (status) {
      case MKT_LICENSE_STATUS.ACTIVE:
        return {
          name: 'Bản quyền được kích hoạt',
          action: MKT_LICENSE_STATUS.ACTIVE,
          note: 'Khách hàng đã kích hoạt thành công bản quyền',
        };

      case MKT_LICENSE_STATUS.RENEWING:
        return {
          name: 'Cập nhật thông tin bản quyền',
          action: MKT_LICENSE_STATUS.RENEWING,
          note: 'Đã cập nhật thông tin bản quyền',
        };

      case MKT_LICENSE_STATUS.EXPIRED:
        return {
          name: 'Bản quyền hết hạn',
          action: MKT_LICENSE_STATUS.EXPIRED,
          note: 'Bản quyền đã hết hạn',
        };

      case MKT_LICENSE_STATUS.REVOKED:
        return {
          name: 'Khóa bản quyền',
          action: MKT_LICENSE_STATUS.REVOKED,
          note: 'Bản quyền đã bị thu hồi',
        };

      case MKT_LICENSE_STATUS.ERROR:
        return {
          name: 'Bản quyền lỗi',
          action: MKT_LICENSE_STATUS.ERROR,
          note: 'Bản quyền đã được đánh dấu là lỗi',
        };

      case MKT_LICENSE_STATUS.CHANGE_VARIANT:
        return {
          name: 'Thay đổi sản phẩm cho bản quyền',
          action: MKT_LICENSE_STATUS.CHANGE_VARIANT,
          note: 'Bản quyền đã thay đổi sản phẩm',
        };
      case MKT_LICENSE_STATUS.REFUND:
        return {
          name: 'Bản quyền đã được hoàn tiền',
          action: MKT_LICENSE_STATUS.REFUND,
          note: 'Bản quyền đã được hoàn tiền và bị vô hiệu hóa',
        };

      default:
        // For other updates, create a generic history item
        return {
          name: `License đã được cập nhật vào lúc - ${timestamp}`,
          action: 'LICENSE_UPDATED',
          note: `License: thông tin đã được cập nhật bởi ${userName} (${userId})`,
        };
    }
  }
}
