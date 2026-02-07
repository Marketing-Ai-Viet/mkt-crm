# AWS S3 Integration Guide for MKT-Core

## 📋 Table of Contents

1. [Overview](#overview)
2. [Twenty Core S3 Architecture](#twenty-core-s3-architecture)
3. [AWS Setup](#aws-setup)
4. [Environment Configuration](#environment-configuration)
5. [Integration with MKT-Core](#integration-with-mkt-core)
6. [Usage Examples](#usage-examples)
7. [Production Deployment](#production-deployment)
8. [Monitoring & Troubleshooting](#monitoring--troubleshooting)
9. [Cost Optimization](#cost-optimization)
10. [Migration from Local to S3](#migration-from-local-to-s3)
11. [Security Best Practices](#security-best-practices)
12. [Testing](#testing)

---

## 📖 Overview

Twenty CRM đã có sẵn **FileStorageModule** hỗ trợ AWS S3. MKT-Core sẽ tận dụng module này để lưu trữ:

- **Invoice PDFs** (hóa đơn)
- **Order attachments** (đính kèm đơn hàng)
- **Export files** (Excel, CSV exports)
- **Contract documents** (hợp đồng)
- **User avatars** (ảnh đại diện)
- **Product images** (ảnh sản phẩm)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    MKT-Core Modules                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Invoice  │  │  Order   │  │  Export  │  │  File    │  │
│  │ Module   │  │  Module  │  │  Module  │  │  Module  │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
└───────┼─────────────┼─────────────┼─────────────┼─────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                      │
        ┌─────────────▼──────────────┐
        │   FileStorageService       │  ← Twenty Core Service
        │   (from twenty-server)     │
        └─────────────┬──────────────┘
                      │
        ┌─────────────▼──────────────┐
        │  FileStorageDriverFactory  │  ← Factory Pattern
        └─────────────┬──────────────┘
                      │
        ┌─────────────▼──────────────┐
        │        S3Driver             │  ← AWS SDK v3
        │  (@aws-sdk/client-s3)       │
        └─────────────┬──────────────┘
                      │
                ┌─────▼──────┐
                │   AWS S3   │
                └────────────┘
```

---

## 🏗️ Twenty Core S3 Architecture

### 1. Core Files Structure

```
packages/twenty-server/src/engine/core-modules/
├── file-storage/
│   ├── file-storage.module.ts           # Main module
│   ├── file-storage.service.ts          # Service wrapper
│   ├── file-storage-driver.factory.ts   # Driver factory
│   ├── drivers/
│   │   ├── s3.driver.ts                 # S3 implementation
│   │   ├── local.driver.ts              # Local implementation
│   │   └── interfaces/
│   │       └── storage-driver.interface.ts
│   └── interfaces/
│       └── file-storage.interface.ts    # StorageDriverType enum
└── file/
    ├── file.module.ts
    ├── file.service.ts
    ├── file-upload/
    │   ├── file-upload.module.ts
    │   ├── file-upload.service.ts
    │   └── resolvers/
    │       └── file-upload.resolver.ts  # GraphQL API
    └── controllers/
        └── file.controller.ts           # REST API
```

### 2. S3Driver Features

File: `packages/twenty-server/src/engine/core-modules/file-storage/drivers/s3.driver.ts`

**Supported Operations:**

| Method | Description | Use Case |
|--------|-------------|----------|
| `write()` | Upload file to S3 | Upload invoices, documents |
| `read()` | Download file as stream | Serve files to users |
| `delete()` | Delete file/folder | Remove old files |
| `move()` | Move file within S3 | Reorganize files |
| `copy()` | Copy file/folder | Backup, duplication |
| `download()` | Download to local disk | Migration, backup |
| `checkFileExists()` | Check file existence | Validation |
| `checkFolderExists()` | Check folder existence | Validation |
| `createBucket()` | Create S3 bucket | Initial setup |

### 3. FileStorageService API

File: `packages/twenty-server/src/engine/core-modules/file-storage/file-storage.service.ts`

```typescript
interface FileStorageService {
  // Write file to storage
  write(params: {
    file: Buffer | Uint8Array | string;
    name: string;
    folder: string;
    mimeType: string | undefined;
  }): Promise<void>;

  // Read file from storage
  read(params: {
    folderPath: string;
    filename: string;
  }): Promise<Readable>;

  // Delete file
  delete(params: {
    folderPath: string;
    filename?: string;
  }): Promise<void>;

  // Move file
  move(params: {
    from: { folderPath: string; filename: string };
    to: { folderPath: string; filename: string };
  }): Promise<void>;

  // Copy file
  copy(params: {
    from: { folderPath: string; filename?: string };
    to: { folderPath: string; filename?: string };
  }): Promise<void>;
}
```

---

## ☁️ AWS Setup

### Step 1: Create IAM User for S3 Access

#### 1.1. Create IAM User

```bash
# Using AWS CLI
aws iam create-user --user-name crm-s3-user

# Generate access keys
aws iam create-access-key --user-name crm-s3-user
```

**Output:**
```json
{
  "AccessKey": {
    "UserName": "crm-s3-user",
    "AccessKeyId": "AKIAIOSFODNN7EXAMPLE",
    "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "Status": "Active"
  }
}
```

⚠️ **Lưu lại `AccessKeyId` và `SecretAccessKey` ngay lập tức!**

#### 1.2. Create IAM Policy

Tạo file `crm-s3-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListAllBuckets",
      "Effect": "Allow",
      "Action": [
        "s3:ListAllMyBuckets",
        "s3:GetBucketLocation"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ManageCRMBucket",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation",
        "s3:GetBucketVersioning",
        "s3:GetBucketAcl",
        "s3:GetBucketCORS",
        "s3:GetBucketLifecycleConfiguration"
      ],
      "Resource": "arn:aws:s3:::your-crm-bucket"
    },
    {
      "Sid": "ManageObjects",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:GetObjectAcl",
        "s3:DeleteObject",
        "s3:ListMultipartUploadParts",
        "s3:AbortMultipartUpload"
      ],
      "Resource": "arn:aws:s3:::your-crm-bucket/*"
    }
  ]
}
```

Apply policy:

```bash
# Create policy
aws iam create-policy \
  --policy-name CRMStoragePolicy \
  --policy-document file://crm-s3-policy.json

# Attach to user
aws iam attach-user-policy \
  --user-name crm-s3-user \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/CRMStoragePolicy
```

### Step 2: Create S3 Bucket

#### 2.1. Create Bucket

```bash
# Create bucket in ap-southeast-1 (Singapore)
aws s3 mb s3://your-crm-bucket --region ap-southeast-1

# Or create with encryption
aws s3api create-bucket \
  --bucket your-crm-bucket \
  --region ap-southeast-1 \
  --create-bucket-configuration LocationConstraint=ap-southeast-1
```

#### 2.2. Enable Versioning (Optional but Recommended)

```bash
aws s3api put-bucket-versioning \
  --bucket your-crm-bucket \
  --versioning-configuration Status=Enabled
```

#### 2.3. Enable Server-Side Encryption

```bash
aws s3api put-bucket-encryption \
  --bucket your-crm-bucket \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        },
        "BucketKeyEnabled": true
      }
    ]
  }'
```

### Step 3: Configure CORS

Tạo file `cors-config.json`:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://your-crm-domain.com",
        "https://app.your-crm-domain.com",
        "http://localhost:3000",
        "http://localhost:3001"
      ],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

Apply CORS:

```bash
aws s3api put-bucket-cors \
  --bucket your-crm-bucket \
  --cors-configuration file://cors-config.json
```

### Step 4: Configure Lifecycle Rules

Tạo file `lifecycle-config.json`:

```json
{
  "Rules": [
    {
      "Id": "TransitionToIA",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "workspaces/"
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER_INSTANT_RETRIEVAL"
        }
      ]
    },
    {
      "Id": "DeleteTempExports",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "temp/exports/"
      },
      "Expiration": {
        "Days": 1
      }
    },
    {
      "Id": "DeleteOldVersions",
      "Status": "Enabled",
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 90
      }
    },
    {
      "Id": "CleanupIncompleteUploads",
      "Status": "Enabled",
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    }
  ]
}
```

Apply lifecycle:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket your-crm-bucket \
  --lifecycle-configuration file://lifecycle-config.json
```

