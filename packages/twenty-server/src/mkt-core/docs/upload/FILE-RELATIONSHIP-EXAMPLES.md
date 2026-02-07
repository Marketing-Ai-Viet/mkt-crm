# File Relationship Examples

## Overview

Tài liệu này hướng dẫn cách gắn file với các entity trong mkt-core (Invoice, Order, Contract, License).

## Cách 1: Direct Relationship (Khuyến nghị)

Tạo relationship trực tiếp giữa MktFile và từng entity type.

### 1.1. MktFileWorkspaceEntity với Relations

```typescript
// packages/twenty-server/src/mkt-core/file/mkt-file.workspace-entity.ts

import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';
import { RelationMetadataType } from 'src/engine/metadata-modules/relation-metadata/relation-metadata.entity';
import { MktInvoiceWorkspaceEntity } from 'src/mkt-core/invoice/mkt-invoice.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/mkt-order.workspace-entity';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { MktContractWorkspaceEntity } from 'src/mkt-core/contract/mkt-contract.workspace-entity';

@WorkspaceEntity({
  standardId: 'mkt-file',
  namePlural: 'mktFiles',
  labelSingular: 'File',
  labelPlural: 'Files',
  description: 'File attachments',
  icon: 'IconFile',
})
export class MktFileWorkspaceEntity extends BaseWorkspaceEntity {
  // Basic fields
  @WorkspaceField({
    standardId: 'mkt-file-name',
    type: FieldMetadataType.TEXT,
    label: 'File Name',
    description: 'Original file name',
    icon: 'IconFile',
  })
  name: string;

  @WorkspaceField({
    standardId: 'mkt-file-size',
    type: FieldMetadataType.NUMBER,
    label: 'File Size',
    description: 'File size in bytes',
    icon: 'IconFileSize',
  })
  size: number;

  @WorkspaceField({
    standardId: 'mkt-file-mime-type',
    type: FieldMetadataType.TEXT,
    label: 'MIME Type',
    description: 'File MIME type',
    icon: 'IconFileType',
  })
  mimeType: string;

  @WorkspaceField({
    standardId: 'mkt-file-s3-key',
    type: FieldMetadataType.TEXT,
    label: 'S3 Key',
    description: 'S3 storage key',
    icon: 'IconKey',
  })
  s3Key: string;

  @WorkspaceField({
    standardId: 'mkt-file-hash',
    type: FieldMetadataType.TEXT,
    label: 'File Hash',
    description: 'SHA-256 hash for deduplication',
    icon: 'IconHash',
  })
  hash: string;

  @WorkspaceField({
    standardId: 'mkt-file-url',
    type: FieldMetadataType.TEXT,
    label: 'File URL',
    description: 'CloudFront signed URL (temporary)',
    icon: 'IconLink',
  })
  @WorkspaceIsNullable()
  url?: string;

  @WorkspaceField({
    standardId: 'mkt-file-category',
    type: FieldMetadataType.SELECT,
    label: 'Category',
    description: 'File category',
    icon: 'IconCategory',
    options: [
      { value: 'INVOICE', label: 'Invoice', position: 0, color: 'blue' },
      { value: 'CONTRACT', label: 'Contract', position: 1, color: 'green' },
      { value: 'ORDER_ATTACHMENT', label: 'Order Attachment', position: 2, color: 'purple' },
      { value: 'LICENSE_PROOF', label: 'License Proof', position: 3, color: 'orange' },
      { value: 'OTHER', label: 'Other', position: 4, color: 'gray' },
    ],
    defaultValue: "'OTHER'",
  })
  category: string;

  // --- Relations to Business Entities ---

  // Relation to Invoice
  @WorkspaceRelation({
    standardId: 'mkt-file-invoice',
    type: RelationMetadataType.MANY_TO_ONE,
    label: 'Invoice',
    description: 'Invoice this file belongs to',
    icon: 'IconReceipt',
    inverseSideTarget: () => MktInvoiceWorkspaceEntity,
    inverseSideFieldKey: 'files',
  })
  @WorkspaceIsNullable()
  invoice?: Relation<MktInvoiceWorkspaceEntity>;

  @WorkspaceJoinColumn('invoice')
  invoiceId?: string;

  // Relation to Order
  @WorkspaceRelation({
    standardId: 'mkt-file-order',
    type: RelationMetadataType.MANY_TO_ONE,
    label: 'Order',
    description: 'Order this file belongs to',
    icon: 'IconShoppingCart',
    inverseSideTarget: () => MktOrderWorkspaceEntity,
    inverseSideFieldKey: 'files',
  })
  @WorkspaceIsNullable()
  order?: Relation<MktOrderWorkspaceEntity>;

  @WorkspaceJoinColumn('order')
  orderId?: string;

  // Relation to License
  @WorkspaceRelation({
    standardId: 'mkt-file-license',
    type: RelationMetadataType.MANY_TO_ONE,
    label: 'License',
    description: 'License this file belongs to',
    icon: 'IconLicense',
    inverseSideTarget: () => MktLicenseWorkspaceEntity,
    inverseSideFieldKey: 'files',
  })
  @WorkspaceIsNullable()
  license?: Relation<MktLicenseWorkspaceEntity>;

  @WorkspaceJoinColumn('license')
  licenseId?: string;

  // Relation to Contract (nếu có)
  @WorkspaceRelation({
    standardId: 'mkt-file-contract',
    type: RelationMetadataType.MANY_TO_ONE,
    label: 'Contract',
    description: 'Contract this file belongs to',
    icon: 'IconFileContract',
    inverseSideTarget: () => MktContractWorkspaceEntity,
    inverseSideFieldKey: 'files',
  })
  @WorkspaceIsNullable()
  contract?: Relation<MktContractWorkspaceEntity>;

  @WorkspaceJoinColumn('contract')
  contractId?: string;

  // Relation to User (uploader)
  @WorkspaceRelation({
    standardId: 'mkt-file-uploaded-by',
    type: RelationMetadataType.MANY_TO_ONE,
    label: 'Uploaded By',
    description: 'User who uploaded this file',
    icon: 'IconUser',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'uploadedFiles',
  })
  uploadedBy: Relation<WorkspaceMemberWorkspaceEntity>;

  @WorkspaceJoinColumn('uploadedBy')
  uploadedById: string;
}
```

