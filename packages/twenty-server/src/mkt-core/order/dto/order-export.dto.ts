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

@InputType({ description: 'Input cho export orders' })
export class ExportOrdersInput {
  @Field(() => String, { nullable: true, description: 'Filter by status' })
  status?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Filter from date (ISO format)',
  })
  startDate?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Filter to date (ISO format)',
  })
  endDate?: string;

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

// ============================================
// OUTPUT TYPES
// ============================================

@ObjectType({ description: 'Response từ export operation' })
export class ExportFileOutput {
  @Field(() => String, { description: 'Base64 encoded file content' })
  content: string;

  @Field(() => String, { description: 'MIME type của file' })
  mimeType: string;

  @Field(() => String, { description: 'Suggested filename' })
  filename: string;

  @Field(() => Int, { description: 'Số rows đã export' })
  rowCount: number;
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
