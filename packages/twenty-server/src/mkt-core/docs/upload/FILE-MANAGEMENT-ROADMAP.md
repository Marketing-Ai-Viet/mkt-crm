# File Management System - Implementation Roadmap

## 📋 Overview

Roadmap triển khai hệ thống quản lý file cho mkt-core với **Direct Relationship Pattern** và **S3-only storage**.

**Tài liệu tham khảo:**
- [FILE-MANAGEMENT-SYSTEM-DESIGN.md](FILE-MANAGEMENT-SYSTEM-DESIGN.md) - System design
- [FILE-RELATIONSHIP-EXAMPLES.md](FILE-RELATIONSHIP-EXAMPLES.md) - Relationship patterns
- [FILE-MANAGEMENT-IMPLEMENTATION-EXAMPLE.md](FILE-MANAGEMENT-IMPLEMENTATION-EXAMPLE.md) - Code examples
- [AWS-S3-INTEGRATION-GUIDE.md](./AWS-S3-INTEGRATION-GUIDE.md) - AWS setup
- [MKT-CORE-DEPLOYMENT-GUIDE.md](MKT-CORE-DEPLOYMENT-GUIDE.md) - Deployment guide

---

## 🎯 Implementation Phases

### Phase 1: Foundation & Infrastructure (Week 1-2)
**Goal**: Setup AWS S3, CloudFront, và core infrastructure

### Phase 2: Core File Management (Week 3-4)
**Goal**: Implement MktFileWorkspaceEntity, service layer, và basic upload/download

### Phase 3: Entity Relationships (Week 5-6)
**Goal**: Link files với Invoice, Order, License

### Phase 4: Advanced Features (Week 7-8)
**Goal**: Chunked upload, deduplication, caching

### Phase 5: Testing & Production (Week 9-10)
**Goal**: Testing, monitoring, production deployment

### Phase 6: Image Processing (Future - Deferred)
**Goal**: Image optimization, multiple variants, WebP conversion

---

## 📅 Detailed Timeline

---

## Phase 1: Foundation & Infrastructure (Week 1-2)

### ✅ Prerequisites

- [ ] Access to AWS account with admin permissions
- [ ] Node.js 20+ installed
- [ ] PostgreSQL 15+ running
- [ ] Redis 7+ running
- [ ] Twenty CRM development environment setup

### 🎯 Goals

- Setup AWS S3 bucket with proper configuration
- Configure CloudFront CDN
- Setup IAM roles and policies
- Configure environment variables
- Test S3 connectivity

### 📋 Tasks

#### Task 1.1: AWS S3 Bucket Setup (2 hours)

**Reference**: [AWS-S3-INTEGRATION-GUIDE.md](./AWS-S3-INTEGRATION-GUIDE.md) - Section "Step 1: Create S3 Bucket"

```bash
# 1. Create S3 bucket via AWS Console or CLI
aws s3api create-bucket \
  --bucket crm-files-production \
  --region ap-southeast-1 \
  --create-bucket-configuration LocationConstraint=ap-southeast-1

# 2. Enable versioning
aws s3api put-bucket-versioning \
  --bucket crm-files-production \
  --versioning-configuration Status=Enabled

# 3. Enable server-side encryption
aws s3api put-bucket-encryption \
  --bucket crm-files-production \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# 4. Block public access
aws s3api put-public-access-block \
  --bucket crm-files-production \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

**Acceptance Criteria**:
- ✅ S3 bucket created in correct region
- ✅ Versioning enabled
- ✅ Encryption enabled (AES256)
- ✅ Public access blocked

---

#### Task 1.2: S3 Lifecycle Policy (1 hour)

**Reference**: [FILE-MANAGEMENT-SYSTEM-DESIGN.md](FILE-MANAGEMENT-SYSTEM-DESIGN.md) - Section "Storage Strategy"

```json
{
  "Rules": [
    {
      "Id": "TransitionProductionFiles",
      "Status": "Enabled",
      "Filter": { "Prefix": "workspaces/" },
      "Transitions": [
        { "Days": 30, "StorageClass": "STANDARD_IA" },
        { "Days": 90, "StorageClass": "GLACIER_INSTANT_RETRIEVAL" }
      ]
    },
    {
      "Id": "DeleteTempFiles",
      "Status": "Enabled",
      "Filter": { "Prefix": "temp/" },
      "Expiration": { "Days": 1 }
    }
  ]
}
```

**Apply lifecycle policy**:
```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket crm-files-production \
  --lifecycle-configuration file://lifecycle-policy.json
```

**Acceptance Criteria**:
- ✅ Lifecycle policy applied
- ✅ Verified transitions: STANDARD → IA (30d) → GLACIER (90d)
- ✅ Temp files auto-delete after 24h

---

#### Task 1.3: CORS Configuration (30 mins)

**Reference**: [AWS-S3-INTEGRATION-GUIDE.md](./AWS-S3-INTEGRATION-GUIDE.md) - Section "CORS Configuration"

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://crm.yourdomain.com"
    ],
    "ExposeHeaders": ["ETag", "x-amz-server-side-encryption"],
    "MaxAgeSeconds": 3600
  }
]
```

```bash
aws s3api put-bucket-cors \
  --bucket crm-files-production \
  --cors-configuration file://cors-config.json
```

**Acceptance Criteria**:
- ✅ CORS policy applied
- ✅ Tested from localhost:3000
- ✅ Verified preflight OPTIONS requests work

---

#### Task 1.4: IAM Role & Policy (1.5 hours)

**Reference**: [AWS-S3-INTEGRATION-GUIDE.md](./AWS-S3-INTEGRATION-GUIDE.md) - Section "IAM Configuration"

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:PutObjectAcl"
      ],
      "Resource": [
        "arn:aws:s3:::crm-files-production",
        "arn:aws:s3:::crm-files-production/*"
      ]
    }
  ]
}
```

**Create IAM user**:
```bash
# 1. Create IAM user
aws iam create-user --user-name crm-s3-user

# 2. Create policy
aws iam create-policy \
  --policy-name CRM-S3-Access \
  --policy-document file://s3-policy.json

# 3. Attach policy to user
aws iam attach-user-policy \
  --user-name crm-s3-user \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/CRM-S3-Access

# 4. Create access keys
aws iam create-access-key --user-name crm-s3-user
```

**Save credentials**:
```
AWS_ACCESS_KEY_ID=AKIAxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxx
```

**Acceptance Criteria**:
- ✅ IAM user created with limited permissions
- ✅ Access keys generated and saved securely
- ✅ Tested S3 operations with new credentials

---

#### Task 1.5: CloudFront Distribution (2 hours)

**Reference**: [FILE-MANAGEMENT-SYSTEM-DESIGN.md](FILE-MANAGEMENT-SYSTEM-DESIGN.md) - Section "CloudFront CDN Integration"

**Create CloudFront distribution**:
```bash
aws cloudfront create-distribution \
  --origin-domain-name crm-files-production.s3.ap-southeast-1.amazonaws.com \
  --default-root-object index.html