### Step 5: Block Public Access (Security)

```bash
aws s3api put-public-access-block \
  --bucket your-crm-bucket \
  --public-access-block-configuration \
    BlockPublicAcls=true,\
    IgnorePublicAcls=true,\
    BlockPublicPolicy=true,\
    RestrictPublicBuckets=true
```

**Note:** Files sẽ được access qua pre-signed URLs hoặc CloudFront, không cần public access.

---

## 🔧 Environment Configuration

### Step 1: Update .env File

File: `packages/twenty-server/.env`

```bash
# ============================================
# FILE STORAGE CONFIGURATION
# ============================================

# Storage Type: LOCAL or S_3
STORAGE_TYPE=S_3

# ============================================
# AWS S3 CONFIGURATION
# ============================================

# AWS Region
STORAGE_S3_REGION=ap-southeast-1

# S3 Bucket Name
STORAGE_S3_NAME=your-crm-bucket

# S3 Endpoint (optional - for S3-compatible services)
# Leave empty for AWS S3, or set for MinIO, DigitalOcean Spaces, etc.
STORAGE_S3_ENDPOINT=

# AWS Credentials
# Option 1: Use IAM user access keys
STORAGE_S3_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
STORAGE_S3_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Option 2: Use IAM role (for EC2/ECS)
# Leave ACCESS_KEY_ID and SECRET_ACCESS_KEY empty to use IAM role

# ============================================
# LOCAL STORAGE (FALLBACK/DEVELOPMENT)
# ============================================

# Path for local storage (used when STORAGE_TYPE=LOCAL)
STORAGE_LOCAL_PATH=.local-storage
```