### 1.2. Thêm Inverse Relations vào Invoice

```typescript
// packages/twenty-server/src/mkt-core/invoice/mkt-invoice.workspace-entity.ts

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktInvoice,
  namePlural: 'mktInvoices',
  labelSingular: 'Invoice',
  labelPlural: 'Invoices',
  icon: 'IconReceipt',
})
export class MktInvoiceWorkspaceEntity extends BaseWorkspaceEntity {
  // ... existing fields ...

  // Add this relation
  @WorkspaceRelation({
    standardId: 'mkt-invoice-files',
    type: RelationMetadataType.ONE_TO_MANY,
    label: 'Files',
    description: 'Files attached to this invoice',
    icon: 'IconFile',
    inverseSideTarget: () => MktFileWorkspaceEntity,
    inverseSideFieldKey: 'invoice',
  })
  @WorkspaceIsNullable()
  files?: Relation<MktFileWorkspaceEntity[]>;
}
```

### 1.3. Thêm Inverse Relations vào Order

```typescript
// packages/twenty-server/src/mkt-core/order/mkt-order.workspace-entity.ts

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktOrder,
  namePlural: 'mktOrders',
  labelSingular: 'Order',
  labelPlural: 'Orders',
  icon: 'IconShoppingCart',
})
export class MktOrderWorkspaceEntity extends BaseWorkspaceEntity {
  // ... existing fields ...

  @WorkspaceRelation({
    standardId: 'mkt-order-files',
    type: RelationMetadataType.ONE_TO_MANY,
    label: 'Attachments',
    description: 'Files attached to this order',
    icon: 'IconFile',
    inverseSideTarget: () => MktFileWorkspaceEntity,
    inverseSideFieldKey: 'order',
  })
  @WorkspaceIsNullable()
  files?: Relation<MktFileWorkspaceEntity[]>;
}
```

### 1.4. Service: Upload File and Link to Entity