```

**Key settings**:
- Origin: S3 bucket (crm-files-production)
- Viewer Protocol Policy: Redirect HTTP to HTTPS
- Allowed HTTP Methods: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
- Cache Policy: CachingOptimized (30 days)
- Origin Shield: Enabled (Singapore)
- Price Class: Use All Edge Locations

**Generate CloudFront Key Pair for Signed URLs**:
```bash
# 1. Go to AWS Console → Security Credentials → CloudFront Key Pairs
# 2. Create Key Pair
# 3. Download private key (pk-XXX.pem)
# 4. Save Key Pair ID
```

**Acceptance Criteria**:
- ✅ CloudFront distribution created and deployed (15-30 mins)
- ✅ Custom domain configured (if needed)
- ✅ SSL certificate configured
- ✅ CloudFront key pair created for signed URLs
- ✅ Tested file access via CloudFront URL

---

#### Task 1.6: Environment Variables (30 mins)

**Reference**: [MKT-CORE-DEPLOYMENT-GUIDE.md](MKT-CORE-DEPLOYMENT-GUIDE.md) - Section "Environment Variables"

Add to `.env`:
```bash
# AWS S3 Configuration
STORAGE_TYPE=s3
STORAGE_S3_REGION=ap-southeast-1
STORAGE_S3_NAME=crm-files-production
AWS_ACCESS_KEY_ID=AKIAxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxx

# CloudFront Configuration
CLOUDFRONT_DOMAIN=d123abc456def.cloudfront.net
CLOUDFRONT_KEY_PAIR_ID=K3D9XXXXX
CLOUDFRONT_PRIVATE_KEY_PATH=/path/to/pk-XXX.pem

# File Upload Limits
FILE_UPLOAD_MAX_SIZE=104857600  # 100MB in bytes
FILE_UPLOAD_MAX_FILES=10
```

**Acceptance Criteria**:
- ✅ All S3 environment variables configured
- ✅ CloudFront credentials configured
- ✅ Verified environment loads correctly

---

#### Task 1.7: Test S3 Connection (1 hour)

Create test script:
```typescript
// scripts/test-s3-connection.ts

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

async function testS3Connection() {
  const s3Client = new S3Client({
    region: process.env.STORAGE_S3_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    // Test upload
    const testKey = `test/${Date.now()}-test.txt`;
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.STORAGE_S3_NAME,
      Key: testKey,
      Body: 'Hello from Twenty CRM',
      ContentType: 'text/plain',
    }));
    console.log('✅ Upload successful');

    // Test download
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: process.env.STORAGE_S3_NAME,
      Key: testKey,
    }));
    console.log('✅ Download successful');

    // Cleanup
    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.STORAGE_S3_NAME,
      Key: testKey,
    }));
    console.log('✅ Delete successful');

    console.log('🎉 S3 connection test PASSED');
  } catch (error) {
    console.error('❌ S3 connection test FAILED:', error);
    process.exit(1);
  }
}

testS3Connection();
```

**Run test**:
```bash
npx tsx scripts/test-s3-connection.ts
```

**Acceptance Criteria**:
- ✅ Upload test passes
- ✅ Download test passes
- ✅ Delete test passes
- ✅ No permission errors

---

### 📊 Phase 1 Completion Checklist

- [ ] S3 bucket created with proper configuration
- [ ] Lifecycle policy applied
- [ ] CORS configured
- [ ] IAM user with limited permissions created
- [ ] CloudFront distribution deployed
- [ ] CloudFront key pair generated
- [ ] Environment variables configured
- [ ] S3 connection tested successfully
- [ ] Documentation updated with actual resource names

**Estimated Time**: 8-10 hours (1-2 weeks calendar time for AWS propagation)

---

## Phase 2: Core File Management (Week 3-4)

### 🎯 Goals

- Create MktFileWorkspaceEntity
- Implement MktFileService with upload/download
- Add file validation
- Implement content-addressable storage with deduplication
- Setup metadata caching with Redis

### 📋 Tasks

#### Task 2.1: Create MktFileWorkspaceEntity (2 hours)

**Reference**: [FILE-RELATIONSHIP-EXAMPLES.md](FILE-RELATIONSHIP-EXAMPLES.md) - Section "MktFileWorkspaceEntity"

Create file:
```
packages/twenty-server/src/mkt-core/file/mkt-file.workspace-entity.ts
```

**Implementation**:
```typescript
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { FieldMetadataType } from 'src/engine/metadata-modules/field-metadata/field-metadata.entity';

@WorkspaceEntity({
  standardId: 'mkt-file',
  namePlural: 'mktFiles',
  labelSingular: 'File',
  labelPlural: 'Files',
  description: 'File attachments for invoices, orders, licenses',
  icon: 'IconFile',
})
export class MktFileWorkspaceEntity extends BaseWorkspaceEntity {
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

  @WorkspaceField({
    standardId: 'mkt-file-hash',
    type: FieldMetadataType.TEXT,
    label: 'Content Hash',
    description: 'SHA-256 hash for deduplication',
    icon: 'IconHash',
  })
  contentHash: string;

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
      { value: 'DOCUMENT', label: 'Document', position: 4, color: 'yellow' },
      { value: 'OTHER', label: 'Other', position: 5, color: 'gray' },
    ],
    defaultValue: "'OTHER'",
  })
  category: string;

  @WorkspaceField({
    standardId: 'mkt-file-url',
    type: FieldMetadataType.TEXT,
    label: 'Download URL',
    description: 'CloudFront signed URL (temporary)',
    icon: 'IconLink',
  })
  @WorkspaceIsNullable()
  url?: string;

  // Relations will be added in Phase 3
}
```

**Sync metadata**:
```bash
npx nx run twenty-server:command workspace:sync-metadata -f
```

**Acceptance Criteria**:
- ✅ Entity file created
- ✅ All fields defined with proper types
- ✅ Metadata synced successfully
- ✅ Entity appears in GraphQL schema

---

#### Task 2.2: Add MktFile to mkt-core.module.ts (15 mins)

Update:
```typescript
// packages/twenty-server/src/mkt-core/mkt-core.module.ts

import { MktFileWorkspaceEntity } from './file/mkt-file.workspace-entity';