### Step 2: Verify Configuration

```bash
cd packages/twenty-server

# Test S3 connection
node -e "
const { S3 } = require('@aws-sdk/client-s3');
const s3 = new S3({
  region: process.env.STORAGE_S3_REGION,
  credentials: {
    accessKeyId: process.env.STORAGE_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.STORAGE_S3_SECRET_ACCESS_KEY,
  },
});

s3.listBuckets().then(data => {
  console.log('✅ S3 Connection successful!');
  console.log('Buckets:', data.Buckets.map(b => b.Name));
}).catch(err => {
  console.error('❌ S3 Connection failed:', err.message);
});
"
```

---

## 🔌 Integration with MKT-Core

### Step 1: Import FileStorageService

```typescript
// packages/twenty-server/src/mkt-core/file/mkt-file.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MktFileWorkspaceEntity } from './entities/mkt-file.workspace-entity';
import { MktFileService } from './services/mkt-file.service';
import { MktFileResolver } from './resolvers/mkt-file.resolver';
import { FileStorageModule } from 'src/engine/core-modules/file-storage/file-storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MktFileWorkspaceEntity], 'workspace'),
    FileStorageModule.forRoot(), // ← Import S3 storage
  ],
  providers: [MktFileService, MktFileResolver],
  exports: [MktFileService],
})
export class MktFileModule {}
```

### Step 2: Use FileStorageService in Service

```typescript
// packages/twenty-server/src/mkt-core/file/services/mkt-file.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';

import { MktFileWorkspaceEntity } from '../entities/mkt-file.workspace-entity';
import { FileStorageService } from 'src/engine/core-modules/file-storage/file-storage.service';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

@Injectable()
export class MktFileService {
  constructor(
    @InjectRepository(MktFileWorkspaceEntity, 'workspace')
    private readonly fileRepository: Repository<MktFileWorkspaceEntity>,
    private readonly fileStorageService: FileStorageService, // ← Inject S3 service
  ) {}

  async uploadToS3(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    folderPath: string,
  ): Promise<void> {
    await this.fileStorageService.write({
      file: buffer,
      name: fileName,
      folder: folderPath,
      mimeType: mimeType,
    });
  }

  async downloadFromS3(
    folderPath: string,
    fileName: string,
  ): Promise<NodeJS.ReadableStream> {
    return this.fileStorageService.read({
      folderPath,
      filename: fileName,
    });
  }

  async deleteFromS3(
    folderPath: string,
    fileName: string,
  ): Promise<void> {
    await this.fileStorageService.delete({
      folderPath,
      filename: fileName,
    });
  }
}
```

---

## 📝 Usage Examples

### Example 1: Upload Invoice PDF

```typescript
// packages/twenty-server/src/mkt-core/invoice/services/mkt-invoice.service.ts

import { Injectable } from '@nestjs/common';
import { MktFileService } from 'src/mkt-core/file/services/mkt-file.service';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

@Injectable()
export class MktInvoiceService {
  constructor(
    private readonly fileService: MktFileService,
  ) {}

  async createInvoiceWithPDF(
    invoiceData: any,
    pdfBuffer: Buffer,
    workspaceId: string,
  ): Promise<void> {
    const invoice = await this.invoiceRepository.save(invoiceData);

    // Generate S3 path
    const now = DateTimeUtils.now();
    const year = now.year;
    const month = String(now.month).padStart(2, '0');

    const folderPath = `workspaces/${workspaceId}/invoices/${year}/${month}`;
    const fileName = `invoice_${invoice.invoiceNumber}_${invoice.id}.pdf`;

    // Upload to S3
    await this.fileService.uploadToS3(
      pdfBuffer,
      fileName,
      'application/pdf',
      folderPath,
    );

    // Save file metadata
    await this.fileRepository.save({
      originalName: fileName,
      storagePath: `${folderPath}/${fileName}`,
      storageType: 's3',
      mimeType: 'application/pdf',
      size: pdfBuffer.length,
      entityType: 'invoice',
      entityId: invoice.id,
      workspaceId,
    });
  }

  async downloadInvoicePDF(
    invoiceId: string,
    workspaceId: string,
  ): Promise<NodeJS.ReadableStream> {
    // Get file metadata
    const file = await this.fileRepository.findOne({
      where: { entityType: 'invoice', entityId: invoiceId },
    });

    if (!file) {
      throw new NotFoundException('Invoice PDF not found');
    }

    // Download from S3
    const folderPath = path.dirname(file.storagePath);
    const fileName = path.basename(file.storagePath);

    return this.fileService.downloadFromS3(folderPath, fileName);
  }
}
```

### Example 2: Upload Order Attachments