```typescript
// packages/twenty-server/src/mkt-core/file/services/mkt-file.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileStorageService } from 'src/engine/core-modules/file-storage/file-storage.service';
import { MktFileWorkspaceEntity } from '../mkt-file.workspace-entity';
import * as crypto from 'crypto';
import { FileType } from 'file-type';

export interface UploadFileToEntityInput {
  file: Express.Multer.File;
  entityType: 'invoice' | 'order' | 'license' | 'contract';
  entityId: string;
  category?: string;
  workspaceId: string;
  uploadedById: string;
}

@Injectable()
export class MktFileService {
  constructor(
    @InjectRepository(MktFileWorkspaceEntity, 'metadata')
    private readonly fileRepository: Repository<MktFileWorkspaceEntity>,
    private readonly fileStorageService: FileStorageService,
  ) {}

  /**
   * Upload file and link to entity (Invoice, Order, License, Contract)
   */
  async uploadFileToEntity(
    input: UploadFileToEntityInput,
  ): Promise<MktFileWorkspaceEntity> {
    const { file, entityType, entityId, category, workspaceId, uploadedById } = input;

    // 1. Validate file
    await this.validateFile(file);

    // 2. Calculate hash for deduplication
    const hash = this.calculateHash(file.buffer);

    // 3. Check if file already exists (deduplication)
    const existingFile = await this.findByHash(hash, workspaceId);
    if (existingFile) {
      // File already uploaded, just create new relation to entity
      return this.linkExistingFileToEntity({
        fileId: existingFile.id,
        entityType,
        entityId,
        workspaceId,
      });
    }

    // 4. Generate S3 key with workspace isolation
    const s3Key = this.generateS3Key(workspaceId, entityType, entityId, file.originalname);

    // 5. Upload to S3
    await this.fileStorageService.write({
      file: file.buffer,
      name: file.originalname,
      folder: `workspace-${workspaceId}/${entityType}/${entityId}`,
      mimeType: file.mimetype,
    });

    // 6. Create file record with entity relationship
    const fileRecord = this.fileRepository.create({
      name: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      s3Key,
      hash,
      category: category || this.getCategoryFromEntityType(entityType),
      // Set the foreign key based on entity type
      [`${entityType}Id`]: entityId,
      uploadedById,
      workspaceId,
    });

    return this.fileRepository.save(fileRecord);
  }

  /**
   * Link existing file to another entity (deduplication scenario)
   */
  async linkExistingFileToEntity(input: {
    fileId: string;
    entityType: string;
    entityId: string;
    workspaceId: string;
  }): Promise<MktFileWorkspaceEntity> {
    // Create a new file record pointing to same S3 object
    // but linked to different entity
    const originalFile = await this.fileRepository.findOne({
      where: { id: input.fileId, workspaceId: input.workspaceId },
    });

    if (!originalFile) {
      throw new Error('Original file not found');
    }

    const linkedFile = this.fileRepository.create({
      name: originalFile.name,
      size: originalFile.size,
      mimeType: originalFile.mimeType,
      s3Key: originalFile.s3Key,
      hash: originalFile.hash,
      category: originalFile.category,
      [`${input.entityType}Id`]: input.entityId,
      uploadedById: originalFile.uploadedById,
      workspaceId: input.workspaceId,
    });

    return this.fileRepository.save(linkedFile);
  }

  /**
   * Get all files for an entity
   */
  async getFilesByEntity(
    entityType: 'invoice' | 'order' | 'license' | 'contract',
    entityId: string,
    workspaceId: string,
  ): Promise<MktFileWorkspaceEntity[]> {
    return this.fileRepository.find({
      where: {
        [`${entityType}Id`]: entityId,
        workspaceId,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Generate signed URL for file download
   */
  async generateDownloadUrl(
    fileId: string,
    workspaceId: string,
    expiresIn: number = 900, // 15 minutes
  ): Promise<string> {
    const file = await this.fileRepository.findOne({
      where: { id: fileId, workspaceId },
    });

    if (!file) {
      throw new Error('File not found');
    }

    // Generate CloudFront signed URL (hoặc S3 pre-signed URL)
    return this.generateSignedUrl(file.s3Key, expiresIn);
  }

  /**
   * Delete file (soft delete recommended)
   */
  async deleteFile(fileId: string, workspaceId: string): Promise<void> {
    const file = await this.fileRepository.findOne({
      where: { id: fileId, workspaceId },
    });

    if (!file) {
      throw new Error('File not found');
    }

    // Check if other records reference this S3 object
    const otherReferences = await this.fileRepository.count({
      where: {
        hash: file.hash,
        workspaceId,
      },
    });

    // Only delete from S3 if no other references
    if (otherReferences <= 1) {
      await this.fileStorageService.delete({
        folderPath: `workspace-${workspaceId}`,
        filename: file.s3Key,
      });
    }

    // Delete database record
    await this.fileRepository.softDelete(fileId);
  }

  // --- Private Helper Methods ---

  private calculateHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private async findByHash(
    hash: string,
    workspaceId: string,
  ): Promise<MktFileWorkspaceEntity | null> {
    return this.fileRepository.findOne({
      where: { hash, workspaceId },
    });
  }

  private generateS3Key(
    workspaceId: string,
    entityType: string,
    entityId: string,
    filename: string,
  ): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `workspace-${workspaceId}/${entityType}/${entityId}/${timestamp}-${sanitizedFilename}`;
  }

  private getCategoryFromEntityType(entityType: string): string {
    const categoryMap = {
      invoice: 'INVOICE',
      order: 'ORDER_ATTACHMENT',
      license: 'LICENSE_PROOF',
      contract: 'CONTRACT',
    };
    return categoryMap[entityType] || 'OTHER';
  }

  private async validateFile(file: Express.Multer.File): Promise<void> {
    // Size validation (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      throw new Error('File size exceeds 100MB limit');
    }

    // MIME type validation
    const allowedMimeTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed`);
    }

    // Content-based validation using file-type library
    const fileType = await FileType.fromBuffer(file.buffer);
    if (!fileType || fileType.mime !== file.mimetype) {
      throw new Error('File content does not match declared MIME type');
    }
  }

  private async generateSignedUrl(s3Key: string, expiresIn: number): Promise<string> {
    // Implement CloudFront signed URL generation
    // See AWS-S3-INTEGRATION-GUIDE.md for details
    // This is a placeholder
    return `https://cdn.example.com/${s3Key}?expires=${expiresIn}`;
  }
}
```

### 1.5. GraphQL Resolver

```typescript
// packages/twenty-server/src/mkt-core/file/resolvers/mkt-file.resolver.ts

