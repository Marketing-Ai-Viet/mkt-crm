import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { ActorMetadata } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceFieldIndex } from 'src/engine/twenty-orm/decorators/workspace-field-index.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { MKT_WEBHOOK_LOG_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';

/**
 * Webhook Log status types
 * RECEIVED: Webhook nhận được nhưng chưa xử lý
 * PROCESSING: Đang xử lý webhook
 * SUCCESS: Xử lý thành công
 * FAILED: Xử lý thất bại
 */
export type WebhookLogStatus = 'RECEIVED' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

/**
 * Webhook Log Status Options for SELECT field
 */
const WEBHOOK_LOG_STATUS_OPTIONS = [
  {
    value: 'RECEIVED',
    label: 'Received',
    position: 0,
    color: 'gray' as TagColor,
  },
  {
    value: 'PROCESSING',
    label: 'Processing',
    position: 1,
    color: 'blue' as TagColor,
  },
  {
    value: 'SUCCESS',
    label: 'Success',
    position: 2,
    color: 'green' as TagColor,
  },
  {
    value: 'FAILED',
    label: 'Failed',
    position: 3,
    color: 'red' as TagColor,
  },
];

/**
 * MktWebhookLogWorkspaceEntity
 *
 * Entity để lưu trữ logs của tất cả webhook requests.
 * Dùng cho mục đích audit, debug và monitoring.
 *
 * Use cases:
 * - Lưu log SePay webhook để trace payment processing
 * - Debug khi có vấn đề với webhook
 * - Audit trail cho compliance
 * - Monitoring webhook performance (processingTimeMs)
 */
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktWebhookLog,
  namePlural: 'webhookLogs',
  labelSingular: msg`Webhook Log`,
  labelPlural: msg`Webhook Logs`,
  description: msg`Stores webhook request logs for auditing and debugging`,
  icon: 'IconWebhook',
})
export class MktWebhookLogWorkspaceEntity extends BaseWorkspaceEntity {
  /**
   * SePay Transaction ID - unique identifier từ SePay
   * Dùng để match với payment và check idempotency
   */
  @WorkspaceField({
    standardId: MKT_WEBHOOK_LOG_FIELD_IDS.sepayTransactionId,
    type: FieldMetadataType.NUMBER,
    label: msg`SePay Transaction ID`,
    description: msg`Unique transaction ID from SePay webhook`,
    icon: 'IconId',
  })
  @WorkspaceFieldIndex()
  sepayTransactionId: number;

  /**
   * Payment gateway name (e.g., 'sepay', 'bidv')
   */
  @WorkspaceField({
    standardId: MKT_WEBHOOK_LOG_FIELD_IDS.gateway,
    type: FieldMetadataType.TEXT,
    label: msg`Gateway`,
    description: msg`Payment gateway name (sepay, bidv, etc.)`,
    icon: 'IconBuildingBank',
  })
  gateway: string;

  /**
   * Raw request body từ webhook
   * Lưu nguyên JSON để debug và audit
   */
  @WorkspaceField({
    standardId: MKT_WEBHOOK_LOG_FIELD_IDS.requestBody,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Request Body`,
    description: msg`Raw webhook request body`,
    icon: 'IconCode',
  })
  requestBody: object;

  /**
   * HTTP response status code trả về cho webhook caller
   */
  @WorkspaceField({
    standardId: MKT_WEBHOOK_LOG_FIELD_IDS.responseStatus,
    type: FieldMetadataType.NUMBER,
    label: msg`Response Status`,
    description: msg`HTTP response status code`,
    icon: 'IconStatusChange',
  })
  @WorkspaceIsNullable()
  responseStatus?: number;

  /**
   * Response body gửi lại cho webhook caller
   */
  @WorkspaceField({
    standardId: MKT_WEBHOOK_LOG_FIELD_IDS.responseBody,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Response Body`,
    description: msg`Response body sent back to webhook caller`,
    icon: 'IconCode',
  })
  @WorkspaceIsNullable()
  responseBody?: object;

  /**
   * Processing time in milliseconds
   * Dùng để monitor performance
   */
  @WorkspaceField({
    standardId: MKT_WEBHOOK_LOG_FIELD_IDS.processingTimeMs,
    type: FieldMetadataType.NUMBER,
    label: msg`Processing Time (ms)`,
    description: msg`Time taken to process the webhook in milliseconds`,
    icon: 'IconClock',
  })
  @WorkspaceIsNullable()
  processingTimeMs?: number;

  /**
   * Source IP address của webhook request
   * Dùng cho security auditing
   */
  @WorkspaceField({
    standardId: MKT_WEBHOOK_LOG_FIELD_IDS.ipAddress,
    type: FieldMetadataType.TEXT,
    label: msg`IP Address`,
    description: msg`Source IP address of the webhook request`,
    icon: 'IconNetwork',
  })
  @WorkspaceIsNullable()
  ipAddress?: string;

  /**
   * Processing status
   */
  @WorkspaceField({
    standardId: MKT_WEBHOOK_LOG_FIELD_IDS.status,
    type: FieldMetadataType.SELECT,
    label: msg`Status`,
    description: msg`Webhook processing status`,
    icon: 'IconCheck',
    options: WEBHOOK_LOG_STATUS_OPTIONS,
    defaultValue: "'RECEIVED'",
  })
  status: WebhookLogStatus;

  /**
   * Error message nếu processing thất bại
   */
  @WorkspaceField({
    standardId: MKT_WEBHOOK_LOG_FIELD_IDS.errorMessage,
    type: FieldMetadataType.TEXT,
    label: msg`Error Message`,
    description: msg`Error message if webhook processing failed`,
    icon: 'IconAlertTriangle',
  })
  @WorkspaceIsNullable()
  errorMessage?: string;

  /**
   * Order code được match (nếu có)
   * Dùng để link với order
   */
  @WorkspaceField({
    standardId: MKT_WEBHOOK_LOG_FIELD_IDS.matchedOrderCode,
    type: FieldMetadataType.TEXT,
    label: msg`Matched Order Code`,
    description: msg`Order code that was matched from webhook content`,
    icon: 'IconBox',
  })
  @WorkspaceIsNullable()
  @WorkspaceFieldIndex()
  matchedOrderCode?: string;

  /**
   * Position for ordering in list view
   */
  @WorkspaceField({
    standardId: MKT_WEBHOOK_LOG_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position in list`,
    icon: 'IconHierarchy',
  })
  @WorkspaceIsNullable()
  position?: number;

  /**
   * Actor who triggered this log (usually system)
   */
  @WorkspaceField({
    standardId: MKT_WEBHOOK_LOG_FIELD_IDS.createdBy,
    type: FieldMetadataType.ACTOR,
    label: msg`Created by`,
    icon: 'IconCreativeCommonsSa',
    description: msg`The creator of the record`,
  })
  createdBy: ActorMetadata;
}