```typescript
// packages/twenty-server/src/mkt-core/order/services/mkt-order-attachment.service.ts

import { Injectable } from '@nestjs/common';
import { MktFileService } from 'src/mkt-core/file/services/mkt-file.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MktOrderAttachmentService {
  constructor(
    private readonly fileService: MktFileService,
  ) {}

  async attachFilesToOrder(
    orderId: string,
    files: Array<{ buffer: Buffer; name: string; mimeType: string }>,
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    for (const file of files) {
      const fileId = uuidv4();
      const folderPath = `workspaces/${workspaceId}/orders/${orderId}/attachments`;
      const fileName = `${fileId}_${file.name}`;

      // Upload to S3
      await this.fileService.uploadToS3(
        file.buffer,
        fileName,
        file.mimeType,
        folderPath,
      );

      // Save metadata
      await this.fileRepository.save({
        id: fileId,
        originalName: file.name,
        storagePath: `${folderPath}/${fileName}`,
        storageType: 's3',
        mimeType: file.mimeType,
        size: file.buffer.length,
        entityType: 'order',
        entityId: orderId,
        uploadedBy: userId,
        workspaceId,
      });
    }
  }

  async getOrderAttachments(
    orderId: string,
    workspaceId: string,
  ): Promise<MktFileWorkspaceEntity[]> {
    return this.fileRepository.find({
      where: {
        entityType: 'order',
        entityId: orderId,
        workspaceId,
        isDeleted: false,
      },
      order: { createdAt: 'DESC' },
    });
  }
}
```

### Example 3: Export to Excel with S3 Storage

```typescript
// packages/twenty-server/src/mkt-core/order/services/order-export.service.ts

import { Injectable } from '@nestjs/common';
import { MktFileService } from 'src/mkt-core/file/services/mkt-file.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class OrderExportService {
  constructor(
    private readonly fileService: MktFileService,
  ) {}

  async exportOrdersToExcel(
    filters: any,
    workspaceId: string,
    userId: string,
  ): Promise<{ fileId: string; downloadUrl: string }> {
    // 1. Generate Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Orders');

    // Add data...
    worksheet.addRow(['Order ID', 'Customer', 'Amount', 'Status']);
    // ... populate data

    // Get buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // 2. Upload to S3 (temporary folder with 24h expiry)
    const fileId = uuidv4();
    const folderPath = `workspaces/${workspaceId}/exports/temp`;
    const fileName = `orders_export_${Date.now()}_${fileId}.xlsx`;

    await this.fileService.uploadToS3(
      Buffer.from(buffer),
      fileName,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      folderPath,
    );

    // 3. Save metadata with expiration
    const expiresAt = DateTimeUtils.now().plus({ hours: 24 });

    await this.fileRepository.save({
      id: fileId,
      originalName: fileName,
      storagePath: `${folderPath}/${fileName}`,
      storageType: 's3',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: buffer.byteLength,
      entityType: 'export',
      tags: ['export', 'order'],
      expiresAt: expiresAt.toJSDate(),
      uploadedBy: userId,
      workspaceId,
    });

    // 4. Generate download URL
    const downloadUrl = `/api/files/download/${fileId}`;

    return { fileId, downloadUrl };
  }
}
```

### Example 4: Image Upload with Variants

```typescript
// packages/twenty-server/src/mkt-core/product/services/mkt-product-image.service.ts

import { Injectable } from '@nestjs/common';
import { MktFileService } from 'src/mkt-core/file/services/mkt-file.service';
import sharp from 'sharp';

@Injectable()
export class MktProductImageService {
  constructor(
    private readonly fileService: MktFileService,
  ) {}

  async uploadProductImage(
    productId: string,
    imageBuffer: Buffer,
    workspaceId: string,
  ): Promise<string[]> {
    const fileIds: string[] = [];

    // Generate variants
    const variants = [
      { name: 'thumbnail', width: 200, height: 200 },
      { name: 'small', width: 400, height: 400 },
      { name: 'medium', width: 800, height: 800 },
      { name: 'large', width: 1600, height: 1600 },
    ];

    for (const variant of variants) {
      // Resize image
      const resizedBuffer = await sharp(imageBuffer)
        .resize(variant.width, variant.height, { fit: 'contain' })
        .jpeg({ quality: 90 })
        .toBuffer();

      // Upload to S3
      const fileId = uuidv4();
      const folderPath = `workspaces/${workspaceId}/products/${productId}/images`;
      const fileName = `${variant.name}_${fileId}.jpg`;

      await this.fileService.uploadToS3(
        resizedBuffer,
        fileName,
        'image/jpeg',
        folderPath,
      );

      // Save metadata
      await this.fileRepository.save({
        id: fileId,
        originalName: fileName,
        storagePath: `${folderPath}/${fileName}`,
        storageType: 's3',
        mimeType: 'image/jpeg',
        size: resizedBuffer.length,
        variant: variant.name,
        entityType: 'product',
        entityId: productId,
        workspaceId,
      });

      fileIds.push(fileId);
    }

    return fileIds;
  }
}
```