import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { MktFileService } from '../services/mkt-file.service';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { User } from 'src/engine/core-modules/user/user.entity';

@Resolver()
export class MktFileResolver {
  constructor(private readonly fileService: MktFileService) {}

  @Mutation(() => MktFileDTO)
  async uploadFileToInvoice(
    @Args('file', { type: () => GraphQLUpload }) file: Express.Multer.File,
    @Args('invoiceId') invoiceId: string,
    @AuthWorkspace() workspace: Workspace,
    @AuthUser() user: User,
  ) {
    return this.fileService.uploadFileToEntity({
      file,
      entityType: 'invoice',
      entityId: invoiceId,
      workspaceId: workspace.id,
      uploadedById: user.id,
    });
  }

  @Mutation(() => MktFileDTO)
  async uploadFileToOrder(
    @Args('file', { type: () => GraphQLUpload }) file: Express.Multer.File,
    @Args('orderId') orderId: string,
    @AuthWorkspace() workspace: Workspace,
    @AuthUser() user: User,
  ) {
    return this.fileService.uploadFileToEntity({
      file,
      entityType: 'order',
      entityId: orderId,
      workspaceId: workspace.id,
      uploadedById: user.id,
    });
  }

  @Query(() => [MktFileDTO])
  async getInvoiceFiles(
    @Args('invoiceId') invoiceId: string,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.fileService.getFilesByEntity('invoice', invoiceId, workspace.id);
  }

  @Query(() => [MktFileDTO])
  async getOrderFiles(
    @Args('orderId') orderId: string,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.fileService.getFilesByEntity('order', orderId, workspace.id);
  }

  @Query(() => String)
  async getFileDownloadUrl(
    @Args('fileId') fileId: string,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.fileService.generateDownloadUrl(fileId, workspace.id);
  }

  @Mutation(() => Boolean)
  async deleteFile(
    @Args('fileId') fileId: string,
    @AuthWorkspace() workspace: Workspace,
  ) {
    await this.fileService.deleteFile(fileId, workspace.id);
    return true;
  }
}
```

### 1.6. Usage Example

```typescript
// Example: Upload invoice PDF
const invoice = await invoiceService.createInvoice({ ... });

// Upload PDF file for invoice
const pdfFile = req.file; // from multer
const uploadedFile = await fileService.uploadFileToEntity({
  file: pdfFile,
  entityType: 'invoice',
  entityId: invoice.id,
  category: 'INVOICE',
  workspaceId: workspace.id,
  uploadedById: user.id,
});

// Get all files for invoice
const invoiceFiles = await fileService.getFilesByEntity(
  'invoice',
  invoice.id,
  workspace.id,
);

