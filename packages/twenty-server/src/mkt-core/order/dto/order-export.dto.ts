import {
  Field,
  InputType,
  ObjectType,
  Int,
  registerEnumType,
} from '@nestjs/graphql';

// ============================================
// ENUMS
// ============================================

/**
 * Export format enum
 */
export enum ExportFormatEnum {
  XLSX = 'xlsx',
  CSV = 'csv',
}

registerEnumType(ExportFormatEnum, {
  name: 'ExportFormat',
  description: 'Supported export file formats',
});

// ============================================
// INPUT TYPES
// ============================================

/**
 * Input cho export orders theo filter (customerId, salesStaffId)
 */
@InputType({ description: 'Input cho export orders theo filter' })
export class ExportOrdersInput {
  @Field(() => String, { nullable: true, description: 'Filter by customer ID' })
  customerId?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Filter by sales staff ID',
  })
  salesStaffId?: string;

  @Field(() => ExportFormatEnum, {
    nullable: true,
    defaultValue: ExportFormatEnum.XLSX,
    description: 'Export format (xlsx or csv)',
  })
  format?: ExportFormatEnum;
}

/**
 * Input cho export orders theo danh sách IDs
 */
@InputType({ description: 'Input cho export orders theo IDs' })
export class ExportOrdersByIdsInput {
  @Field(() => [String], {
    description: 'Danh sách order IDs cần export (bắt buộc)',
  })
  orderIds: string[];

  @Field(() => ExportFormatEnum, {
    nullable: true,
    defaultValue: ExportFormatEnum.XLSX,
    description: 'Export format (xlsx or csv)',
  })
  format?: ExportFormatEnum;
}

// ============================================
// OUTPUT TYPES
// ============================================

/**
 * Response từ sync export operation
 *
 * Trả về downloadUrl để frontend redirect và download file trực tiếp
 * URL chứa one-time token, hết hạn sau 5 phút
 */
@ObjectType({ description: 'Response từ export operation' })
export class ExportFileOutput {
  @Field(() => String, {
    description: 'Download URL - redirect đến URL này để tải file trực tiếp',
  })
  downloadUrl: string;

  @Field(() => Int, { description: 'Số rows sẽ được export' })
  rowCount: number;

  @Field(() => String, {
    description: 'Thời gian hết hạn của URL (ISO format)',
  })
  expiresAt: string;
}

@ObjectType({ description: 'Response từ async export request' })
export class AsyncExportOutput {
  @Field(() => String, { description: 'Job ID để track progress' })
  jobId: string;

  @Field(() => String, {
    description: 'Status: QUEUED, PROCESSING, COMPLETED, FAILED',
  })
  status: string;

  @Field(() => Int, { description: 'Estimated row count' })
  estimatedRows: number;

  @Field(() => String, {
    nullable: true,
    description: 'Download URL khi completed',
  })
  downloadUrl?: string;

  @Field(() => String, { nullable: true, description: 'URL expiry time (ISO)' })
  expiresAt?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Error message khi failed',
  })
  error?: string;
}