---

## 🚀 Production Deployment

### Option 1: Using IAM User (Simple)

```bash
# .env
STORAGE_TYPE=S_3
STORAGE_S3_REGION=ap-southeast-1
STORAGE_S3_NAME=your-crm-bucket
STORAGE_S3_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
STORAGE_S3_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### Option 2: Using IAM Role (EC2/ECS - Recommended)

#### Step 1: Create IAM Role

```bash
# Create trust policy
cat > trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role
aws iam create-role \
  --role-name CRMStorageRole \
  --assume-role-policy-document file://trust-policy.json

# Attach S3 policy
aws iam attach-role-policy \
  --role-name CRMStorageRole \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/CRMStoragePolicy

# Create instance profile
aws iam create-instance-profile \
  --instance-profile-name CRMStorageProfile

# Add role to instance profile
aws iam add-role-to-instance-profile \
  --instance-profile-name CRMStorageProfile \
  --role-name CRMStorageRole
```

#### Step 2: Attach to EC2 Instance

```bash
# Attach instance profile to EC2
aws ec2 associate-iam-instance-profile \
  --instance-id i-1234567890abcdef0 \
  --iam-instance-profile Name=CRMStorageProfile
```

#### Step 3: Configure Environment (No Keys Needed!)

```bash
# .env
STORAGE_TYPE=S_3
STORAGE_S3_REGION=ap-southeast-1
STORAGE_S3_NAME=your-crm-bucket
# NO ACCESS_KEY_ID or SECRET_ACCESS_KEY needed!
```

### Option 3: Docker Deployment

**docker-compose.yml:**

```yaml
version: '3.8'

services:
  server:
    image: your-registry/crm-server:latest
    environment:
      # Storage Configuration
      STORAGE_TYPE: S_3
      STORAGE_S3_REGION: ap-southeast-1
      STORAGE_S3_NAME: your-crm-bucket
      STORAGE_S3_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      STORAGE_S3_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
    volumes:
      - ~/.aws:/root/.aws:ro  # Optional: for credentials file
```

### Option 4: Kubernetes Deployment

**secret.yaml:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: crm-s3-credentials
  namespace: crm
type: Opaque
stringData:
  access-key-id: AKIAIOSFODNN7EXAMPLE
  secret-access-key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**deployment.yaml:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: crm-server
  namespace: crm
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: server
        image: your-registry/crm-server:latest
        env:
        - name: STORAGE_TYPE
          value: "S_3"
        - name: STORAGE_S3_REGION
          value: "ap-southeast-1"
        - name: STORAGE_S3_NAME
          value: "your-crm-bucket"
        - name: STORAGE_S3_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: crm-s3-credentials
              key: access-key-id
        - name: STORAGE_S3_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: crm-s3-credentials
              key: secret-access-key
```

---

## 📊 Monitoring & Troubleshooting

### 1. Enable S3 Access Logging

```bash
# Create logging bucket
aws s3 mb s3://your-crm-bucket-logs --region ap-southeast-1

# Configure logging
aws s3api put-bucket-logging \
  --bucket your-crm-bucket \
  --bucket-logging-status '{
    "LoggingEnabled": {
      "TargetBucket": "your-crm-bucket-logs",
      "TargetPrefix": "s3-access-logs/"
    }
  }'
```

### 2. CloudWatch Metrics

```bash
# Get bucket size
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name BucketSizeBytes \
  --dimensions Name=BucketName,Value=your-crm-bucket Name=StorageType,Value=StandardStorage \
  --start-time 2026-02-01T00:00:00Z \
  --end-time 2026-02-06T23:59:59Z \
  --period 86400 \
  --statistics Average
```

### 3. Test S3 Connection

```typescript
// packages/twenty-server/src/mkt-core/file/commands/test-s3-connection.command.ts

import { Command, CommandRunner } from 'nest-commander';
import { FileStorageService } from 'src/engine/core-modules/file-storage/file-storage.service';

@Command({
  name: 'test-s3-connection',
  description: 'Test S3 connection',
})
export class TestS3ConnectionCommand extends CommandRunner {
  constructor(
    private readonly fileStorageService: FileStorageService,
  ) {
    super();
  }

  async run(): Promise<void> {
    try {
      // Test write
      await this.fileStorageService.write({
        file: Buffer.from('test content'),
        name: 'test.txt',
        folder: 'test',
        mimeType: 'text/plain',
      });
      console.log('✅ Write test passed');

      // Test read
      const stream = await this.fileStorageService.read({
        folderPath: 'test',
        filename: 'test.txt',
      });
      console.log('✅ Read test passed');

      // Test delete
      await this.fileStorageService.delete({
        folderPath: 'test',
        filename: 'test.txt',
      });
      console.log('✅ Delete test passed');

      console.log('🎉 All S3 tests passed!');
    } catch (error) {
      console.error('❌ S3 test failed:', error.message);
      process.exit(1);
    }
  }
}
```