// Generate download URL
const downloadUrl = await fileService.generateDownloadUrl(
  uploadedFile.id,
  workspace.id,
);
```

---

## Cách 2: Polymorphic Relationship (Nếu cần tính linh hoạt cao)

Sử dụng khi file có thể gắn với nhiều loại entity khác nhau trong tương lai.

### 2.1. MktFileWorkspaceEntity với Polymorphic Fields

```typescript
@WorkspaceEntity({
  standardId: 'mkt-file',
  namePlural: 'mktFiles',
  labelSingular: 'File',
  labelPlural: 'Files',
  icon: 'IconFile',
})
export class MktFileWorkspaceEntity extends BaseWorkspaceEntity {
  // ... basic fields (name, size, mimeType, s3Key, hash) ...

  // Polymorphic relationship fields
  @WorkspaceField({
    standardId: 'mkt-file-related-entity-type',
    type: FieldMetadataType.SELECT,
    label: 'Related Entity Type',
    description: 'Type of entity this file is attached to',
    icon: 'IconLink',
    options: [
      { value: 'INVOICE', label: 'Invoice', position: 0, color: 'blue' },
      { value: 'ORDER', label: 'Order', position: 1, color: 'green' },
      { value: 'LICENSE', label: 'License', position: 2, color: 'orange' },
      { value: 'CONTRACT', label: 'Contract', position: 3, color: 'purple' },
      { value: 'CUSTOMER', label: 'Customer', position: 4, color: 'red' },
    ],
  })
  @WorkspaceIsNullable()
  relatedEntityType?: string;

  @WorkspaceField({
    standardId: 'mkt-file-related-entity-id',
    type: FieldMetadataType.UUID,
    label: 'Related Entity ID',
    description: 'ID of the entity this file is attached to',
    icon: 'IconKey',
  })
  @WorkspaceIsNullable()
  relatedEntityId?: string;

  @WorkspaceRelation({
    standardId: 'mkt-file-uploaded-by',
    type: RelationMetadataType.MANY_TO_ONE,
    label: 'Uploaded By',
    description: 'User who uploaded this file',
    icon: 'IconUser',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'uploadedFiles',
  })
  uploadedBy: Relation<WorkspaceMemberWorkspaceEntity>;

  @WorkspaceJoinColumn('uploadedBy')
  uploadedById: string;
}
```

### 2.2. Service với Polymorphic Relationship

```typescript
@Injectable()
export class MktFilePolymorphicService {
  async uploadFileToEntity(input: {
    file: Express.Multer.File;
    relatedEntityType: 'INVOICE' | 'ORDER' | 'LICENSE' | 'CONTRACT';
    relatedEntityId: string;
    workspaceId: string;
    uploadedById: string;
  }): Promise<MktFileWorkspaceEntity> {
    const { file, relatedEntityType, relatedEntityId, workspaceId, uploadedById } = input;

    // Upload logic...
    const hash = this.calculateHash(file.buffer);
    const s3Key = this.generateS3Key(workspaceId, relatedEntityType, relatedEntityId, file.originalname);

    await this.fileStorageService.write({
      file: file.buffer,
      name: file.originalname,
      folder: `workspace-${workspaceId}/${relatedEntityType}/${relatedEntityId}`,
      mimeType: file.mimetype,
    });

    const fileRecord = this.fileRepository.create({
      name: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      s3Key,
      hash,
      relatedEntityType,
      relatedEntityId,
      uploadedById,
      workspaceId,
    });

    return this.fileRepository.save(fileRecord);
  }

