import { Injectable, Logger } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';

export interface CustomerExportFilter {
  status?: string;
  tier?: string;
  type?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface CustomerExportData {
  data: string;
  fileName: string;
  generatedAt: string;
  totalRecords: number;
  workspaceId?: string;
}

@Injectable()
export class MktCustomerExportService {
  private readonly logger = new Logger(MktCustomerExportService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  /**
   * Escape CSV field value
   */
  private escapeCsvValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);

    // If the value contains comma, quote, or newline, wrap it in quotes and escape quotes
    if (
      stringValue.includes(',') ||
      stringValue.includes('"') ||
      stringValue.includes('\n') ||
      stringValue.includes('\r')
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  /**
   * Convert array of objects to CSV string
   */
  private convertToCSV(
    data: Record<string, string | number>[],
    fields: string[],
  ): string {
    if (data.length === 0) {
      return fields.join(',') + '\n';
    }

    const header = fields.join(',');
    const rows = data.map((row) =>
      fields
        .map((field) => this.escapeCsvValue(row[field as keyof typeof row]))
        .join(','),
    );

    return [header, ...rows].join('\n');
  }

  async exportCustomersToCsv(
    workspaceId: string,
    filters?: CustomerExportFilter,
  ): Promise<CustomerExportData> {
    this.logger.log(
      `Starting customer CSV export for workspace: ${workspaceId}`,
    );

    try {
      await this.scopedWorkspaceContextFactory.create();

      const customerRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktCustomerWorkspaceEntity>(
          workspaceId,
          'mktCustomer',
          { shouldBypassPermissionChecks: true },
        );

      // Build query with filters
      const queryBuilder = customerRepository.createQueryBuilder('customer');

      // Apply filters
      if (filters?.status) {
        queryBuilder.andWhere('customer.status = :status', {
          status: filters.status,
        });
      }

      if (filters?.tier) {
        queryBuilder.andWhere('customer.tier = :tier', {
          tier: filters.tier,
        });
      }

      if (filters?.type) {
        queryBuilder.andWhere('customer.type = :type', {
          type: filters.type,
        });
      }

      if (filters?.fromDate) {
        queryBuilder.andWhere('customer.createdAt >= :fromDate', {
          fromDate: filters.fromDate,
        });
      }

      if (filters?.toDate) {
        queryBuilder.andWhere('customer.createdAt <= :toDate', {
          toDate: filters.toDate,
        });
      }

      // Order by created date
      queryBuilder.orderBy('customer.createdAt', 'DESC');

      // Fetch all customers
      const customers = await queryBuilder.getMany();

      this.logger.log(`Found ${customers.length} customers to export`);

      // Transform data for CSV
      const csvData = customers.map((customer) => ({
        ID: customer.id,
        'Customer Code': customer.mktCustomerCode || '',
        Name: customer.name || '',
        Email: customer.email || '',
        Phone: customer.phone || '',
        'Customer Type': customer.type || '',
        Status: customer.status || '',
        'Customer Tier': customer.tier || '',
        'Total Order Value': customer.totalOrderValue || 0,
        'Engagement Score': customer.engagementScore || 0,
        Address: customer.address || '',
        'Company Name': customer.companyName || '',
        'Tax Code': customer.taxCode || '',
        Notes: customer.notes || '',
        'Created At': customer.createdAt || '',
        'Updated At': customer.updatedAt || '',
        'Deleted At': customer.deletedAt || '',
      }));

      // Generate CSV using custom implementation
      const fields = [
        'ID',
        'Customer Code',
        'Name',
        'Email',
        'Phone',
        'Customer Type',
        'Status',
        'Customer Tier',
        'Total Order Value',
        'Engagement Score',
        'Address',
        'Company Name',
        'Tax Code',
        'Notes',
        'Created At',
        'Updated At',
        'Deleted At',
      ];

      const csvContent = this.convertToCSV(csvData, fields);

      const fileName = `customers-${new Date().toISOString().split('T')[0]}.csv`;

      return {
        data: csvContent,
        fileName,
        generatedAt: new Date().toISOString(),
        totalRecords: customers.length,
        workspaceId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to export customers for workspace ${workspaceId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Export customers with pagination for very large datasets
   */
  async exportCustomersStream(
    workspaceId: string,
    filters?: CustomerExportFilter,
    batchSize = 1000,
  ): Promise<AsyncGenerator<string, void, unknown>> {
    this.logger.log(
      `Starting streaming customer CSV export for workspace: ${workspaceId}`,
    );

    await this.scopedWorkspaceContextFactory.create();

    const customerRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktCustomerWorkspaceEntity>(
        workspaceId,
        'mktCustomer',
        { shouldBypassPermissionChecks: true },
      );

    return this.streamCustomersAsCSV(customerRepository, filters, batchSize);
  }

  private async *streamCustomersAsCSV(
    repository: WorkspaceRepository<MktCustomerWorkspaceEntity>,
    filters?: CustomerExportFilter,
    batchSize = 1000,
  ): AsyncGenerator<string, void, unknown> {
    const queryBuilder = repository.createQueryBuilder('customer');

    // Apply filters
    if (filters?.status) {
      queryBuilder.andWhere('customer.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.tier) {
      queryBuilder.andWhere('customer.tier = :tier', {
        tier: filters.tier,
      });
    }

    if (filters?.type) {
      queryBuilder.andWhere('customer.type = :type', {
        type: filters.type,
      });
    }

    if (filters?.fromDate) {
      queryBuilder.andWhere('customer.createdAt >= :fromDate', {
        fromDate: filters.fromDate,
      });
    }

    if (filters?.toDate) {
      queryBuilder.andWhere('customer.createdAt <= :toDate', {
        toDate: filters.toDate,
      });
    }

    queryBuilder.orderBy('customer.createdAt', 'DESC');

    // CSV Header
    const header = [
      'ID',
      'Customer Code',
      'Name',
      'Email',
      'Phone',
      'Customer Type',
      'Status',
      'Customer Tier',
      'Total Order Value',
      'Engagement Score',
      'Address',
      'Company Name',
      'Tax Code',
      'Notes',
      'Created At',
      'Updated At',
      'Deleted At',
    ].join(',');

    yield header + '\n';

    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await queryBuilder.skip(offset).take(batchSize).getMany();

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      const csvData = batch.map((customer) => ({
        ID: customer.id,
        'Customer Code': customer.mktCustomerCode || '',
        Name: customer.name || '',
        Email: customer.email || '',
        Phone: customer.phone || '',
        'Customer Type': customer.type || '',
        Status: customer.status || '',
        'Customer Tier': customer.tier || '',
        'Total Order Value': customer.totalOrderValue || 0,
        'Engagement Score': customer.engagementScore || 0,
        Address: customer.address || '',
        'Company Name': customer.companyName || '',
        'Tax Code': customer.taxCode || '',
        Notes: customer.notes || '',
        'Created At': customer.createdAt || '',
        'Updated At': customer.updatedAt || '',
        'Deleted At': customer.deletedAt || '',
      }));

      const fields = [
        'ID',
        'Customer Code',
        'Name',
        'Email',
        'Phone',
        'Customer Type',
        'Status',
        'Customer Tier',
        'Total Order Value',
        'Engagement Score',
        'Address',
        'Company Name',
        'Tax Code',
        'Notes',
        'Created At',
        'Updated At',
        'Deleted At',
      ];

      // Generate CSV rows for this batch (without header)
      const rows = csvData.map((row) =>
        fields
          .map((field) => this.escapeCsvValue(row[field as keyof typeof row]))
          .join(','),
      );

      yield rows.join('\n') + '\n';

      offset += batchSize;

      if (batch.length < batchSize) {
        hasMore = false;
      }
    }
  }

  /**
   * Get export statistics without actually exporting
   */
  async getExportStatistics(
    workspaceId: string,
    filters?: CustomerExportFilter,
  ): Promise<{
    totalRecords: number;
    byStatus: Record<string, number>;
    byTier: Record<string, number>;
    byType: Record<string, number>;
  }> {
    const customerRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktCustomerWorkspaceEntity>(
        workspaceId,
        'mktCustomer',
        { shouldBypassPermissionChecks: true },
      );

    const queryBuilder = customerRepository.createQueryBuilder('customer');

    // Apply filters
    if (filters?.status) {
      queryBuilder.andWhere('customer.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.tier) {
      queryBuilder.andWhere('customer.tier = :tier', {
        tier: filters.tier,
      });
    }

    if (filters?.type) {
      queryBuilder.andWhere('customer.type = :type', {
        type: filters.type,
      });
    }

    if (filters?.fromDate) {
      queryBuilder.andWhere('customer.createdAt >= :fromDate', {
        fromDate: filters.fromDate,
      });
    }

    if (filters?.toDate) {
      queryBuilder.andWhere('customer.createdAt <= :toDate', {
        toDate: filters.toDate,
      });
    }

    const totalRecords = await queryBuilder.getCount();

    // Get breakdown by status
    const byStatus = await customerRepository
      .createQueryBuilder('customer')
      .select('customer.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('customer.status')
      .getRawMany();

    // Get breakdown by tier
    const byTier = await customerRepository
      .createQueryBuilder('customer')
      .select('customer.tier', 'tier')
      .addSelect('COUNT(*)', 'count')
      .groupBy('customer.tier')
      .getRawMany();

    // Get breakdown by type
    const byType = await customerRepository
      .createQueryBuilder('customer')
      .select('customer.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('customer.type')
      .getRawMany();

    return {
      totalRecords,
      byStatus: byStatus.reduce(
        (acc, item) => {
          acc[item.status || 'UNKNOWN'] = parseInt(item.count);

          return acc;
        },
        {} as Record<string, number>,
      ),
      byTier: byTier.reduce(
        (acc, item) => {
          acc[item.tier || 'UNKNOWN'] = parseInt(item.count);

          return acc;
        },
        {} as Record<string, number>,
      ),
      byType: byType.reduce(
        (acc, item) => {
          acc[item.type || 'UNKNOWN'] = parseInt(item.count);

          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }
}