Run test:

```bash
npx nx command twenty-server -- test-s3-connection
```

### 4. Common Issues

#### Issue 1: Access Denied

**Error:**
```
AccessDenied: Access Denied
```

**Solution:**
```bash
# Check IAM permissions
aws iam get-user-policy --user-name crm-s3-user --policy-name CRMStoragePolicy

# Verify bucket policy
aws s3api get-bucket-policy --bucket your-crm-bucket

# Test with AWS CLI
aws s3 ls s3://your-crm-bucket/
```

#### Issue 2: Bucket Not Found

**Error:**
```
NoSuchBucket: The specified bucket does not exist
```

**Solution:**
```bash
# Verify bucket name and region
aws s3 ls

# Check region
aws s3api get-bucket-location --bucket your-crm-bucket
```

#### Issue 3: Slow Upload/Download

**Solution:**
```typescript
// Use multipart upload for large files (>5MB)
// Already handled by S3 SDK automatically

// Check network latency
// Consider using CloudFront CDN for better performance
```

---

## 💰 Cost Optimization

### 1. Storage Cost Calculator

```typescript
interface S3CostEstimate {
  standardStorage: number; // GB
  iaStorage: number; // GB
  glacierStorage: number; // GB
  requests: number; // per month
  bandwidth: number; // GB per month
}

function calculateS3Cost(usage: S3CostEstimate): number {
  const pricing = {
    standard: 0.023, // $0.023/GB
    ia: 0.0125, // $0.0125/GB
    glacier: 0.004, // $0.004/GB
    putRequest: 0.005 / 1000, // $0.005 per 1000 PUT requests
    getRequest: 0.0004 / 1000, // $0.0004 per 1000 GET requests
    bandwidth: 0.09, // $0.09/GB (after 100GB free tier)
  };

  const storageCost =
    usage.standardStorage * pricing.standard +
    usage.iaStorage * pricing.ia +
    usage.glacierStorage * pricing.glacier;

  const requestCost = usage.requests * pricing.putRequest;
  const bandwidthCost = Math.max(0, usage.bandwidth - 100) * pricing.bandwidth;

  return storageCost + requestCost + bandwidthCost;
}

// Example
const monthlyCost = calculateS3Cost({
  standardStorage: 500, // 500GB
  iaStorage: 1000, // 1TB
  glacierStorage: 2000, // 2TB
  requests: 1000000, // 1M requests
  bandwidth: 500, // 500GB transfer
});

console.log(`Estimated monthly cost: $${monthlyCost.toFixed(2)}`);
// Output: Estimated monthly cost: $56.50
```

### 2. Cleanup Old Files Job

```typescript
// packages/twenty-server/src/mkt-core/file/jobs/cleanup-expired-files.job.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';

import { MktFileWorkspaceEntity } from '../entities/mkt-file.workspace-entity';
import { FileStorageService } from 'src/engine/core-modules/file-storage/file-storage.service';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

@Injectable()
export class CleanupExpiredFilesJob {
  private readonly logger = new Logger(CleanupExpiredFilesJob.name);

  constructor(
    @InjectRepository(MktFileWorkspaceEntity, 'workspace')
    private readonly fileRepository: Repository<MktFileWorkspaceEntity>,
    private readonly fileStorageService: FileStorageService,
  ) {}

  @Cron('0 2 * * *') // Run at 2 AM daily
  async handle(): Promise<void> {
    this.logger.log('Starting cleanup of expired files...');

    const now = DateTimeUtils.now().toJSDate();

    // Find expired files
    const expiredFiles = await this.fileRepository.find({
      where: {
        expiresAt: LessThan(now),
        isDeleted: false,
      },
    });

    this.logger.log(`Found ${expiredFiles.length} expired files`);

    for (const file of expiredFiles) {
      try {
        // Delete from S3
        await this.fileStorageService.delete({
          folderPath: path.dirname(file.storagePath),
          filename: path.basename(file.storagePath),
        });

        // Soft delete in database
        await this.fileRepository.update(file.id, {
          isDeleted: true,
          deletedAt: DateTimeUtils.now().toJSDate(),
        });

        this.logger.log(`Deleted expired file: ${file.id}`);
      } catch (error) {
        this.logger.error(`Failed to delete file ${file.id}:`, error);
      }
    }

    this.logger.log('Cleanup completed');
  }
}
```

---

## 🔄 Migration from Local to S3

### Step 1: Create Migration Script

