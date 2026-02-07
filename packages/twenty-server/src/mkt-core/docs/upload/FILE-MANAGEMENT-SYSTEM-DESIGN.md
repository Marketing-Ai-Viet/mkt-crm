# File Management System Design - Backend Architecture

## 📋 Table of Contents

1. [Overview](#overview)
2. [Requirements Analysis](#requirements-analysis)
3. [System Architecture](#system-architecture)
4. [Best Practices](#best-practices)
5. [Storage Strategy](#storage-strategy)
6. [File Organization](#file-organization)
7. [Entity Relationships](#entity-relationships)
8. [Security & Access Control](#security--access-control)
9. [Image Processing](#image-processing)
10. [Metadata Management](#metadata-management)
11. [Performance Optimization](#performance-optimization)
12. [API Design](#api-design)
13. [Backup & Disaster Recovery](#backup--disaster-recovery)
14. [Monitoring & Analytics](#monitoring--analytics)
15. [Cost Optimization](#cost-optimization)
16. [Storage Strategy](#storage-strategy)
17. [Migration Strategy](#migration-strategy)

---

## 📖 Overview

Hệ thống quản lý file backend cho CRM với **AWS S3 làm storage chính**:

- **Storage Management**: AWS S3 (single source of truth)
- **File Processing**: Upload, download, compression, image optimization
- **Security**: Pre-signed URLs, encryption, access control, file validation
- **Metadata**: PostgreSQL tracking, Elasticsearch indexing
- **Performance**: CloudFront CDN, Redis metadata cache, chunked upload
- **Compliance**: GDPR, data retention, audit logging

### Supported File Types

| Category | Types | Use Case |
|----------|-------|----------|
| **Documents** | PDF, DOCX, XLSX, TXT | Invoices, contracts, reports |
| **Images** | JPG, PNG, WebP, SVG | Avatars, products, branding |
| **Archives** | ZIP, RAR, 7Z | Backup, bulk downloads |
| **Exports** | CSV, XLSX, JSON | Data exports |

---

## 🎯 Requirements Analysis

### Functional Requirements

| Feature | Description | Priority |
|---------|-------------|----------|
| **Upload** | Multi-file upload with streaming | Critical |
| **Download** | Secure download with pre-signed URLs | Critical |
| **Versioning** | Track file versions and history | High |
| **Compression** | Auto-compress large files | Medium |
| **File Validation** | MIME type and size validation | Critical |
| **Deduplication** | Content-addressable storage | High |
| **Bulk Operations** | Batch delete, move, copy | Medium |
| **Search** | Full-text search in metadata | High |

### Non-Functional Requirements

| Requirement | Target | Justification |
|-------------|--------|---------------|
| **Scalability** | 10TB+ storage | Support business growth |
| **Performance** | <2s upload/download | User experience |
| **Availability** | 99.9% uptime | Business continuity |
| **Security** | Zero data breaches | Data protection |
| **Cost** | <$100/TB/month | Cost efficiency |
| **Compliance** | GDPR, SOC2 | Legal requirements |

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    GraphQL API Layer                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │  File Resolvers & Controllers                     │   │
│  │  - Upload mutation                                │   │
│  │  - Download query (pre-signed URLs)               │   │
│  │  - Delete mutation                                │   │
│  └───────────────────┬──────────────────────────────┘   │
└────────────────────┬─┴──────────────────────────────────┘
                     │
┌────────────────────▼──────────────────────────────────┐
│                Service Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │   File       │  │   Image      │  │     File     ││
│  │   Service    │  │   Processing │  │  Validation  ││
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘│
└─────────┼──────────────────┼──────────────────┼────────┘
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼────────┐
│              FileStorageService (S3 Only)               │
│  ┌────────────────────────────────────────────────┐   │
│  │          S3Driver (AWS SDK v3)                 │   │
│  └──────────────────┬─────────────────────────────┘   │
└────────────────────┬┴───────────────────────────────────┘
                     │
                     │ All files stored in S3
                     │
              ┌──────▼───────┐
              │   AWS S3     │
              │  - STANDARD  │
              │  - IA (30d)  │
              │  - GLACIER   │
              └──────┬───────┘
                     │
              ┌──────▼───────┐
              │ CloudFront   │
              │   CDN        │
              └──────────────┘

┌──────────────────────────────────────────────────────────┐
│                  Data & Cache Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  PostgreSQL  │  │    Redis     │  │Elasticsearch │  │
│  │  (Metadata)  │  │(Meta Cache)  │  │   (Search)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Technology |
|-----------|----------------|------------|
| **API Layer** | Request handling, validation | NestJS, GraphQL |
| **Service Layer** | Business logic, orchestration | TypeScript |
| **Storage Layer** | File persistence on S3 | AWS SDK v3 |
| **CDN Layer** | Fast global delivery | CloudFront |
| **Processing** | Image resize, compression | Sharp, zlib |
| **Validation** | MIME type, size, content | FileType, crypto |
| **Security** | Encryption, access control | S3 SSE, IAM |
| **Metadata** | File info, search | PostgreSQL, ES |
| **Cache** | Metadata cache | Redis |

---

## ✅ Best Practices

### 1. Storage Architecture

#### ✅ DO: S3-Only Storage with Lifecycle Management

```typescript
/**
 * All files are stored in S3
 * S3 Lifecycle automatically transitions data between storage classes
 * based on age, not application logic
 */

interface S3StorageConfig {
  bucket: string;
  region: string;
  storageClass: 'STANDARD'; // Always upload to STANDARD
  lifecycleEnabled: true;    // Let S3 handle transitions
}

const storageConfig: S3StorageConfig = {
  bucket: process.env.STORAGE_S3_NAME,
  region: process.env.STORAGE_S3_REGION,
  storageClass: 'STANDARD',
  lifecycleEnabled: true,
};

/**
 * Upload to S3 (always STANDARD)
 * S3 Lifecycle will automatically move to:
 * - STANDARD_IA after 30 days
 * - GLACIER_INSTANT_RETRIEVAL after 90 days
 */
async function uploadToS3(
  buffer: Buffer,
  storagePath: string,
  mimeType: string,
): Promise<void> {
  await this.s3Client.putObject({
    Bucket: storageConfig.bucket,
    Key: storagePath,
    Body: buffer,
    ContentType: mimeType,
    StorageClass: 'STANDARD', // Let lifecycle manage transitions
    ServerSideEncryption: 'AES256',
  });
}
```

#### ❌ DON'T: Store Binary in Database or Local Filesystem

```typescript
// ❌ BAD: Bloats database, slow queries, no scalability
@Column({ type: 'bytea' })
fileContent: Buffer;

// ❌ BAD: Local filesystem, hard to scale, no redundancy
const localPath = `/var/files/${fileId}`;
fs.writeFileSync(localPath, buffer);

// ✅ GOOD: S3 reference only
@Column()
s3Key: string;

@Column()
s3Bucket: string;

@Column()
size: number;

@Column()
contentHash: string;
```

---

### 2. File Organization

#### ✅ DO: Content-Addressable Storage with Workspace Isolation

```
s3://crm-bucket/
├── workspaces/
│   ├── {workspace-uuid}/
│   │   ├── files/
│   │   │   ├── content/               # Content-addressable
│   │   │   │   ├── {hash[0:2]}/      # First 2 chars of hash
│   │   │   │   │   └── {sha256-hash}  # Full hash as filename
│   │   │   └── metadata.db            # Metadata index
│   │   ├── invoices/
│   │   │   ├── {year}/
│   │   │   │   ├── {month}/
│   │   │   │   │   └── {invoice-uuid}.pdf
│   │   ├── orders/
│   │   │   └── {order-uuid}/
│   │   │       └── attachments/
│   │   │           └── {file-uuid}_{original-name}
│   │   └── exports/
│   │       └── temp/                  # 24h TTL
│   │           └── {export-uuid}.xlsx
└── shared/                             # Cross-workspace assets
    └── templates/
        └── invoice-template.html
```

**Benefits:**
- Automatic deduplication via content hashing
- Workspace isolation for security
- Date-based partitioning for lifecycle management
- Temporary files with TTL

#### ❌ DON'T: Flat Structure with Original Names

```
❌ BAD:
files/
├── invoice_2026.pdf
├── invoice_2026 (1).pdf
├── contract.docx
└── IMG_1234.jpg

Issues:
- Name collisions
- No deduplication
- Security risks
- Hard to manage
```

---

## 🔗 Entity Relationships

### Direct Relationship Pattern (Recommended)

Files trong mkt-core được gắn trực tiếp với business entities (Invoice, Order, License, Contract) thông qua foreign key relationships.

### MktFileWorkspaceEntity

```typescript
// packages/twenty-server/src/mkt-core/file/mkt-file.workspace-entity.ts

import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { FieldMetadataType } from 'src/engine/metadata-modules/field-metadata/field-metadata.entity';
import { RelationMetadataType } from 'src/engine/metadata-modules/relation-metadata/relation-metadata.entity';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { MktInvoiceWorkspaceEntity } from 'src/mkt-core/invoice/mkt-invoice.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/mkt-order.workspace-entity';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

@WorkspaceEntity({
  standardId: 'mkt-file',
  namePlural: 'mktFiles',
  labelSingular: 'File',
  labelPlural: 'Files',
  description: 'File attachments for invoices, orders, licenses, and contracts',
  icon: 'IconFile',
})
export class MktFileWorkspaceEntity extends BaseWorkspaceEntity {
  // Basic file metadata
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

  // S3 storage references
  @WorkspaceField({
    standardId: 'mkt-file-s3-key',
    type: FieldMetadataType.TEXT,
    label: 'S3 Key',
    description: 'S3 storage key path',
    icon: 'IconKey',
  })
  s3Key: string;

  @WorkspaceField({
    standardId: 'mkt-file-s3-bucket',
    type: FieldMetadataType.TEXT,
    label: 'S3 Bucket',
    description: 'S3 bucket name',
    icon: 'IconBucket',
  })
  s3Bucket: string;

  // Content hash for deduplication
  @WorkspaceField({
    standardId: 'mkt-file-hash',
    type: FieldMetadataType.TEXT,
    label: 'Content Hash',
    description: 'SHA-256 hash for deduplication',
    icon: 'IconHash',
  })
  contentHash: string;

  // File category
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
      { value: 'AVATAR', label: 'Avatar', position: 4, color: 'red' },
      { value: 'DOCUMENT', label: 'Document', position: 5, color: 'yellow' },
      { value: 'OTHER', label: 'Other', position: 6, color: 'gray' },
    ],
    defaultValue: "'OTHER'",
  })
  category: string;

  // Temporary URL (generated on-demand, not persisted)
  @WorkspaceField({
    standardId: 'mkt-file-url',
    type: FieldMetadataType.TEXT,
    label: 'Download URL',
    description: 'CloudFront signed URL (temporary)',
    icon: 'IconLink',
  })
  @WorkspaceIsNullable()
  url?: string;

  // --- Direct Relations to Business Entities ---

  // Relation to Invoice (MANY files → ONE invoice)
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

  // Relation to Order (MANY files → ONE order)
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

  // Relation to License (MANY files → ONE license)
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

### Inverse Relations in Business Entities

Cần thêm inverse relations vào các entity để query files:

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

```typescript
// packages/twenty-server/src/mkt-core/license/mkt-license.workspace-entity.ts

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktLicense,
  namePlural: 'mktLicenses',
  labelSingular: 'License',
  labelPlural: 'Licenses',
  icon: 'IconLicense',
})
export class MktLicenseWorkspaceEntity extends BaseWorkspaceEntity {
  // ... existing fields ...

  @WorkspaceRelation({
    standardId: 'mkt-license-files',
    type: RelationMetadataType.ONE_TO_MANY,
    label: 'Files',
    description: 'Files attached to this license',
    icon: 'IconFile',
    inverseSideTarget: () => MktFileWorkspaceEntity,
    inverseSideFieldKey: 'license',
  })
  @WorkspaceIsNullable()
  files?: Relation<MktFileWorkspaceEntity[]>;
}
```

### MktFileService Implementation

```typescript
// packages/twenty-server/src/mkt-core/file/services/mkt-file.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileStorageService } from 'src/engine/core-modules/file-storage/file-storage.service';
import { MktFileWorkspaceEntity } from '../mkt-file.workspace-entity';
import * as crypto from 'crypto';

export interface UploadFileToEntityInput {
  file: Express.Multer.File;
  entityType: 'invoice' | 'order' | 'license';
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
   * Upload file and link to entity (Invoice, Order, License)
   */
  async uploadFileToEntity(
    input: UploadFileToEntityInput,
  ): Promise<MktFileWorkspaceEntity> {
    const { file, entityType, entityId, category, workspaceId, uploadedById } = input;

    // 1. Validate file
    await this.validateFile(file);

    // 2. Calculate hash for deduplication
    const contentHash = this.calculateHash(file.buffer);

    // 3. Check if file already exists (deduplication)
    const existingFile = await this.findByHash(contentHash, workspaceId);
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
    const s3Bucket = process.env.STORAGE_S3_NAME;

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
      s3Bucket,
      contentHash,
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
      s3Bucket: originalFile.s3Bucket,
      contentHash: originalFile.contentHash,
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
    entityType: 'invoice' | 'order' | 'license',
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
      relations: ['uploadedBy'],
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

    // Generate CloudFront signed URL
    return this.cloudFrontService.generateSignedUrl(file.s3Key, expiresIn);
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
        contentHash: file.contentHash,
        workspaceId,
      },
    });

    // Only delete from S3 if no other references
    if (otherReferences <= 1) {
      await this.fileStorageService.delete({
        folderPath: `workspace-${workspaceId}/${entityType}`,
        filename: file.s3Key,
      });
    }

    // Soft delete database record
    await this.fileRepository.softDelete(fileId);
  }

  // --- Private Helper Methods ---

  private calculateHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private async findByHash(
    contentHash: string,
    workspaceId: string,
  ): Promise<MktFileWorkspaceEntity | null> {
    return this.fileRepository.findOne({
      where: { contentHash, workspaceId },
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
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed`);
    }
  }
}
```

### GraphQL Resolver Examples

```typescript
// packages/twenty-server/src/mkt-core/file/resolvers/mkt-file.resolver.ts

import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { MktFileService } from '../services/mkt-file.service';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { User } from 'src/engine/core-modules/user/user.entity';
import { GraphQLUpload } from 'graphql-upload';

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

### GraphQL Query Examples

```graphql
# Upload file to invoice
mutation UploadInvoiceFile($file: Upload!, $invoiceId: String!) {
  uploadFileToInvoice(file: $file, invoiceId: $invoiceId) {
    id
    name
    size
    mimeType
    category
    url
    invoice {
      id
      invoiceNumber
    }
    uploadedBy {
      name {
        firstName
        lastName
      }
    }
    createdAt
  }
}

# Get all files for an invoice
query GetInvoiceFiles($invoiceId: String!) {
  getInvoiceFiles(invoiceId: $invoiceId) {
    id
    name
    size
    mimeType
    category
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

# Get invoice with files relation (auto-generated by Twenty)
query GetInvoiceWithFiles($invoiceId: String!) {
  mktInvoice(id: $invoiceId) {
    id
    invoiceNumber
    totalAmount
    files {
      edges {
        node {
          id
          name
          size
          mimeType
          url
          createdAt
        }
      }
    }
  }
}

# Generate download URL
query GetFileDownloadUrl($fileId: String!) {
  getFileDownloadUrl(fileId: $fileId)
}

# Delete file
mutation DeleteFile($fileId: String!) {
  deleteFile(fileId: $fileId)
}
```

### Benefits of Direct Relationship Pattern

| Benefit | Description |
|---------|-------------|
| **Type Safety** | TypeORM relations ensure compile-time type checking |
| **Performance** | Foreign key indexes optimize query performance |
| **GraphQL Auto-Generation** | Twenty automatically generates GraphQL queries/mutations for relations |
| **Database Integrity** | FK constraints prevent orphaned records |
| **Query Flexibility** | Easy to query files by entity or entity by files |
| **RBAC Integration** | Entity-level permissions automatically apply to files |

---

### 3. File Naming & Hashing

#### ✅ DO: SHA-256 Content Hashing

```typescript
import * as crypto from 'crypto';

interface FileIdentifiers {
  uuid: string;           // Unique file record ID
  contentHash: string;    // SHA-256 of content
  storagePath: string;    // Physical location
  originalName: string;   // User-provided name
}

function generateFileIdentifiers(
  buffer: Buffer,
  originalName: string,
): FileIdentifiers {
  // Generate content hash
  const contentHash = crypto
    .createHash('sha256')
    .update(buffer)
    .digest('hex');

  // Generate UUID for metadata
  const uuid = uuidv4();

  // Generate storage path (content-addressable)
  const storagePath = `content/${contentHash.substring(0, 2)}/${contentHash}`;

  return {
    uuid,
    contentHash,
    storagePath,
    originalName,
  };
}

// Check for duplicates
async function uploadWithDeduplication(
  buffer: Buffer,
  metadata: FileMetadata,
): Promise<FileRecord> {
  const { contentHash, storagePath } = generateFileIdentifiers(
    buffer,
    metadata.originalName,
  );

  // Check if content already exists
  const existingFile = await this.fileRepository.findOne({
    where: { contentHash },
  });

  if (existingFile) {
    // Content exists, just create new metadata entry
    return this.createMetadataReference(existingFile, metadata);
  }

  // New content, upload to storage
  await this.storage.write(storagePath, buffer);

  return this.fileRepository.save({
    ...metadata,
    contentHash,
    storagePath,
    referenceCount: 1,
  });
}
```

---

### 4. Security & Access Control

#### ✅ DO: Multi-Layer Security

```typescript
interface SecurityContext {
  userId: string;
  workspaceId: string;
  roles: string[];
  permissions: string[];
}

// Layer 1: Pre-signed URLs (15 min expiry)
async function generatePreSignedUrl(
  fileId: string,
  context: SecurityContext,
): Promise<string> {
  // 1. Verify user has access
  await this.verifyAccess(fileId, context);

  // 2. Get file metadata
  const file = await this.fileRepository.findOne(fileId);

  // 3. Generate S3 pre-signed URL
  const url = await this.s3Client.getSignedUrl('getObject', {
    Bucket: this.bucket,
    Key: file.storagePath,
    Expires: 900, // 15 minutes
    ResponseContentDisposition: `attachment; filename="${file.originalName}"`,
  });

  return url;
}

// Layer 2: JWT Token-based Access
async function verifyFileAccess(
  fileId: string,
  token: string,
): Promise<boolean> {
  try {
    const payload = this.jwtService.verify(token);

    // Check token contains file access
    if (payload.fileId !== fileId) {
      return false;
    }

    // Check expiration
    if (payload.exp < Date.now() / 1000) {
      return false;
    }

    // Check user still has permission
    return this.checkPermission(payload.userId, fileId);
  } catch {
    return false;
  }
}

// Layer 3: RBAC Permission Check
async function checkPermission(
  userId: string,
  fileId: string,
): Promise<boolean> {
  const file = await this.fileRepository.findOne(fileId);

  // Check if user is owner
  if (file.uploadedBy === userId) {
    return true;
  }

  // Check workspace membership
  const isMember = await this.workspaceService.isMember(
    userId,
    file.workspaceId,
  );

  if (!isMember) {
    return false;
  }

  // Check entity-level permissions
  return this.rbacService.hasPermission(
    userId,
    'file:read',
    file.entityType,
    file.entityId,
  );
}

// Layer 4: Rate Limiting
async function checkUploadRateLimit(userId: string): Promise<void> {
  const uploadCount = await this.redis.incr(`upload:count:${userId}`);

  if (uploadCount === 1) {
    // Set expiration on first upload
    await this.redis.expire(`upload:count:${userId}`, 3600); // 1 hour
  }

  if (uploadCount > 100) {
    throw new TooManyRequestsException(
      'Upload rate limit exceeded: 100 uploads per hour'
    );
  }
}
```

#### ❌ DON'T: Direct Public URLs

```typescript
// ❌ BAD: Predictable, no access control
const url = `https://s3.amazonaws.com/${bucket}/${fileId}.pdf`;

// ❌ BAD: Long-lived URLs
const url = await s3.getSignedUrl('getObject', {
  Expires: 86400 * 365, // 1 year - TOO LONG
});

// ✅ GOOD: Short-lived, verified
const url = await this.generatePreSignedUrl(fileId, securityContext);
// Expires in 15 minutes
```

---

### 5. File Validation

#### ✅ DO: Comprehensive Validation

```typescript
import FileType from 'file-type';

interface ValidationRule {
  maxSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  validateContent: boolean;
}

const FILE_VALIDATION_RULES: Record<string, ValidationRule> = {
  invoice: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['application/pdf'],
    allowedExtensions: ['.pdf'],
    validateContent: true,
  },
  document: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    allowedExtensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
    validateContent: true,
  },
  avatar: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    validateContent: true,
  },
};

async function validateFile(
  buffer: Buffer,
  originalName: string,
  fileType: string,
): Promise<void> {
  const rule = FILE_VALIDATION_RULES[fileType];

  if (!rule) {
    throw new BadRequestException(`Unknown file type: ${fileType}`);
  }

  // 1. Check file size
  if (buffer.length > rule.maxSize) {
    throw new BadRequestException(
      `File size ${buffer.length} exceeds limit ${rule.maxSize}`
    );
  }

  // 2. Check extension
  const ext = path.extname(originalName).toLowerCase();
  if (!rule.allowedExtensions.includes(ext)) {
    throw new BadRequestException(`File extension ${ext} not allowed`);
  }

  // 3. Detect actual MIME type from content
  if (rule.validateContent) {
    const detected = await FileType.fromBuffer(buffer);

    if (!detected) {
      throw new BadRequestException('Unable to detect file type');
    }

    if (!rule.allowedMimeTypes.includes(detected.mime)) {
      throw new BadRequestException(
        `File type ${detected.mime} does not match allowed types`
      );
    }

    // 4. Verify extension matches detected type
    const expectedExt = `.${detected.ext}`;
    if (ext !== expectedExt) {
      throw new BadRequestException(
        `File extension ${ext} does not match content type ${expectedExt}`
      );
    }
  }

  // 5. Check file size again (double check after content detection)
  if (buffer.length > rule.maxSize) {
    throw new BadRequestException('File size validation failed');
  }
}
```

---

### 6. Chunked Upload for Large Files

#### ✅ DO: S3 Multipart Upload

```typescript
interface UploadSession {
  sessionId: string;
  uploadId: string; // S3 multipart upload ID
  fileSize: number;
  chunkSize: number;
  totalChunks: number;
  uploadedParts: Map<number, string>; // partNumber → ETag
  createdAt: Date;
  expiresAt: Date;
}

class ChunkedUploadService {
  private sessions = new Map<string, UploadSession>();
  private readonly CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

  // Step 1: Initialize upload
  async initializeUpload(
    fileName: string,
    fileSize: number,
    mimeType: string,
  ): Promise<{ sessionId: string; chunkSize: number }> {
    const sessionId = uuidv4();
    const storagePath = `temp/uploads/${sessionId}`;

    // Initialize S3 multipart upload
    const { UploadId } = await this.s3.createMultipartUpload({
      Bucket: this.bucket,
      Key: storagePath,
      ContentType: mimeType,
    });

    const session: UploadSession = {
      sessionId,
      uploadId: UploadId,
      fileSize,
      chunkSize: this.CHUNK_SIZE,
      totalChunks: Math.ceil(fileSize / this.CHUNK_SIZE),
      uploadedParts: new Map(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000), // 24h
    };

    this.sessions.set(sessionId, session);

    return {
      sessionId,
      chunkSize: this.CHUNK_SIZE,
    };
  }

  // Step 2: Upload chunk
  async uploadChunk(
    sessionId: string,
    partNumber: number,
    chunk: Buffer,
  ): Promise<{ uploaded: number; total: number }> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new NotFoundException('Upload session not found or expired');
    }

    // Upload part to S3
    const { ETag } = await this.s3.uploadPart({
      Bucket: this.bucket,
      Key: `temp/uploads/${sessionId}`,
      UploadId: session.uploadId,
      PartNumber: partNumber,
      Body: chunk,
    });

    // Track uploaded part
    session.uploadedParts.set(partNumber, ETag);

    return {
      uploaded: session.uploadedParts.size,
      total: session.totalChunks,
    };
  }

  // Step 3: Complete upload
  async completeUpload(
    sessionId: string,
    finalPath: string,
  ): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new NotFoundException('Upload session not found');
    }

    // Verify all parts uploaded
    if (session.uploadedParts.size !== session.totalChunks) {
      throw new BadRequestException(
        `Missing chunks: ${session.totalChunks - session.uploadedParts.size}`
      );
    }

    // Complete S3 multipart upload
    const parts = Array.from(session.uploadedParts.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([PartNumber, ETag]) => ({ PartNumber, ETag }));

    await this.s3.completeMultipartUpload({
      Bucket: this.bucket,
      Key: `temp/uploads/${sessionId}`,
      UploadId: session.uploadId,
      MultipartUpload: { Parts: parts },
    });

    // Move to final location
    await this.s3.copyObject({
      CopySource: `${this.bucket}/temp/uploads/${sessionId}`,
      Bucket: this.bucket,
      Key: finalPath,
    });

    // Cleanup
    await this.s3.deleteObject({
      Bucket: this.bucket,
      Key: `temp/uploads/${sessionId}`,
    });

    this.sessions.delete(sessionId);
  }

  // Resume upload (get missing chunks)
  async getMissingChunks(sessionId: string): Promise<number[]> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new NotFoundException('Upload session not found or expired');
    }

    const allChunks = Array.from(
      { length: session.totalChunks },
      (_, i) => i + 1
    );

    return allChunks.filter(
      chunk => !session.uploadedParts.has(chunk)
    );
  }

  // Abort upload
  async abortUpload(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (session) {
      await this.s3.abortMultipartUpload({
        Bucket: this.bucket,
        Key: `temp/uploads/${sessionId}`,
        UploadId: session.uploadId,
      });

      this.sessions.delete(sessionId);
    }
  }

  // Cleanup expired sessions (cron job)
  @Cron('0 * * * *') // Every hour
  async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        await this.abortUpload(sessionId);
      }
    }
  }
}
```

---

### 7. Image Processing

#### ✅ DO: Generate Multiple Variants

```typescript
import sharp from 'sharp';

interface ImageVariant {
  name: string;
  width?: number;
  height?: number;
  fit: 'cover' | 'contain' | 'fill';
  format: 'jpeg' | 'webp' | 'png';
  quality: number;
}

const IMAGE_PRESETS: Record<string, ImageVariant[]> = {
  avatar: [
    { name: 'thumb', width: 64, height: 64, fit: 'cover', format: 'jpeg', quality: 80 },
    { name: 'small', width: 128, height: 128, fit: 'cover', format: 'jpeg', quality: 85 },
    { name: 'medium', width: 256, height: 256, fit: 'cover', format: 'jpeg', quality: 90 },
    { name: 'webp', width: 256, height: 256, fit: 'cover', format: 'webp', quality: 85 },
  ],
  product: [
    { name: 'thumb', width: 200, height: 200, fit: 'contain', format: 'jpeg', quality: 80 },
    { name: 'gallery', width: 800, height: 800, fit: 'contain', format: 'jpeg', quality: 90 },
    { name: 'zoom', width: 1600, height: 1600, fit: 'contain', format: 'jpeg', quality: 95 },
    { name: 'webp-thumb', width: 200, height: 200, fit: 'contain', format: 'webp', quality: 80 },
    { name: 'webp-gallery', width: 800, height: 800, fit: 'contain', format: 'webp', quality: 85 },
  ],
};

async function processImage(
  buffer: Buffer,
  presetName: string,
): Promise<Map<string, Buffer>> {
  const variants = IMAGE_PRESETS[presetName];
  const results = new Map<string, Buffer>();

  // Process in parallel
  await Promise.all(
    variants.map(async (variant) => {
      let pipeline = sharp(buffer)
        .rotate() // Auto-rotate based on EXIF
        .resize({
          width: variant.width,
          height: variant.height,
          fit: variant.fit,
          withoutEnlargement: true,
        });

      // Apply format-specific options
      switch (variant.format) {
        case 'jpeg':
          pipeline = pipeline.jpeg({
            quality: variant.quality,
            progressive: true,
            mozjpeg: true,
          });
          break;

        case 'webp':
          pipeline = pipeline.webp({
            quality: variant.quality,
            effort: 4,
          });
          break;

        case 'png':
          pipeline = pipeline.png({
            quality: variant.quality,
            compressionLevel: 9,
          });
          break;
      }

      const processed = await pipeline.toBuffer();
      results.set(variant.name, processed);
    })
  );

  return results;
}

// Upload all variants
async function uploadImageWithVariants(
  buffer: Buffer,
  presetName: string,
  basePath: string,
): Promise<FileRecord[]> {
  const variants = await this.processImage(buffer, presetName);
  const records: FileRecord[] = [];

  for (const [variantName, variantBuffer] of variants) {
    const ext = variantName.includes('webp') ? 'webp' : 'jpg';
    const storagePath = `${basePath}/${variantName}.${ext}`;

    // Upload to S3
    await this.storage.write(storagePath, variantBuffer);

    // Save metadata
    records.push({
      id: uuidv4(),
      storagePath,
      variant: variantName,
      size: variantBuffer.length,
      mimeType: `image/${ext}`,
    });
  }

  return records;
}
```

---

## 📡 API Design

### GraphQL Schema (with Direct Relationships)

```graphql
# MktFile type with direct relations to business entities
type MktFile {
  id: ID!
  name: String!
  size: Int!
  mimeType: String!
  s3Key: String!
  s3Bucket: String!
  contentHash: String!
  category: FileCategory!
  url: String  # CloudFront signed URL (generated on-demand)

  # Direct relations to business entities (null if not attached)
  invoice: MktInvoice
  invoiceId: ID

  order: MktOrder
  orderId: ID

  license: MktLicense
  licenseId: ID

  # Who uploaded this file
  uploadedBy: WorkspaceMember!
  uploadedById: ID!

  # Timestamps
  createdAt: DateTime!
  updatedAt: DateTime!
  deletedAt: DateTime
}

enum FileCategory {
  INVOICE
  CONTRACT
  ORDER_ATTACHMENT
  LICENSE_PROOF
  AVATAR
  DOCUMENT
  OTHER
}

# Inverse relations on business entities
type MktInvoice {
  id: ID!
  invoiceNumber: String!
  # ... other fields ...

  # One-to-many relation to files
  files: [MktFile!]
}

type MktOrder {
  id: ID!
  orderNumber: String!
  # ... other fields ...

  # One-to-many relation to files
  files: [MktFile!]
}

type MktLicense {
  id: ID!
  licenseKey: String!
  # ... other fields ...

  # One-to-many relation to files
  files: [MktFile!]
}

# Queries
type Query {
  # Get file by ID
  mktFile(id: ID!): MktFile

  # Get all files (with filters)
  mktFiles(
    filter: MktFileFilterInput
    orderBy: [MktFileOrderByInput!]
    limit: Int
    offset: Int
  ): MktFileConnection!

  # Get files by entity (custom resolver)
  getInvoiceFiles(invoiceId: ID!): [MktFile!]!
  getOrderFiles(orderId: ID!): [MktFile!]!
  getLicenseFiles(licenseId: ID!): [MktFile!]!

  # Generate download URL
  getFileDownloadUrl(fileId: ID!, expiresIn: Int): String!

  # Get invoice with files (using auto-generated relation)
  mktInvoice(id: ID!): MktInvoice
}

# Mutations
type Mutation {
  # Upload file to specific entity
  uploadFileToInvoice(file: Upload!, invoiceId: ID!): MktFile!
  uploadFileToOrder(file: Upload!, orderId: ID!): MktFile!
  uploadFileToLicense(file: Upload!, licenseId: ID!): MktFile!

  # Generic file operations
  deleteFile(id: ID!): Boolean!
  updateFileMetadata(id: ID!, category: FileCategory): MktFile!

  # Chunked upload for large files
  initializeChunkedUpload(
    fileName: String!
    fileSize: Int!
    mimeType: String!
    entityType: String!
    entityId: ID!
  ): UploadSession!

  uploadChunk(
    sessionId: ID!
    partNumber: Int!
    chunk: Upload!
  ): ChunkUploadResult!

  completeChunkedUpload(sessionId: ID!): MktFile!
  abortChunkedUpload(sessionId: ID!): Boolean!
}

# Filter input
input MktFileFilterInput {
  invoiceId: IDFilterInput
  orderId: IDFilterInput
  licenseId: IDFilterInput
  category: FileCategory
  uploadedById: IDFilterInput
  createdAt: DateFilterInput
}

# Order by input
input MktFileOrderByInput {
  createdAt: OrderDirection
  size: OrderDirection
  name: OrderDirection
}

enum OrderDirection {
  ASC
  DESC
}

# Connection type for pagination
type MktFileConnection {
  edges: [MktFileEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type MktFileEdge {
  node: MktFile!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

# Chunked upload types
type UploadSession {
  sessionId: ID!
  chunkSize: Int!
  totalChunks: Int!
  expiresAt: DateTime!
}

type ChunkUploadResult {
  uploaded: Int!
  total: Int!
  progress: Float!
}
```

### GraphQL Query Usage Examples

```graphql
# Example 1: Upload file to invoice
mutation UploadInvoicePDF {
  uploadFileToInvoice(
    file: $pdfFile
    invoiceId: "invoice-123"
  ) {
    id
    name
    size
    mimeType
    category
    url
    invoice {
      id
      invoiceNumber
    }
    uploadedBy {
      nameFirstName
      nameLastName
    }
    createdAt
  }
}

# Example 2: Get invoice with all files (using auto-generated relation)
query GetInvoiceWithFiles {
  mktInvoice(id: "invoice-123") {
    id
    invoiceNumber
    totalAmount
    status
    files {
      id
      name
      size
      mimeType
      url
      createdAt
      uploadedBy {
        nameFirstName
        nameLastName
      }
    }
  }
}

# Example 3: Get all files for an invoice (custom resolver)
query GetInvoiceFiles {
  getInvoiceFiles(invoiceId: "invoice-123") {
    id
    name
    size
    mimeType
    category
    url
    createdAt
  }
}

# Example 4: Filter files by category
query GetInvoicePDFFiles {
  mktFiles(
    filter: {
      invoiceId: { eq: "invoice-123" }
      category: INVOICE
    }
    orderBy: [{ createdAt: DESC }]
  ) {
    edges {
      node {
        id
        name
        size
        url
        createdAt
      }
    }
    pageInfo {
      hasNextPage
      totalCount
    }
  }
}

# Example 5: Get download URL
query GetFileDownloadUrl {
  getFileDownloadUrl(
    fileId: "file-456"
    expiresIn: 900  # 15 minutes
  )
}

# Example 6: Get order with attachments
query GetOrderWithAttachments {
  mktOrder(id: "order-789") {
    id
    orderNumber
    status
    files {
      id
      name
      size
      mimeType
      category
      url
    }
  }
}

# Example 7: Delete file
mutation DeleteFile {
  deleteFile(id: "file-456")
}
```

### REST Endpoints

```typescript
// File download endpoint
@Controller('files')
export class FileController {
  @Get(':fileId/download')
  async downloadFile(
    @Param('fileId') fileId: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    // Verify token
    const isValid = await this.fileService.verifyToken(token, fileId);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Get file stream
    const { stream, metadata } = await this.fileService.getFileStream(fileId);

    // Set headers
    res.setHeader('Content-Type', metadata.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${metadata.originalName}"`
    );
    res.setHeader('Content-Length', metadata.size);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    // Stream file
    stream.pipe(res);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() metadata: FileUploadDto,
  ) {
    return this.fileService.uploadFile(file.buffer, metadata);
  }
}
```

---

## 🔄 Performance Optimization

### 1. Caching Strategy

```typescript
/**
 * Cache only metadata in Redis, not file content
 * File content served directly from CloudFront CDN
 */
class FileCacheService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // Cache metadata only (lightweight)
  async cacheMetadata(file: FileRecord): Promise<void> {
    await this.cacheManager.set(
      `file:meta:${file.id}`,
      {
        id: file.id,
        originalName: file.originalName,
        s3Key: file.storagePath,
        size: file.size,
        mimeType: file.mimeType,
        uploadedBy: file.uploadedBy,
        createdAt: file.createdAt,
      },
      3600, // 1 hour
    );
  }

  async getCachedMetadata(fileId: string): Promise<FileRecord | null> {
    return this.cacheManager.get(`file:meta:${fileId}`);
  }

  // Cache pre-signed URLs (short TTL)
  async cachePreSignedUrl(
    fileId: string,
    url: string,
    ttl: number = 600, // 10 minutes
  ): Promise<void> {
    await this.cacheManager.set(`file:url:${fileId}`, url, ttl);
  }

  async getCachedUrl(fileId: string): Promise<string | null> {
    return this.cacheManager.get(`file:url:${fileId}`);
  }
}

// Download: Always from S3/CloudFront (no file content cache)
async function generateDownloadUrl(fileId: string): Promise<string> {
  // Try cached URL first
  const cachedUrl = await this.cacheService.getCachedUrl(fileId);
  if (cachedUrl) {
    return cachedUrl;
  }

  // Get metadata (from cache or DB)
  const file = await this.getFileMetadata(fileId);

  // Generate CloudFront signed URL
  const url = await this.generateCdnUrl(file.storagePath);

  // Cache URL for 10 minutes
  await this.cacheService.cachePreSignedUrl(fileId, url, 600);

  return url;
}
```

### 2. CloudFront CDN Integration

```typescript
/**
 * CloudFront Distribution Configuration
 * - Origin: S3 bucket
 * - Signed URLs for private files
 * - Edge caching for performance
 */

import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import * as fs from 'fs';

interface CloudFrontConfig {
  distributionDomain: string;
  keyPairId: string;
  privateKeyPath: string;
  defaultTTL: number;
  maxTTL: number;
}

const cdnConfig: CloudFrontConfig = {
  distributionDomain: process.env.CLOUDFRONT_DOMAIN, // d123abc.cloudfront.net
  keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID,
  privateKeyPath: process.env.CLOUDFRONT_PRIVATE_KEY_PATH,
  defaultTTL: 86400,  // 24 hours
  maxTTL: 31536000,   // 1 year
};

class CloudFrontService {
  private privateKey: string;

  constructor() {
    // Load private key once at startup
    this.privateKey = fs.readFileSync(cdnConfig.privateKeyPath, 'utf8');
  }

  /**
   * Generate signed CloudFront URL
   * All file access goes through CloudFront (not direct S3)
   */
  async generateSignedUrl(
    s3Key: string,
    expiresIn: number = 900, // 15 minutes default
  ): Promise<string> {
    const cloudFrontUrl = `https://${cdnConfig.distributionDomain}/${s3Key}`;

    const signedUrl = getSignedUrl({
      url: cloudFrontUrl,
      keyPairId: cdnConfig.keyPairId,
      privateKey: this.privateKey,
      dateLessThan: new Date(Date.now() + expiresIn * 1000).toISOString(),
    });

    return signedUrl;
  }

  /**
   * For public files (avatars, logos)
   * No signing needed, cached by CloudFront
   */
  getPublicUrl(s3Key: string): string {
    return `https://${cdnConfig.distributionDomain}/${s3Key}`;
  }

  /**
   * Invalidate CloudFront cache (use sparingly - costs $0.005 per path)
   */
  async invalidateCache(paths: string[]): Promise<void> {
    const cloudfront = new CloudFrontClient({ region: 'us-east-1' });

    await cloudfront.send(new CreateInvalidationCommand({
      DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
      InvalidationBatch: {
        CallerReference: Date.now().toString(),
        Paths: {
          Quantity: paths.length,
          Items: paths.map(path => `/${path}`),
        },
      },
    }));
  }
}

// Usage in file service
async function getDownloadUrl(fileId: string): Promise<string> {
  const file = await this.fileRepository.findOne(fileId);

  // Public files: direct CloudFront URL (cached at edge)
  if (file.isPublic) {
    return this.cloudfront.getPublicUrl(file.storagePath);
  }

  // Private files: signed URL with 15min expiry
  return this.cloudfront.generateSignedUrl(file.storagePath, 900);
}
```

**CloudFront Benefits:**
- **Performance**: Edge locations worldwide (300+ POPs)
- **Cost**: Cheaper bandwidth than S3 direct ($0.085/GB vs $0.09/GB)
- **Security**: Signed URLs prevent unauthorized access
- **Caching**: Reduces S3 GET requests (saves money)
- **Compression**: Automatic gzip/brotli compression

---

## 📊 Monitoring & Analytics

### Metrics to Track

```typescript
// Prometheus metrics
import { Counter, Histogram, Gauge } from 'prom-client';

const fileMetrics = {
  uploads: new Counter({
    name: 'file_uploads_total',
    help: 'Total file uploads',
    labelNames: ['workspace', 'entity_type', 'storage_type'],
  }),

  downloads: new Counter({
    name: 'file_downloads_total',
    help: 'Total file downloads',
    labelNames: ['workspace', 'entity_type'],
  }),

  storageUsed: new Gauge({
    name: 'file_storage_bytes',
    help: 'Total storage used in bytes',
    labelNames: ['workspace', 'storage_type'],
  }),

  uploadDuration: new Histogram({
    name: 'file_upload_duration_seconds',
    help: 'File upload duration',
    labelNames: ['size_range', 'storage_type'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  }),

  processingDuration: new Histogram({
    name: 'file_processing_duration_seconds',
    help: 'File processing duration',
    labelNames: ['operation', 'file_type'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  }),
};

// Track upload
async function uploadFile(buffer: Buffer, metadata: FileMetadata) {
  const startTime = Date.now();

  try {
    await this.storage.write(buffer, metadata);

    fileMetrics.uploads.inc({
      workspace: metadata.workspaceId,
      entity_type: metadata.entityType,
      storage_type: 's3',
    });

    fileMetrics.uploadDuration.observe(
      {
        size_range: this.getSizeRange(buffer.length),
        storage_type: 's3',
      },
      (Date.now() - startTime) / 1000
    );

    fileMetrics.storageUsed.inc(
      { workspace: metadata.workspaceId, storage_type: 's3' },
      buffer.length
    );
  } catch (error) {
    // Track errors
    throw error;
  }
}
```

---

## 💰 Cost Optimization

### S3 Lifecycle Management

```typescript
// Lifecycle policy
const lifecycleRules = [
  {
    Id: 'TransitionToIA',
    Status: 'Enabled',
    Filter: { Prefix: 'workspaces/' },
    Transitions: [
      { Days: 30, StorageClass: 'STANDARD_IA' },
      { Days: 90, StorageClass: 'GLACIER_INSTANT_RETRIEVAL' },
    ],
  },
  {
    Id: 'DeleteTempFiles',
    Status: 'Enabled',
    Filter: { Prefix: 'temp/' },
    Expiration: { Days: 1 },
  },
  {
    Id: 'CleanupOldVersions',
    Status: 'Enabled',
    NoncurrentVersionExpiration: { NoncurrentDays: 90 },
  },
];

// Cost calculator
interface StorageCost {
  standard: number;
  ia: number;
  glacier: number;
  requests: number;
  bandwidth: number;
  total: number;
}

function calculateMonthlyCost(usage: {
  standardGB: number;
  iaGB: number;
  glacierGB: number;
  requests: number;
  bandwidthGB: number;
}): StorageCost {
  return {
    standard: usage.standardGB * 0.023,
    ia: usage.iaGB * 0.0125,
    glacier: usage.glacierGB * 0.004,
    requests: (usage.requests * 0.005) / 1000,
    bandwidth: Math.max(0, usage.bandwidthGB - 100) * 0.09,
    total:
      usage.standardGB * 0.023 +
      usage.iaGB * 0.0125 +
      usage.glacierGB * 0.004 +
      (usage.requests * 0.005) / 1000 +
      Math.max(0, usage.bandwidthGB - 100) * 0.09,
  };
}
```

---

## 🔄 Storage Strategy

### S3 Storage Classes & Lifecycle

```typescript
/**
 * All files stored in S3 with automatic lifecycle transitions
 * Application always uploads to STANDARD, S3 handles transitions
 */

interface S3LifecycleConfig {
  rules: Array<{
    id: string;
    prefix: string;
    transitions: Array<{
      days: number;
      storageClass: string;
    }>;
    expiration?: {
      days: number;
    };
  }>;
}

const lifecycleConfig: S3LifecycleConfig = {
  rules: [
    {
      id: 'TransitionProductionFiles',
      prefix: 'workspaces/',
      transitions: [
        { days: 30, storageClass: 'STANDARD_IA' },      // $0.0125/GB after 30 days
        { days: 90, storageClass: 'GLACIER_INSTANT_RETRIEVAL' }, // $0.004/GB after 90 days
      ],
    },
    {
      id: 'DeleteTempFiles',
      prefix: 'temp/',
      expiration: { days: 1 }, // Auto-delete after 24h
    },
    {
      id: 'CleanupOldVersions',
      prefix: '',
      transitions: [
        { days: 90, storageClass: 'GLACIER_DEEP_ARCHIVE' },
      ],
    },
  ],
};

/**
 * Cost Breakdown:
 * - Day 0-29:   STANDARD ($0.023/GB)
 * - Day 30-89:  STANDARD_IA ($0.0125/GB)  - 46% cheaper
 * - Day 90+:    GLACIER ($0.004/GB)       - 83% cheaper
 */
```

---

## 📝 Summary

### Key Design Principles

1. ✅ **Direct Entity Relationships** → Foreign keys linking files to Invoice/Order/License (type-safe, performant)
2. ✅ **S3-Only Storage** → All files in S3, no local filesystem
3. ✅ **Content-Addressable Storage** → Automatic deduplication via SHA-256
4. ✅ **Multi-Layer Security** → Pre-signed URLs + JWT + RBAC + File Validation
5. ✅ **CloudFront CDN** → Fast global delivery, edge caching
6. ✅ **S3 Lifecycle Management** → Automatic cost optimization
7. ✅ **Chunked Upload** → Large file support with resume (S3 multipart)
8. ✅ **Image Optimization** → Multiple variants + WebP format
9. ✅ **Metadata Cache** → Redis cache for file metadata only
10. ✅ **Monitoring** → Prometheus metrics + CloudWatch
11. ✅ **Compliance** → Audit logging + S3 encryption

### Anti-Patterns to Avoid

❌ Storing binary in database or local filesystem
❌ Caching file content in Redis (use CloudFront instead)
❌ Manual storage class transitions (use S3 lifecycle)
❌ Predictable/long-lived file URLs (use short-lived pre-signed URLs)
❌ No file validation (MIME type, size, content)
❌ No deduplication (wastes storage)
❌ Missing audit logs
❌ No backup/versioning strategy
❌ No rate limiting on uploads

---

**Author**: MKT-Core Team
**Last Updated**: 2026-02-06
**Version**: 2.0.0 (Backend Focus)