@Module({
  imports: [
    // ... other imports
  ],
  providers: [
    // ... other providers
  ],
})
export class MktCoreModule {
  static getWorkspaceEntities(): any[] {
    return [
      // ... existing entities
      MktFileWorkspaceEntity,
    ];
  }
}
```

**Acceptance Criteria**:
- ✅ MktFile added to module
- ✅ Module compiles without errors

---

#### Task 2.3: Create MktFileService (4 hours)

**Reference**: [FILE-RELATIONSHIP-EXAMPLES.md](FILE-RELATIONSHIP-EXAMPLES.md) - Section "MktFileService Implementation"

Create file:
```
packages/twenty-server/src/mkt-core/file/services/mkt-file.service.ts
```

**Key methods to implement**:
1. `uploadFile()` - Upload file to S3 with validation
2. `calculateHash()` - SHA-256 content hashing
3. `findByHash()` - Check for existing file (deduplication)
4. `generateS3Key()` - Generate content-addressable path
5. `validateFile()` - MIME type and size validation
6. `generateDownloadUrl()` - CloudFront signed URL
7. `deleteFile()` - Soft delete with reference counting

**Implementation skeleton**:
```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileStorageService } from 'src/engine/core-modules/file-storage/file-storage.service';
import { MktFileWorkspaceEntity } from '../mkt-file.workspace-entity';
import * as crypto from 'crypto';

export interface UploadFileInput {
  file: Express.Multer.File;
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

  async uploadFile(input: UploadFileInput): Promise<MktFileWorkspaceEntity> {
    // 1. Validate file
    await this.validateFile(input.file);

    // 2. Calculate hash
    const contentHash = this.calculateHash(input.file.buffer);

    // 3. Check deduplication
    const existingFile = await this.findByHash(contentHash, input.workspaceId);
    if (existingFile) {
      // File exists, create new metadata entry pointing to same S3 object
      return this.createMetadataReference(existingFile, input);
    }

    // 4. Generate S3 key
    const s3Key = this.generateS3Key(input.workspaceId, contentHash, input.file.originalname);
    const s3Bucket = process.env.STORAGE_S3_NAME;

    // 5. Upload to S3
    await this.fileStorageService.write({
      file: input.file.buffer,
      name: input.file.originalname,
      folder: `workspace-${input.workspaceId}/content/${contentHash.substring(0, 2)}`,
      mimeType: input.file.mimetype,
    });

    // 6. Save metadata
    const fileRecord = this.fileRepository.create({
      name: input.file.originalname,
      size: input.file.size,
      mimeType: input.file.mimetype,
      s3Key,
      s3Bucket,
      contentHash,
      category: input.category || 'OTHER',
      uploadedById: input.uploadedById,
      workspaceId: input.workspaceId,
    });

    return this.fileRepository.save(fileRecord);
  }

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
    contentHash: string,
    filename: string,
  ): string {
    const prefix = contentHash.substring(0, 2);
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `workspace-${workspaceId}/content/${prefix}/${contentHash}`;
  }

  private async validateFile(file: Express.Multer.File): Promise<void> {
    // Size validation (100MB max)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new BadRequestException(`File size ${file.size} exceeds limit ${MAX_SIZE}`);
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
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }
  }

  private async createMetadataReference(
    existingFile: MktFileWorkspaceEntity,
    input: UploadFileInput,
  ): Promise<MktFileWorkspaceEntity> {
    const linkedFile = this.fileRepository.create({
      name: input.file.originalname,
      size: existingFile.size,
      mimeType: existingFile.mimeType,
      s3Key: existingFile.s3Key,
      s3Bucket: existingFile.s3Bucket,
      contentHash: existingFile.contentHash,
      category: input.category || existingFile.category,
      uploadedById: input.uploadedById,
      workspaceId: input.workspaceId,
    });

    return this.fileRepository.save(linkedFile);
  }

  // TODO: Implement in later tasks
  async generateDownloadUrl(fileId: string, workspaceId: string): Promise<string> {
    throw new Error('Not implemented yet');
  }

  async deleteFile(fileId: string, workspaceId: string): Promise<void> {
    throw new Error('Not implemented yet');
  }
}
```

**Acceptance Criteria**:
- ✅ Service file created
- ✅ Upload method with validation implemented
- ✅ SHA-256 hashing implemented
- ✅ Deduplication logic implemented
- ✅ S3 integration working
- ✅ Unit tests written (minimum 80% coverage)

---

#### Task 2.4: Add CloudFront Signed URL Generation (2 hours)

**Reference**: [FILE-MANAGEMENT-SYSTEM-DESIGN.md](FILE-MANAGEMENT-SYSTEM-DESIGN.md) - Section "CloudFront CDN Integration"

Create CloudFront service:
```
packages/twenty-server/src/mkt-core/file/services/cloudfront.service.ts
```

```typescript
import { Injectable } from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import * as fs from 'fs';

@Injectable()
export class CloudFrontService {
  private privateKey: string;
  private distributionDomain: string;
  private keyPairId: string;

  constructor() {
    this.distributionDomain = process.env.CLOUDFRONT_DOMAIN;
    this.keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;
    this.privateKey = fs.readFileSync(
      process.env.CLOUDFRONT_PRIVATE_KEY_PATH,
      'utf8'
    );
  }

  generateSignedUrl(s3Key: string, expiresIn: number = 900): string {
    const url = `https://${this.distributionDomain}/${s3Key}`;

    const signedUrl = getSignedUrl({
      url,
      keyPairId: this.keyPairId,
      privateKey: this.privateKey,
      dateLessThan: new Date(Date.now() + expiresIn * 1000).toISOString(),
    });

    return signedUrl;
  }