  async getFilesByEntity(
    relatedEntityType: string,
    relatedEntityId: string,
    workspaceId: string,
  ): Promise<MktFileWorkspaceEntity[]> {
    return this.fileRepository.find({
      where: {
        relatedEntityType,
        relatedEntityId,
        workspaceId,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }
}
```

### 2.3. GraphQL Query với Polymorphic

```graphql
# Get files for invoice
query GetInvoiceFiles($invoiceId: String!) {
  mktFiles(
    filter: {
      relatedEntityType: { eq: "INVOICE" }
      relatedEntityId: { eq: $invoiceId }
    }
  ) {
    edges {
      node {
        id
        name
        size
        mimeType
        url
        createdAt
        uploadedBy {
          name {
            firstName
            lastName
          }
        }
      }
    }
  }
}

# Get files for order
query GetOrderFiles($orderId: String!) {
  mktFiles(
    filter: {
      relatedEntityType: { eq: "ORDER" }
      relatedEntityId: { eq: $orderId }
    }
  ) {
    edges {
      node {
        id
        name
        size
        mimeType
        url
      }
    }
  }
}
```

---

## So sánh 2 Cách

| Tiêu chí | Direct Relationship | Polymorphic Relationship |
|----------|---------------------|--------------------------|
| **Type Safety** | ✅ Strong (TypeORM relations) | ⚠️ Weaker (string-based) |
| **Query Performance** | ✅ Better (direct FK, indexes) | ⚠️ Slower (no FK constraints) |
| **GraphQL Support** | ✅ Auto-generated relations | ⚠️ Manual filtering |
| **Flexibility** | ⚠️ Need to add relation for each entity | ✅ Easy to add new entity types |
| **Code Complexity** | ⚠️ More boilerplate | ✅ Less code |
| **Database Integrity** | ✅ Foreign key constraints | ❌ No constraints |
| **Recommended For** | mkt-core (known entities) | Generic systems |

---

## Khuyến nghị cho mkt-core

**Sử dụng Cách 1: Direct Relationship**

Lý do:
1. **Type safety**: TypeORM relations đảm bảo type safety
2. **Performance**: Foreign key indexes tối ưu query
3. **Twenty CRM convention**: Phù hợp với pattern của Twenty
4. **GraphQL auto-generation**: Twenty tự động tạo relations trong GraphQL
5. **Database integrity**: Foreign key constraints đảm bảo data consistency

Số lượng entity types trong mkt-core là hữu hạn (Invoice, Order, License, Contract) nên không cần tính linh hoạt của polymorphic relationship.

---

## Migration Script

Nếu đã có dữ liệu cũ, tạo migration để thêm relations:

```typescript
// packages/twenty-server/src/database/typeorm/metadata/migrations/xxx-add-file-relations.ts

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFileRelations1234567890 implements MigrationInterface {
  name = 'AddFileRelations1234567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add foreign key columns
    await queryRunner.query(`
      ALTER TABLE "metadata"."mktFileWorkspaceEntity"
      ADD COLUMN "invoiceId" uuid NULL,
      ADD COLUMN "orderId" uuid NULL,
      ADD COLUMN "licenseId" uuid NULL,
      ADD COLUMN "contractId" uuid NULL
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "metadata"."mktFileWorkspaceEntity"
      ADD CONSTRAINT "FK_mkt_file_invoice"
      FOREIGN KEY ("invoiceId") REFERENCES "metadata"."mktInvoiceWorkspaceEntity"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "metadata"."mktFileWorkspaceEntity"
      ADD CONSTRAINT "FK_mkt_file_order"
      FOREIGN KEY ("orderId") REFERENCES "metadata"."mktOrderWorkspaceEntity"("id")
      ON DELETE CASCADE
    `);

    // Add indexes for performance
    await queryRunner.query(`
      CREATE INDEX "IDX_mkt_file_invoice" ON "metadata"."mktFileWorkspaceEntity" ("invoiceId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_mkt_file_order" ON "metadata"."mktFileWorkspaceEntity" ("orderId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "metadata"."IDX_mkt_file_invoice"`);
    await queryRunner.query(`DROP INDEX "metadata"."IDX_mkt_file_order"`);

    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE "metadata"."mktFileWorkspaceEntity" DROP CONSTRAINT "FK_mkt_file_invoice"`);
    await queryRunner.query(`ALTER TABLE "metadata"."mktFileWorkspaceEntity" DROP CONSTRAINT "FK_mkt_file_order"`);

    // Drop columns
    await queryRunner.query(`ALTER TABLE "metadata"."mktFileWorkspaceEntity" DROP COLUMN "invoiceId"`);
    await queryRunner.query(`ALTER TABLE "metadata"."mktFileWorkspaceEntity" DROP COLUMN "orderId"`);
    await queryRunner.query(`ALTER TABLE "metadata"."mktFileWorkspaceEntity" DROP COLUMN "licenseId"`);
    await queryRunner.query(`ALTER TABLE "metadata"."mktFileWorkspaceEntity" DROP COLUMN "contractId"`);
  }
}
```

---

## Next Steps

1. **Implement MktFileWorkspaceEntity** với direct relations
2. **Add inverse relations** vào MktInvoice, MktOrder, MktLicense
3. **Create MktFileService** với upload/download/delete methods
4. **Add GraphQL resolvers** cho file operations
5. **Test deduplication** logic với cùng file upload nhiều lần
6. **Setup CloudFront** signed URLs cho production
7. **Add unit tests** cho MktFileService
