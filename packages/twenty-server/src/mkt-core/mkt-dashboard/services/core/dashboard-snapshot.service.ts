import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { createHash } from 'crypto';

import { DashboardSnapshotRepository } from 'src/mkt-core/mkt-dashboard/repositories/dashboard-snapshot.repository';
import { MktDashboardSnapshotWorkspaceEntity } from 'src/mkt-core/mkt-dashboard/workspace-entity/mkt-dashboard-snapshot.workspace-entity';
import { CreateSnapshotInput } from 'src/mkt-core/mkt-dashboard/dto/input/create-snapshot.input';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonStringify } from 'src/mkt-core/utils/json.util';
import { getErrorMessage } from 'src/mkt-core/utils';

const LOG_CONTEXT = 'DashboardSnapshotService';

@Injectable()
export class DashboardSnapshotService {
  private readonly logger = new Logger(LOG_CONTEXT);

  constructor(
    private readonly snapshotRepository: DashboardSnapshotRepository,
  ) {}

  async createSnapshot(
    input: CreateSnapshotInput,
    snapshotData: Record<string, unknown>,
    widgetId?: string,
  ): Promise<MktDashboardSnapshotWorkspaceEntity> {
    const checksum = this.generateChecksum(snapshotData);
    const snapshotAt =
      input.snapshotAt ?? DateTimeUtils.toISO(DateTimeUtils.now());

    try {
      const snapshot = await this.snapshotRepository.create({
        name: input.name,
        snapshotType: input.snapshotType,
        dataSource: input.dataSource,
        snapshotAt,
        snapshotData,
        checksum,
        widgetId,
      });

      this.logger.log('Snapshot created', {
        snapshotId: snapshot.id,
        type: input.snapshotType,
        checksum,
      });

      return snapshot;
    } catch (error) {
      this.logger.error('Failed to create snapshot', {
        error: getErrorMessage(error),
        input: { name: input.name, type: input.snapshotType },
      });
      throw error;
    }
  }

  async getSnapshotById(
    snapshotId: string,
  ): Promise<MktDashboardSnapshotWorkspaceEntity> {
    const snapshot = await this.snapshotRepository.findById(snapshotId);

    if (!snapshot) {
      throw new NotFoundException(`Snapshot not found: ${snapshotId}`);
    }

    return snapshot;
  }

  async getSnapshotsByWidget(
    widgetId: string,
  ): Promise<MktDashboardSnapshotWorkspaceEntity[]> {
    return this.snapshotRepository.findByWidgetId(widgetId);
  }

  async getSnapshotsByType(
    snapshotType: string,
  ): Promise<MktDashboardSnapshotWorkspaceEntity[]> {
    return this.snapshotRepository.findByType(snapshotType);
  }

  async getLatestByType(
    snapshotType: string,
  ): Promise<MktDashboardSnapshotWorkspaceEntity | null> {
    return this.snapshotRepository.findLatestByType(snapshotType);
  }

  async deleteSnapshotsBefore(
    snapshotType: string,
    beforeDate: string,
  ): Promise<number> {
    const deleted = await this.snapshotRepository.deleteSnapshotsBefore(
      snapshotType,
      beforeDate,
    );

    this.logger.log('Snapshots cleaned up', {
      type: snapshotType,
      beforeDate,
      deletedCount: deleted,
    });

    return deleted;
  }

  /**
   * Verify snapshot data integrity using SHA-256 checksum
   */
  verifyChecksum(snapshot: MktDashboardSnapshotWorkspaceEntity): boolean {
    if (!snapshot.checksum || !snapshot.snapshotData) {
      return false;
    }

    const calculatedChecksum = this.generateChecksum(
      snapshot.snapshotData as Record<string, unknown>,
    );

    const isValid = snapshot.checksum === calculatedChecksum;

    if (!isValid) {
      this.logger.warn('Snapshot checksum mismatch', {
        snapshotId: snapshot.id,
        expected: snapshot.checksum,
        calculated: calculatedChecksum,
      });
    }

    return isValid;
  }

  private generateChecksum(data: Record<string, unknown>): string {
    const dataStr = safeJsonStringify(data) ?? '';

    return createHash('sha256').update(dataStr).digest('hex').substring(0, 16);
  }
}