  getPublicUrl(s3Key: string): string {
    return `https://${this.distributionDomain}/${s3Key}`;
  }
}
```

Update MktFileService:
```typescript
async generateDownloadUrl(
  fileId: string,
  workspaceId: string,
  expiresIn: number = 900,
): Promise<string> {
  const file = await this.fileRepository.findOne({
    where: { id: fileId, workspaceId },
  });

  if (!file) {
    throw new NotFoundException('File not found');
  }

  return this.cloudFrontService.generateSignedUrl(file.s3Key, expiresIn);
}
```

**Acceptance Criteria**:
- ✅ CloudFront service created
- ✅ Signed URL generation working
- ✅ Tested with actual CloudFront distribution
- ✅ URLs expire after specified time

---

#### Task 2.5: Implement File Deletion (1.5 hours)

Add to MktFileService:
```typescript
async deleteFile(fileId: string, workspaceId: string): Promise<void> {
  const file = await this.fileRepository.findOne({
    where: { id: fileId, workspaceId },
  });

  if (!file) {
    throw new NotFoundException('File not found');
  }

  // Check reference count (how many metadata entries point to this S3 object)
  const referenceCount = await this.fileRepository.count({
    where: {
      contentHash: file.contentHash,
      workspaceId,
    },
  });

  // Only delete from S3 if this is the last reference
  if (referenceCount <= 1) {
    try {
      await this.fileStorageService.delete({
        folderPath: `workspace-${workspaceId}/content/${file.contentHash.substring(0, 2)}`,
        filename: file.contentHash,
      });
    } catch (error) {
      // Log error but don't fail delete (S3 object may already be gone)
      console.error('Failed to delete S3 object:', error);
    }
  }

  // Soft delete metadata record
  await this.fileRepository.softDelete(fileId);
}
```

**Acceptance Criteria**:
- ✅ Delete method implemented
- ✅ Reference counting works correctly
- ✅ S3 object only deleted when no references remain
- ✅ Soft delete used for metadata
- ✅ Error handling for missing S3 objects

---

#### Task 2.6: Add Redis Metadata Caching (2 hours)

**Reference**: [FILE-MANAGEMENT-SYSTEM-DESIGN.md](FILE-MANAGEMENT-SYSTEM-DESIGN.md) - Section "Performance Optimization"

Create cache service:
```
packages/twenty-server/src/mkt-core/file/services/file-cache.service.ts
```

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { MktFileWorkspaceEntity } from '../mkt-file.workspace-entity';

interface FileCacheMetadata {
  id: string;
  name: string;
  s3Key: string;
  size: number;
  mimeType: string;
  contentHash: string;
  createdAt: Date;
}

@Injectable()
export class FileCacheService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async cacheMetadata(file: MktFileWorkspaceEntity): Promise<void> {
    const metadata: FileCacheMetadata = {
      id: file.id,
      name: file.name,
      s3Key: file.s3Key,
      size: file.size,
      mimeType: file.mimeType,
      contentHash: file.contentHash,
      createdAt: file.createdAt,
    };

    await this.cacheManager.set(
      `file:meta:${file.id}`,
      metadata,
      3600, // 1 hour TTL
    );
  }

  async getCachedMetadata(fileId: string): Promise<FileCacheMetadata | null> {
    return this.cacheManager.get(`file:meta:${fileId}`);
  }

  async invalidateCache(fileId: string): Promise<void> {
    await this.cacheManager.del(`file:meta:${fileId}`);
  }

  async cacheDownloadUrl(fileId: string, url: string, ttl: number = 600): Promise<void> {
    await this.cacheManager.set(`file:url:${fileId}`, url, ttl);
  }

  async getCachedUrl(fileId: string): Promise<string | null> {
    return this.cacheManager.get(`file:url:${fileId}`);
  }
}
```

Update MktFileService to use cache:
```typescript
async generateDownloadUrl(
  fileId: string,
  workspaceId: string,
  expiresIn: number = 900,
): Promise<string> {
  // Try cache first
  const cachedUrl = await this.cacheService.getCachedUrl(fileId);
  if (cachedUrl) {
    return cachedUrl;
  }

  // Get from DB
  const file = await this.fileRepository.findOne({
    where: { id: fileId, workspaceId },
  });

  if (!file) {
    throw new NotFoundException('File not found');
  }

  // Generate signed URL
  const url = this.cloudFrontService.generateSignedUrl(file.s3Key, expiresIn);

  // Cache URL (with shorter TTL than expiration)
  await this.cacheService.cacheDownloadUrl(fileId, url, Math.min(expiresIn - 60, 600));

  return url;
}
```

**Acceptance Criteria**:
- ✅ Cache service created
- ✅ Metadata caching working
- ✅ URL caching working
- ✅ Cache invalidation on file update/delete
- ✅ Cache hit ratio > 70% (monitored)

---

#### Task 2.7: Create MktFileModule (1 hour)

Create:
```
packages/twenty-server/src/mkt-core/file/mkt-file.module.ts
```

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MktFileWorkspaceEntity } from './mkt-file.workspace-entity';
import { MktFileService } from './services/mkt-file.service';
import { CloudFrontService } from './services/cloudfront.service';
import { FileCacheService } from './services/file-cache.service';
import { FileStorageModule } from 'src/engine/core-modules/file-storage/file-storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MktFileWorkspaceEntity], 'metadata'),
    FileStorageModule,
  ],
  providers: [
    MktFileService,
    CloudFrontService,
    FileCacheService,
  ],
  exports: [MktFileService],
})
export class MktFileModule {}
```

Add to mkt-core.module.ts:
```typescript
import { MktFileModule } from './file/mkt-file.module';

@Module({
  imports: [
    // ... other imports
    MktFileModule,
  ],
})
export class MktCoreModule {}
```

**Acceptance Criteria**:
- ✅ Module created
- ✅ All services registered
- ✅ Module exports MktFileService
- ✅ No circular dependencies

---

### 📊 Phase 2 Completion Checklist

- [ ] MktFileWorkspaceEntity created and synced
- [ ] MktFileService implemented with upload/download/delete
- [ ] File validation working (MIME type, size)
- [ ] Content hashing and deduplication working
- [ ] CloudFront signed URLs generated successfully
- [ ] Redis metadata caching implemented
- [ ] Reference counting for file deletion
- [ ] Unit tests written (80%+ coverage)
- [ ] Integration tests for S3 operations
- [ ] MktFileModule created and integrated

**Estimated Time**: 12-15 hours (1-2 weeks)

---

## Phase 3: Entity Relationships (Week 5-6)

### 🎯 Goals

- Add direct relationships to Invoice, Order, License
- Implement entity-specific upload methods
- Add GraphQL resolvers
- Test relationship queries

### 📋 Tasks

#### Task 3.1: Add Relations to MktFileWorkspaceEntity (1.5 hours)

**Reference**: [FILE-RELATIONSHIP-EXAMPLES.md](FILE-RELATIONSHIP-EXAMPLES.md) - Section "MktFileWorkspaceEntity with Relations"

Update MktFileWorkspaceEntity:
```typescript
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { RelationMetadataType } from 'src/engine/metadata-modules/relation-metadata/relation-metadata.entity';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { MktInvoiceWorkspaceEntity } from 'src/mkt-core/invoice/mkt-invoice.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/mkt-order.workspace-entity';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