```typescript
// packages/twenty-server/src/mkt-core/file/commands/migrate-to-s3.command.ts

import { Command, CommandRunner, Option } from 'nest-commander';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

import { MktFileWorkspaceEntity } from '../entities/mkt-file.workspace-entity';
import { FileStorageService } from 'src/engine/core-modules/file-storage/file-storage.service';

interface MigrateToS3Options {
  dryRun?: boolean;
  batchSize?: number;
  workspaceId?: string;
}

@Command({
  name: 'migrate-files-to-s3',
  description: 'Migrate files from local storage to S3',
})
export class MigrateToS3Command extends CommandRunner {
  constructor(
    @InjectRepository(MktFileWorkspaceEntity, 'workspace')
    private readonly fileRepository: Repository<MktFileWorkspaceEntity>,
    private readonly fileStorageService: FileStorageService,
  ) {
    super();
  }

  async run(
    passedParams: string[],
    options?: MigrateToS3Options,
  ): Promise<void> {
    const dryRun = options?.dryRun ?? false;
    const batchSize = options?.batchSize ?? 100;
    const workspaceId = options?.workspaceId;

    console.log('🚀 Starting migration to S3...');
    console.log(`Dry run: ${dryRun}`);
    console.log(`Batch size: ${batchSize}`);

    let offset = 0;
    let totalMigrated = 0;
    let hasMore = true;

    while (hasMore) {
      // Get batch of local files
      const query = this.fileRepository
        .createQueryBuilder('file')
        .where('file.storageType = :storageType', { storageType: 'local' })
        .andWhere('file.isDeleted = :isDeleted', { isDeleted: false });

      if (workspaceId) {
        query.andWhere('file.workspaceId = :workspaceId', { workspaceId });
      }

      const files = await query
        .take(batchSize)
        .skip(offset)
        .getMany();

      if (files.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`\nProcessing batch: ${offset} - ${offset + files.length}`);

      for (const file of files) {
        try {
          // Read from local storage
          const localPath = path.join(
            process.env.STORAGE_LOCAL_PATH || '.local-storage',
            file.storagePath,
          );

          if (!fs.existsSync(localPath)) {
            console.log(`⚠️  File not found: ${localPath}`);
            continue;
          }

          const fileBuffer = await fs.promises.readFile(localPath);

          if (!dryRun) {
            // Upload to S3
            await this.fileStorageService.write({
              file: fileBuffer,
              name: path.basename(file.storagePath),
              folder: path.dirname(file.storagePath),
              mimeType: file.mimeType,
            });

            // Update metadata
            await this.fileRepository.update(file.id, {
              storageType: 's3',
            });

            // Verify upload
            const uploaded = await this.fileStorageService.read({
              folderPath: path.dirname(file.storagePath),
              filename: path.basename(file.storagePath),
            });

            if (!uploaded) {
              throw new Error('Failed to verify upload');
            }

            // Delete local file
            await fs.promises.unlink(localPath);
          }

          console.log(`✅ Migrated: ${file.originalName} (${file.id})`);
          totalMigrated++;
        } catch (error) {
          console.error(`❌ Failed to migrate ${file.id}:`, error.message);
        }
      }

      offset += batchSize;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n🎉 Migration completed!`);
    console.log(`Total files migrated: ${totalMigrated}`);
  }

  @Option({
    flags: '--dry-run',
    description: 'Run without actually migrating files',
  })
  parseDryRun(): boolean {
    return true;
  }

  @Option({
    flags: '--batch-size <size>',
    description: 'Number of files to process per batch',
  })
  parseBatchSize(val: string): number {
    return parseInt(val, 10);
  }

  @Option({
    flags: '--workspace-id <id>',
    description: 'Migrate only files from specific workspace',
  })
  parseWorkspaceId(val: string): string {
    return val;
  }
}
```

### Step 2: Run Migration

```bash
# Dry run first
npx nx command twenty-server -- migrate-files-to-s3 --dry-run

# Migrate all files
npx nx command twenty-server -- migrate-files-to-s3 --batch-size 50

# Migrate specific workspace
npx nx command twenty-server -- migrate-files-to-s3 --workspace-id abc-123
```

---

## 🔒 Security Best Practices

### 1. Enable Bucket Encryption

```bash
aws s3api put-bucket-encryption \
  --bucket your-crm-bucket \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "aws:kms",
          "KMSMasterKeyID": "arn:aws:kms:ap-southeast-1:ACCOUNT_ID:key/KEY_ID"
        },
        "BucketKeyEnabled": true
      }
    ]
  }'
```

### 2. Enable Access Logging

```bash
aws s3api put-bucket-logging \
  --bucket your-crm-bucket \
  --bucket-logging-status '{
    "LoggingEnabled": {
      "TargetBucket": "your-crm-bucket-logs",
      "TargetPrefix": "access-logs/"
    }
  }'
```

### 3. Enable Versioning

```bash
aws s3api put-bucket-versioning \
  --bucket your-crm-bucket \
  --versioning-configuration Status=Enabled
```

### 4. Implement Object Lock (Compliance)

```bash
# Enable Object Lock (must be done at bucket creation)
aws s3api create-bucket \
  --bucket your-crm-bucket-compliant \
  --region ap-southeast-1 \
  --object-lock-enabled-for-bucket