@WorkspaceEntity({...})
export class MktFileWorkspaceEntity extends BaseWorkspaceEntity {
  // ... existing fields ...

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

**Sync metadata**:
```bash
npx nx run twenty-server:command workspace:sync-metadata -f
```

**Acceptance Criteria**:
- ✅ Relations added to entity
- ✅ Metadata synced without errors
- ✅ Foreign key columns created in database
- ✅ GraphQL schema updated with relations

---

#### Task 3.2: Add Inverse Relations to Business Entities (2 hours)

**Reference**: [FILE-RELATIONSHIP-EXAMPLES.md](FILE-RELATIONSHIP-EXAMPLES.md) - Section "Inverse Relations"

Update MktInvoiceWorkspaceEntity:
```typescript
// packages/twenty-server/src/mkt-core/invoice/mkt-invoice.workspace-entity.ts

import { MktFileWorkspaceEntity } from 'src/mkt-core/file/mkt-file.workspace-entity';

@WorkspaceEntity({...})
export class MktInvoiceWorkspaceEntity extends BaseWorkspaceEntity {
  // ... existing fields ...

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

Update MktOrderWorkspaceEntity:
```typescript
// packages/twenty-server/src/mkt-core/order/mkt-order.workspace-entity.ts

@WorkspaceEntity({...})
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

Update MktLicenseWorkspaceEntity:
```typescript
// packages/twenty-server/src/mkt-core/license/mkt-license.workspace-entity.ts

@WorkspaceEntity({...})
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

**Sync metadata**:
```bash
npx nx run twenty-server:command workspace:sync-metadata -f
```

**Acceptance Criteria**:
- ✅ Inverse relations added to all 3 entities
- ✅ Metadata synced successfully
- ✅ Can query invoice.files, order.files, license.files in GraphQL

---

#### Task 3.3: Update MktFileService for Entity Upload (2 hours)

Add entity-specific upload methods:
```typescript
// packages/twenty-server/src/mkt-core/file/services/mkt-file.service.ts

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
  // ... existing methods ...

  async uploadFileToEntity(
    input: UploadFileToEntityInput,
  ): Promise<MktFileWorkspaceEntity> {
    const { file, entityType, entityId, category, workspaceId, uploadedById } = input;

    // 1. Validate file
    await this.validateFile(file);

    // 2. Verify entity exists
    await this.verifyEntityExists(entityType, entityId, workspaceId);

    // 3. Calculate hash
    const contentHash = this.calculateHash(file.buffer);

    // 4. Check deduplication
    const existingFile = await this.findByHash(contentHash, workspaceId);
    if (existingFile) {
      return this.linkExistingFileToEntity({
        fileId: existingFile.id,
        entityType,
        entityId,
        workspaceId,
      });
    }

    // 5. Generate S3 key (entity-specific path)
    const s3Key = this.generateEntityS3Key(workspaceId, entityType, entityId, file.originalname);
    const s3Bucket = process.env.STORAGE_S3_NAME;

    // 6. Upload to S3
    await this.fileStorageService.write({
      file: file.buffer,
      name: file.originalname,
      folder: `workspace-${workspaceId}/${entityType}/${entityId}`,
      mimeType: file.mimetype,
    });

    // 7. Save metadata with entity relation
    const fileRecord = this.fileRepository.create({
      name: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      s3Key,
      s3Bucket,
      contentHash,
      category: category || this.getCategoryFromEntityType(entityType),
      [`${entityType}Id`]: entityId, // Dynamic FK assignment
      uploadedById,
      workspaceId,
    });

    return this.fileRepository.save(fileRecord);
  }

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

  private async verifyEntityExists(
    entityType: string,
    entityId: string,
    workspaceId: string,
  ): Promise<void> {
    // TODO: Implement entity verification
    // Check if invoice/order/license exists
  }