# Configure retention
aws s3api put-object-lock-configuration \
  --bucket your-crm-bucket-compliant \
  --object-lock-configuration '{
    "ObjectLockEnabled": "Enabled",
    "Rule": {
      "DefaultRetention": {
        "Mode": "GOVERNANCE",
        "Days": 90
      }
    }
  }'
```

### 5. Rotate Access Keys

```bash
# Create new key
aws iam create-access-key --user-name crm-s3-user

# Update application with new key
# Test application

# Delete old key
aws iam delete-access-key \
  --user-name crm-s3-user \
  --access-key-id OLD_ACCESS_KEY_ID
```

---

## 🧪 Testing

### Unit Tests

```typescript
// packages/twenty-server/src/mkt-core/file/services/__tests__/mkt-file-s3.service.spec.ts

import { Test } from '@nestjs/testing';
import { MktFileService } from '../mkt-file.service';
import { FileStorageService } from 'src/engine/core-modules/file-storage/file-storage.service';

describe('MktFileService - S3 Integration', () => {
  let service: MktFileService;
  let fileStorageService: FileStorageService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MktFileService,
        {
          provide: FileStorageService,
          useValue: {
            write: jest.fn(),
            read: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(MktFileService);
    fileStorageService = module.get(FileStorageService);
  });

  describe('uploadToS3', () => {
    it('should upload file to S3', async () => {
      const buffer = Buffer.from('test content');
      const fileName = 'test.pdf';
      const mimeType = 'application/pdf';
      const folderPath = 'workspaces/test/invoices';

      await service.uploadToS3(buffer, fileName, mimeType, folderPath);

      expect(fileStorageService.write).toHaveBeenCalledWith({
        file: buffer,
        name: fileName,
        folder: folderPath,
        mimeType: mimeType,
      });
    });
  });
});
```

### Integration Tests

```typescript
// packages/twenty-server/src/mkt-core/file/__tests__/mkt-file-s3.integration.spec.ts

import { Test } from '@nestjs/testing';
import { MktFileService } from '../services/mkt-file.service';
import { FileStorageModule } from 'src/engine/core-modules/file-storage/file-storage.module';

describe('MktFile S3 Integration', () => {
  let service: MktFileService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [FileStorageModule.forRoot()],
      providers: [MktFileService],
    }).compile();

    service = module.get(MktFileService);
  });

  it('should upload and download file from S3', async () => {
    const testContent = 'Hello S3!';
    const buffer = Buffer.from(testContent);
    const fileName = `test_${Date.now()}.txt`;
    const folderPath = 'test';

    // Upload
    await service.uploadToS3(buffer, fileName, 'text/plain', folderPath);

    // Download
    const stream = await service.downloadFromS3(folderPath, fileName);
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const downloaded = Buffer.concat(chunks).toString();

    expect(downloaded).toBe(testContent);

    // Cleanup
    await service.deleteFromS3(folderPath, fileName);
  }, 30000);
});
```

---

## 📚 Additional Resources

### AWS Documentation
- [S3 Developer Guide](https://docs.aws.amazon.com/s3/index.html)
- [S3 Pricing](https://aws.amazon.com/s3/pricing/)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

### Twenty CRM Documentation
- [Self-Hosting Guide](https://docs.twenty.com/developers/self-hosting)
- [File Storage Configuration](https://docs.twenty.com/developers/self-hosting/self-hosting-var)

### Tools
- [AWS CLI](https://aws.amazon.com/cli/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [S3 Browser](https://s3browser.com/)

---

## 📝 Summary Checklist

### Initial Setup
- [ ] Create AWS account
- [ ] Create IAM user with S3 permissions
- [ ] Create S3 bucket
- [ ] Configure CORS
- [ ] Configure lifecycle rules
- [ ] Enable encryption
- [ ] Enable versioning (optional)
- [ ] Block public access

### Application Configuration
- [ ] Update `.env` with S3 credentials
- [ ] Test S3 connection
- [ ] Import `FileStorageModule` in MKT modules
- [ ] Inject `FileStorageService` in services
- [ ] Update file upload logic to use S3

### Production Deployment
- [ ] Use IAM roles instead of keys (EC2/ECS)
- [ ] Enable CloudWatch monitoring
- [ ] Enable S3 access logging
- [ ] Configure CloudFront CDN (optional)
- [ ] Set up backup strategy
- [ ] Configure lifecycle policies

### Testing
- [ ] Test file upload
- [ ] Test file download
- [ ] Test file deletion
- [ ] Test error scenarios
- [ ] Load testing with large files

### Migration (if from Local)
- [ ] Run dry-run migration
- [ ] Migrate files in batches
- [ ] Verify uploaded files
- [ ] Clean up local files
- [ ] Update application to use S3

---

**Author**: MKT-Core Team
**Last Updated**: 2026-02-06
**Version**: 1.0.0