  private generateEntityS3Key(
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

  private async linkExistingFileToEntity(input: {
    fileId: string;
    entityType: string;
    entityId: string;
    workspaceId: string;
  }): Promise<MktFileWorkspaceEntity> {
    const originalFile = await this.fileRepository.findOne({
      where: { id: input.fileId, workspaceId: input.workspaceId },
    });

    if (!originalFile) {
      throw new NotFoundException('Original file not found');
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
}
```

**Acceptance Criteria**:
- ✅ Entity-specific upload methods working
- ✅ Entity verification implemented
- ✅ Deduplication works across entities
- ✅ Files properly linked to entities

---

#### Task 3.4: Create GraphQL Resolvers (3 hours)

**Reference**: [FILE-RELATIONSHIP-EXAMPLES.md](FILE-RELATIONSHIP-EXAMPLES.md) - Section "GraphQL Resolver Examples"

Create:
```
packages/twenty-server/src/mkt-core/file/resolvers/mkt-file.resolver.ts
```

```typescript
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GraphQLUpload, FileUpload } from 'graphql-upload';
import { MktFileService } from '../services/mkt-file.service';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { User } from 'src/engine/core-modules/user/user.entity';

@Resolver('MktFile')
export class MktFileResolver {
  constructor(private readonly fileService: MktFileService) {}

  @Mutation(() => MktFileDTO)
  async uploadFileToInvoice(
    @Args({ name: 'file', type: () => GraphQLUpload }) fileUpload: FileUpload,
    @Args('invoiceId') invoiceId: string,
    @AuthWorkspace() workspace: Workspace,
    @AuthUser() user: User,
  ) {
    const { createReadStream, filename, mimetype } = await fileUpload;
    const stream = createReadStream();
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    const file: Express.Multer.File = {
      buffer,
      originalname: filename,
      mimetype,
      size: buffer.length,
    } as Express.Multer.File;

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
    @Args({ name: 'file', type: () => GraphQLUpload }) fileUpload: FileUpload,
    @Args('orderId') orderId: string,
    @AuthWorkspace() workspace: Workspace,
    @AuthUser() user: User,
  ) {
    const { createReadStream, filename, mimetype } = await fileUpload;
    const stream = createReadStream();
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    const file: Express.Multer.File = {
      buffer,
      originalname: filename,
      mimetype,
      size: buffer.length,
    } as Express.Multer.File;

    return this.fileService.uploadFileToEntity({
      file,
      entityType: 'order',
      entityId: orderId,
      workspaceId: workspace.id,
      uploadedById: user.id,
    });
  }

  @Mutation(() => MktFileDTO)
  async uploadFileToLicense(
    @Args({ name: 'file', type: () => GraphQLUpload }) fileUpload: FileUpload,
    @Args('licenseId') licenseId: string,
    @AuthWorkspace() workspace: Workspace,
    @AuthUser() user: User,
  ) {
    const { createReadStream, filename, mimetype } = await fileUpload;
    const stream = createReadStream();
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    const file: Express.Multer.File = {
      buffer,
      originalname: filename,
      mimetype,
      size: buffer.length,
    } as Express.Multer.File;

    return this.fileService.uploadFileToEntity({
      file,
      entityType: 'license',
      entityId: licenseId,
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

  @Query(() => [MktFileDTO])
  async getLicenseFiles(
    @Args('licenseId') licenseId: string,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.fileService.getFilesByEntity('license', licenseId, workspace.id);
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

Create DTO:
```
packages/twenty-server/src/mkt-core/file/dto/mkt-file.dto.ts
```

```typescript
import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class MktFileDTO {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  size: number;

  @Field()
  mimeType: string;

  @Field()
  s3Key: string;

  @Field()
  s3Bucket: string;

  @Field()
  contentHash: string;

  @Field()
  category: string;

  @Field({ nullable: true })
  url?: string;

  @Field({ nullable: true })
  invoiceId?: string;

  @Field({ nullable: true })
  orderId?: string;

  @Field({ nullable: true })
  licenseId?: string;

  @Field()
  uploadedById: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
```

Add resolver to module:
```typescript
// packages/twenty-server/src/mkt-core/file/mkt-file.module.ts

import { MktFileResolver } from './resolvers/mkt-file.resolver';

@Module({
  // ... imports
  providers: [
    MktFileService,
    CloudFrontService,
    FileCacheService,
    MktFileResolver, // Add this
  ],
  exports: [MktFileService],
})
export class MktFileModule {}
```

**Acceptance Criteria**:
- ✅ Resolvers created for upload/download/delete
- ✅ Entity-specific upload mutations working
- ✅ Query mutations for getting files by entity
- ✅ DTO properly defined
- ✅ Tested via GraphQL Playground

---

#### Task 3.5: Integration Testing (3 hours)

Create integration tests:
```
packages/twenty-server/src/mkt-core/file/__tests__/mkt-file-integration.spec.ts
```

```typescript
describe('MktFile Integration Tests', () => {
  let app: INestApplication;
  let fileService: MktFileService;
  let invoiceId: string;
  let orderId: string;
  let licenseId: string;

  beforeAll(async () => {
    // Setup test app
  });

  describe('Upload to Invoice', () => {
    it('should upload PDF to invoice', async () => {
      const file = createMockPDF();
      const result = await fileService.uploadFileToEntity({
        file,
        entityType: 'invoice',
        entityId: invoiceId,
        workspaceId: testWorkspaceId,
        uploadedById: testUserId,
      });

      expect(result.invoiceId).toBe(invoiceId);
      expect(result.category).toBe('INVOICE');
      expect(result.s3Key).toContain('invoice');
    });

    it('should deduplicate same file', async () => {
      const file = createMockPDF();

      // Upload twice
      const result1 = await fileService.uploadFileToEntity({...});
      const result2 = await fileService.uploadFileToEntity({...});

      // Different IDs but same content hash
      expect(result1.id).not.toBe(result2.id);
      expect(result1.contentHash).toBe(result2.contentHash);
      expect(result1.s3Key).toBe(result2.s3Key);
    });
  });

  describe('Query Files by Entity', () => {
    it('should get all files for invoice', async () => {
      // Upload 3 files
      await fileService.uploadFileToEntity({...});
      await fileService.uploadFileToEntity({...});
      await fileService.uploadFileToEntity({...});

      const files = await fileService.getFilesByEntity(
        'invoice',
        invoiceId,
        testWorkspaceId,
      );

      expect(files).toHaveLength(3);
      expect(files[0].invoiceId).toBe(invoiceId);
    });

    it('should query invoice with files via relation', async () => {
      // Test GraphQL relation query
      const query = `
        query {
          mktInvoice(id: "${invoiceId}") {
            id
            invoiceNumber
            files {
              id
              name
              size
            }
          }
        }
      `;

      const result = await executeGraphQL(query);
      expect(result.data.mktInvoice.files).toBeDefined();
    });
  });

  describe('Download URLs', () => {
    it('should generate CloudFront signed URL', async () => {
      const url = await fileService.generateDownloadUrl(fileId, workspaceId);

      expect(url).toContain('cloudfront.net');
      expect(url).toContain('Signature=');
      expect(url).toContain('Expires=');
    });

    it('should cache download URL', async () => {
      const url1 = await fileService.generateDownloadUrl(fileId, workspaceId);
      const url2 = await fileService.generateDownloadUrl(fileId, workspaceId);

      // Should return same URL from cache
      expect(url1).toBe(url2);
    });
  });

  describe('File Deletion', () => {
    it('should soft delete metadata but keep S3 object if references exist', async () => {
      // Upload same file to 2 invoices
      const file = createMockPDF();
      const result1 = await fileService.uploadFileToEntity({
        file,
        entityType: 'invoice',
        entityId: invoice1Id,
        ...
      });
      const result2 = await fileService.uploadFileToEntity({
        file,
        entityType: 'invoice',
        entityId: invoice2Id,
        ...
      });

      // Delete first file
      await fileService.deleteFile(result1.id, workspaceId);

      // Second file should still have S3 object
      const url = await fileService.generateDownloadUrl(result2.id, workspaceId);
      const response = await fetch(url);
      expect(response.status).toBe(200);
    });

    it('should delete S3 object when last reference deleted', async () => {
      const file = createMockPDF();
      const result = await fileService.uploadFileToEntity({...});

      // Delete file
      await fileService.deleteFile(result.id, workspaceId);

      // S3 object should be gone
      // (verify via S3 API or CloudFront 404)
    });
  });
});
```

**Acceptance Criteria**:
- ✅ Integration tests written
- ✅ All tests passing
- ✅ Test coverage > 80%
- ✅ Deduplication tested
- ✅ Entity relationships tested

---

### 📊 Phase 3 Completion Checklist

- [ ] Relations added to MktFile and business entities
- [ ] Entity-specific upload methods implemented
- [ ] GraphQL resolvers created and tested
- [ ] Integration tests passing
- [ ] Can upload files to invoice/order/license via GraphQL
- [ ] Can query entity.files relation
- [ ] Deduplication working across entities
- [ ] Download URLs working with CloudFront

**Estimated Time**: 12-15 hours (1-2 weeks)

---

## Phase 4: Advanced Features (Week 7-8)

### 🎯 Goals

- Implement chunked upload for large files (>100MB)
- Add rate limiting for uploads
- Implement file metadata search
- Add audit logging

### 📋 Tasks

#### Task 4.1: Chunked Upload Service (4 hours)

**Reference**: [FILE-MANAGEMENT-SYSTEM-DESIGN.md](FILE-MANAGEMENT-SYSTEM-DESIGN.md) - Section "Chunked Upload for Large Files"

Create:
```
packages/twenty-server/src/mkt-core/file/services/chunked-upload.service.ts
```

**Key methods**:
- `initializeUpload()` - Start S3 multipart upload
- `uploadChunk()` - Upload individual chunk
- `completeUpload()` - Finalize S3 multipart upload
- `abortUpload()` - Cancel upload
- `getMissingChunks()` - Resume support

**Acceptance Criteria**:
- ✅ S3 multipart upload working
- ✅ Chunk size: 5MB
- ✅ Session tracking in Redis
- ✅ Resume support implemented
- ✅ Auto-cleanup expired sessions

---

#### Task 4.2: Add GraphQL Mutations for Chunked Upload (2 hours)

Add to MktFileResolver:
```typescript
@Mutation(() => UploadSessionDTO)
async initializeChunkedUpload(
  @Args('fileName') fileName: string,
  @Args('fileSize') fileSize: number,
  @Args('mimeType') mimeType: string,
  @Args('entityType') entityType: string,
  @Args('entityId') entityId: string,
  @AuthWorkspace() workspace: Workspace,
  @AuthUser() user: User,
) {
  return this.chunkedUploadService.initializeUpload({
    fileName,
    fileSize,
    mimeType,
    entityType,
    entityId,
    workspaceId: workspace.id,
    uploadedById: user.id,
  });
}

@Mutation(() => ChunkUploadResultDTO)
async uploadChunk(
  @Args('sessionId') sessionId: string,
  @Args('partNumber') partNumber: number,
  @Args({ name: 'chunk', type: () => GraphQLUpload }) chunkUpload: FileUpload,
  @AuthWorkspace() workspace: Workspace,
) {
  // Process chunk...
}

@Mutation(() => MktFileDTO)
async completeChunkedUpload(
  @Args('sessionId') sessionId: string,
  @AuthWorkspace() workspace: Workspace,
) {
  return this.chunkedUploadService.completeUpload(sessionId, workspace.id);
}
```

**Acceptance Criteria**:
- ✅ GraphQL mutations working
- ✅ Can upload 500MB file in chunks
- ✅ Resume working after network failure

---

#### Task 4.3: Rate Limiting (1.5 hours)

**Reference**: [FILE-MANAGEMENT-SYSTEM-DESIGN.md](FILE-MANAGEMENT-SYSTEM-DESIGN.md) - Section "Security"

Add rate limiting decorator:
```typescript
// packages/twenty-server/src/mkt-core/file/decorators/rate-limit.decorator.ts

import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';
export const RateLimit = (limit: number, windowMs: number) =>
  SetMetadata(RATE_LIMIT_KEY, { limit, windowMs });
```

Create rate limit guard:
```typescript
// packages/twenty-server/src/mkt-core/file/guards/rate-limit.guard.ts

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitMeta = this.reflector.get(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!rateLimitMeta) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException();
    }

    const key = `rate-limit:upload:${userId}`;
    const current = await this.cacheManager.get<number>(key);

    if (current && current >= rateLimitMeta.limit) {
      throw new TooManyRequestsException(
        `Upload rate limit exceeded: ${rateLimitMeta.limit} uploads per hour`,
      );
    }

    const newCount = (current || 0) + 1;
    await this.cacheManager.set(key, newCount, rateLimitMeta.windowMs);

    return true;
  }
}
```

Apply to resolver:
```typescript
@Mutation(() => MktFileDTO)
@RateLimit(100, 3600000) // 100 uploads per hour
@UseGuards(RateLimitGuard)
async uploadFileToInvoice(...) {
  // ...
}
```

**Acceptance Criteria**:
- ✅ Rate limiting working (100 uploads/hour per user)
- ✅ Returns 429 status when exceeded
- ✅ Counter resets after 1 hour

---

#### Task 4.4: Audit Logging (2 hours)

Create audit log service:
```typescript
// packages/twenty-server/src/mkt-core/file/services/file-audit.service.ts

@Injectable()
export class FileAuditService {
  constructor(
    @InjectRepository(AuditLogEntity, 'core')
    private readonly auditRepository: Repository<AuditLogEntity>,
  ) {}

  async logFileUpload(
    file: MktFileWorkspaceEntity,
    userId: string,
    workspaceId: string,
  ): Promise<void> {
    await this.auditRepository.save({
      action: 'FILE_UPLOAD',
      entityType: 'MktFile',
      entityId: file.id,
      userId,
      workspaceId,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.mimeType,
        category: file.category,
      },
      timestamp: new Date(),
    });
  }

  async logFileDownload(
    fileId: string,
    userId: string,
    workspaceId: string,
  ): Promise<void> {
    await this.auditRepository.save({
      action: 'FILE_DOWNLOAD',
      entityType: 'MktFile',
      entityId: fileId,
      userId,
      workspaceId,
      timestamp: new Date(),
    });
  }

  async logFileDelete(
    fileId: string,
    userId: string,
    workspaceId: string,
  ): Promise<void> {
    await this.auditRepository.save({
      action: 'FILE_DELETE',
      entityType: 'MktFile',
      entityId: fileId,
      userId,
      workspaceId,
      timestamp: new Date(),
    });
  }
}
```

Integrate into MktFileService:
```typescript
async uploadFileToEntity(input: UploadFileToEntityInput) {
  const result = await this.uploadFile(...);

  // Log audit event
  await this.auditService.logFileUpload(
    result,
    input.uploadedById,
    input.workspaceId,
  );

  return result;
}
```

**Acceptance Criteria**:
- ✅ All file operations logged
- ✅ Audit logs queryable
- ✅ Compliance-ready (GDPR, SOC2)

---

### 📊 Phase 4 Completion Checklist

- [ ] Chunked upload implemented and tested
- [ ] Can upload files > 100MB
- [ ] Resume upload working
- [ ] Rate limiting enforced
- [ ] Audit logging for all operations
- [ ] Performance tested with large files

**Estimated Time**: 10-12 hours (1 week)

---

## Phase 5: Testing & Production (Week 9-10)

### 🎯 Goals

- Comprehensive testing (unit, integration, E2E)
- Load testing
- Monitoring setup
- Production deployment
- Documentation

### 📋 Tasks

#### Task 5.1: Unit Tests (4 hours)

Write comprehensive unit tests for:
- MktFileService methods
- CloudFrontService
- FileCacheService
- ChunkedUploadService
- RateLimitGuard

**Target**: 85%+ code coverage

---

#### Task 5.2: Integration Tests (3 hours)

Test scenarios:
- Upload file to invoice/order/license
- Query files by entity
- Download files via signed URLs
- Delete files with reference counting
- Deduplication across entities
- Chunked upload flow

---

#### Task 5.3: E2E Tests (3 hours)

Create E2E tests with Playwright:
- Full upload workflow
- Download workflow
- Error scenarios (file too large, wrong type)
- Rate limit exceeded

---

#### Task 5.4: Load Testing (3 hours)

**Reference**: [FILE-MANAGEMENT-SYSTEM-DESIGN.md](FILE-MANAGEMENT-SYSTEM-DESIGN.md) - Section "Monitoring & Analytics"

Use Artillery for load testing:
```yaml
# load-test-upload.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
    - duration: 120
      arrivalRate: 100
      name: "Peak load"
  processor: "./upload-processor.js"

scenarios:
  - name: "Upload file to invoice"
    flow:
      - post:
          url: "/graphql"
          headers:
            Authorization: "Bearer {{ token }}"
          json:
            query: |
              mutation {
                uploadFileToInvoice(file: $file, invoiceId: "{{ invoiceId }}") {
                  id
                  name
                  size
                }
              }
```

Run test:
```bash
artillery run load-test-upload.yml
```

**Performance targets**:
- Upload latency p95 < 2s (for 10MB files)
- Download latency p95 < 500ms
- Error rate < 0.1%
- S3 operations per second: 1000+

---

#### Task 5.5: Monitoring Setup (3 hours)

Setup Prometheus metrics:
```typescript
// packages/twenty-server/src/mkt-core/file/metrics/file.metrics.ts

import { Counter, Histogram, Gauge } from 'prom-client';

export const fileMetrics = {
  uploads: new Counter({
    name: 'mkt_file_uploads_total',
    help: 'Total file uploads',
    labelNames: ['workspace', 'entity_type', 'category'],
  }),

  downloads: new Counter({
    name: 'mkt_file_downloads_total',
    help: 'Total file downloads',
    labelNames: ['workspace', 'entity_type'],
  }),

  storageUsed: new Gauge({
    name: 'mkt_file_storage_bytes',
    help: 'Total storage used in bytes',
    labelNames: ['workspace'],
  }),

  uploadDuration: new Histogram({
    name: 'mkt_file_upload_duration_seconds',
    help: 'File upload duration',
    labelNames: ['size_range'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  }),

  s3Errors: new Counter({
    name: 'mkt_file_s3_errors_total',
    help: 'Total S3 operation errors',
    labelNames: ['operation', 'error_type'],
  }),
};
```

Setup Grafana dashboard:
- Upload/download rates
- Storage usage by workspace
- Error rates
- Latency percentiles (p50, p95, p99)
- S3 costs

---

#### Task 5.6: Production Deployment (4 hours)

**Reference**: [MKT-CORE-DEPLOYMENT-GUIDE.md](MKT-CORE-DEPLOYMENT-GUIDE.md)

Deployment checklist:
- [ ] All environment variables configured in production
- [ ] S3 bucket ready with lifecycle policies
- [ ] CloudFront distribution deployed
- [ ] Database migration applied
- [ ] Redis configured
- [ ] Monitoring dashboards setup
- [ ] Alerts configured (error rate, latency)
- [ ] Backup strategy verified
- [ ] Documentation updated

**Deploy command**:
```bash
# 1. Build
npx nx build twenty-server

# 2. Run migrations
npx nx run twenty-server:database:migrate:prod

# 3. Sync metadata
npx nx run twenty-server:command workspace:sync-metadata -f

# 4. Restart services
pm2 restart twenty-server
pm2 restart twenty-worker
```

---

#### Task 5.7: Documentation (2 hours)

Update documentation:
- API documentation with GraphQL examples
- User guide for file upload/download
- Admin guide for monitoring and troubleshooting
- Runbook for common issues

---

### 📊 Phase 5 Completion Checklist

- [ ] Unit tests: 85%+ coverage
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Load testing completed with acceptable results
- [ ] Monitoring and alerting setup
- [ ] Production deployment successful
- [ ] Documentation complete and published
- [ ] Post-deployment verification passed

**Estimated Time**: 20-25 hours (2 weeks)

---

## Phase 6: Image Processing (Future - Deferred)

### 🎯 Goals

- Implement image optimization (resize, compress)
- Generate multiple image variants
- WebP conversion
- Thumbnail generation

### 📋 Tasks

**Note**: Tạm thời chưa triển khai. Sẽ implement trong phase sau khi có yêu cầu cụ thể.

Tasks dự kiến:
- Task 6.1: Setup Sharp library for image processing
- Task 6.2: Implement image variant generation
- Task 6.3: Add WebP conversion
- Task 6.4: Create thumbnail service
- Task 6.5: Update upload flow to process images
- Task 6.6: Add GraphQL queries for image variants

**Estimated Time**: 15-20 hours (deferred)

---

## 📊 Overall Project Timeline

| Phase | Duration | Calendar Time | Status |
|-------|----------|---------------|--------|
| **Phase 1: Foundation** | 8-10 hours | 1-2 weeks | ⏳ Not Started |
| **Phase 2: Core File Management** | 12-15 hours | 1-2 weeks | ⏳ Not Started |
| **Phase 3: Entity Relationships** | 12-15 hours | 1-2 weeks | ⏳ Not Started |
| **Phase 4: Advanced Features** | 10-12 hours | 1 week | ⏳ Not Started |
| **Phase 5: Testing & Production** | 20-25 hours | 2 weeks | ⏳ Not Started |
| **Phase 6: Image Processing** | 15-20 hours (deferred) | TBD | ⏸️ Deferred |
| **Total (Phase 1-5)** | **62-77 hours** | **8-10 weeks** | |

---

## 🎯 Success Criteria

### Technical Metrics
- [ ] Upload latency p95 < 2s (for 10MB files)
- [ ] Download latency p95 < 500ms
- [ ] Error rate < 0.1%
- [ ] Test coverage > 85%
- [ ] S3 cost < $100/TB/month
- [ ] Deduplication rate > 20%

### Business Metrics
- [ ] All invoices can have PDF attachments
- [ ] All orders can have multiple attachments
- [ ] Licenses can have proof documents
- [ ] Files searchable via GraphQL
- [ ] Audit trail for compliance

### Operational Metrics
- [ ] Zero production incidents
- [ ] 99.9% uptime
- [ ] Response time SLA met
- [ ] Monitoring alerts working
- [ ] Backup/restore tested

---

## 🚨 Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **S3 costs exceed budget** | High | Medium | Monitor costs daily, implement lifecycle policies, set billing alerts |
| **CloudFront propagation delays** | Medium | Low | Plan for 15-30min deployment time, test in staging first |
| **Large file uploads timeout** | Medium | Medium | Implement chunked upload, increase timeout limits |
| **Deduplication bugs** | High | Low | Comprehensive testing, monitor reference counts |
| **Rate limit too restrictive** | Low | Medium | Monitor actual usage, adjust limits based on data |
| **S3 outage** | High | Very Low | Multi-region replication (future), comprehensive monitoring |

---

## 📚 Reference Documentation

1. [FILE-MANAGEMENT-SYSTEM-DESIGN.md](FILE-MANAGEMENT-SYSTEM-DESIGN.md) - Complete system design
2. [FILE-RELATIONSHIP-EXAMPLES.md](FILE-RELATIONSHIP-EXAMPLES.md) - Entity relationship patterns
3. [FILE-MANAGEMENT-IMPLEMENTATION-EXAMPLE.md](FILE-MANAGEMENT-IMPLEMENTATION-EXAMPLE.md) - Code examples
4. [AWS-S3-INTEGRATION-GUIDE.md](./AWS-S3-INTEGRATION-GUIDE.md) - AWS setup guide
5. [MKT-CORE-DEPLOYMENT-GUIDE.md](MKT-CORE-DEPLOYMENT-GUIDE.md) - Deployment procedures

---

## 🔄 Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-06 | MKT-Core Team | Initial roadmap created |

---

**Note**: Roadmap này có thể thay đổi dựa trên feedback và requirements thực tế trong quá trình triển khai.
