# File Management Implementation Example

## 📋 Mục lục

1. [Workspace Entity](#workspace-entity)
2. [Service Layer](#service-layer)
3. [GraphQL Resolver](#graphql-resolver)
4. [Frontend Integration](#frontend-integration)
5. [Use Cases](#use-cases)
6. [Testing](#testing)

---

## 🗄️ Workspace Entity

### 1. File Entity

```typescript
// packages/twenty-server/src/mkt-core/file/entities/mkt-file.workspace-entity.ts

import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { MKT_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';
import {
  FieldMetadataType,
  RelationMetadataType,
} from 'src/engine/metadata-modules/field-metadata/field-metadata.entity';
import {
  WorkspaceEntity,
  WorkspaceField,
  WorkspaceRelation,
} from 'src/engine/twenty-orm/decorators';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktFile,
  namePlural: 'mktFiles',
  labelSingular: 'File',
  labelPlural: 'Files',
  description: 'File storage and management',
  icon: 'IconFile',
})
export class MktFileWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktFile.originalName,
    type: FieldMetadataType.TEXT,
    label: 'Original Name',
    description: 'Original filename with extension',
    icon: 'IconFileText',
  })
  originalName: string;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktFile.storagePath,
    type: FieldMetadataType.TEXT,
    label: 'Storage Path',
    description: 'Path in S3 or local storage',
    icon: 'IconFolderOpen',
  })
  storagePath: string;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktFile.storageType,
    type: FieldMetadataType.SELECT,
    label: 'Storage Type',
    description: 'Storage backend type',
    icon: 'IconDatabase',
    options: [
      { value: 'local', label: 'Local Storage', color: 'blue' },
      { value: 's3', label: 'AWS S3', color: 'green' },
      { value: 'cdn', label: 'CDN', color: 'purple' },
    ],
    defaultValue: "'s3'",
  })
  storageType: string;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktFile.mimeType,
    type: FieldMetadataType.TEXT,
    label: 'MIME Type',
    description: 'File MIME type (e.g., application/pdf)',
    icon: 'IconFileType',
  })
  mimeType: string;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktFile.size,
    type: FieldMetadataType.NUMBER,
    label: 'Size (bytes)',
    description: 'File size in bytes',
    icon: 'IconWeight',
  })
  size: number;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktFile.checksum,
    type: FieldMetadataType.TEXT,
    label: 'Checksum',
    description: 'SHA-256 hash for integrity verification',
    icon: 'IconShieldCheck',
  })
  checksum: string;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktFile.entityType,
    type: FieldMetadataType.SELECT,
    label: 'Entity Type',
    description: 'Type of entity this file belongs to',
    icon: 'IconCategory',
    options: [
      { value: 'invoice', label: 'Invoice', color: 'blue' },
      { value: 'order', label: 'Order', color: 'green' },
      { value: 'attachment', label: 'Attachment', color: 'purple' },
      { value: 'avatar', label: 'Avatar', color: 'orange' },
      { value: 'document', label: 'Document', color: 'red' },
      { value: 'export', label: 'Export', color: 'yellow' },
    ],
  })
  entityType: string;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktFile.entityId,
    type: FieldMetadataType.UUID,
    label: 'Entity ID',
    description: 'UUID of related entity',
    icon: 'IconLink',
  })
  entityId?: string;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktFile.variant,
    type: FieldMetadataType.TEXT,
    label: 'Variant',
    description: 'File variant (e.g., thumbnail, small, large)',
    icon: 'IconVersions',
  })
  variant?: string;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktFile.version,
    type: FieldMetadataType.NUMBER,
    label: 'Version',
    description: 'File version number',
    icon: 'IconGitBranch',
    defaultValue: 1,
  })
  version: number;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktFile.isCompressed,
    type: FieldMetadataType.BOOLEAN,
    label: 'Is Compressed',
    description: 'Whether file is compressed',
    icon: 'IconZip',
    defaultValue: false,
  })
  isCompressed: boolean;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktFile.isDeduplicated,
    type: FieldMetadataType.BOOLEAN,
    label: 'Is Deduplicated',
    description: 'Whether file is a reference to existing file',
    icon: 'IconCopy',
    defaultValue: false,
  })
  isDeduplicated: boolean;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktFile.originalFileId,
    type: FieldMetadataType.UUID,
    label: 'Original File ID',
    description: 'ID of original file if deduplicated',
    icon: 'IconFileSymlink',
  })
  originalFileId?: string;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktFile.referenceCount,
    type: FieldMetadataType.NUMBER,
    label: 'Reference Count',
    description: 'Number of references to this file',
    icon: 'IconUsers',
    defaultValue: 1,
  })
  referenceCount: number;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktFile.downloadCount,
    type: FieldMetadataType.NUMBER,
    label: 'Download Count',
    description: 'Number of times file was downloaded',
    icon: 'IconDownload',
    defaultValue: 0,
  })
  downloadCount: number;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktFile.lastAccessedAt,
    type: FieldMetadataType.DATE_TIME,
    label: 'Last Accessed At',
    description: 'Last time file was accessed',
    icon: 'IconClock',
  })
  lastAccessedAt?: Date;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktFile.expiresAt,
    type: FieldMetadataType.DATE_TIME,
    label: 'Expires At',
    description: 'Expiration date for temporary files',
    icon: 'IconAlarm',
  })
  expiresAt?: Date;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktFile.tags,
    type: FieldMetadataType.MULTI_SELECT,
    label: 'Tags',
    description: 'File tags for organization',
    icon: 'IconTags',
    options: [
      { value: 'important', label: 'Important', color: 'red' },
      { value: 'invoice', label: 'Invoice', color: 'blue' },
      { value: 'contract', label: 'Contract', color: 'green' },
      { value: 'report', label: 'Report', color: 'purple' },
    ],
  })
  tags?: string[];

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktFile.isPublic,
    type: FieldMetadataType.BOOLEAN,
    label: 'Is Public',
    description: 'Whether file is publicly accessible',
    icon: 'IconWorld',
    defaultValue: false,
  })
  isPublic: boolean;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktFile.isDeleted,
    type: FieldMetadataType.BOOLEAN,
    label: 'Is Deleted',
    description: 'Soft delete flag',
    icon: 'IconTrash',
    defaultValue: false,
  })
  isDeleted: boolean;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktFile.deletedAt,
    type: FieldMetadataType.DATE_TIME,
    label: 'Deleted At',
    description: 'Soft deletion timestamp',
    icon: 'IconTrashX',
  })
  deletedAt?: Date;

  @WorkspaceField({
    standardId: MKT_FIELD_IDS.mktFile.metadata,
    type: FieldMetadataType.RAW_JSON,
    label: 'Metadata',
    description: 'Additional file metadata (JSON)',
    icon: 'IconJson',
  })
  metadata?: Record<string, any>;

  // Relations
  @WorkspaceRelation({
    standardId: MKT_FIELD_IDS.mktFile.uploadedBy,
    type: RelationMetadataType.MANY_TO_ONE,
    label: 'Uploaded By',
    description: 'User who uploaded the file',
    icon: 'IconUser',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    inverseSideFieldKey: 'uploadedFiles',
  })
  uploadedBy: Relation<WorkspaceMemberWorkspaceEntity>;
}
```

### 2. Add Object ID Constant

```typescript
// packages/twenty-server/src/mkt-core/constants/mkt-object-ids.ts

export const MKT_OBJECT_IDS = {
  // ... existing IDs
  mktFile: 'mkt-file-00000000-0000-4000-8000-000000000001',
};
```

### 3. Add Field ID Constants

```typescript
// packages/twenty-server/src/mkt-core/constants/mkt-field-ids.ts

export const MKT_FIELD_IDS = {
  // ... existing fields
  mktFile: {
    originalName: 'mkt-file-original-name-001',
    storagePath: 'mkt-file-storage-path-002',
    storageType: 'mkt-file-storage-type-003',
    mimeType: 'mkt-file-mime-type-004',
    size: 'mkt-file-size-005',
    checksum: 'mkt-file-checksum-006',
    entityType: 'mkt-file-entity-type-007',
    entityId: 'mkt-file-entity-id-008',
    variant: 'mkt-file-variant-009',
    version: 'mkt-file-version-010',
    isCompressed: 'mkt-file-is-compressed-011',
    isDeduplicated: 'mkt-file-is-deduplicated-012',
    originalFileId: 'mkt-file-original-file-id-013',
    referenceCount: 'mkt-file-reference-count-014',
    downloadCount: 'mkt-file-download-count-015',
    lastAccessedAt: 'mkt-file-last-accessed-at-016',
    expiresAt: 'mkt-file-expires-at-017',
    tags: 'mkt-file-tags-018',
    isPublic: 'mkt-file-is-public-019',
    isDeleted: 'mkt-file-is-deleted-020',
    deletedAt: 'mkt-file-deleted-at-021',
    metadata: 'mkt-file-metadata-022',
    uploadedBy: 'mkt-file-uploaded-by-023',
  },
};
```

---

## 🔧 Service Layer

### 1. File Management Service

```typescript
// packages/twenty-server/src/mkt-core/file/services/mkt-file.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';
import FileType from 'file-type';

import { MktFileWorkspaceEntity } from '../entities/mkt-file.workspace-entity';
import { FileStorageService } from 'src/engine/core-modules/file-storage/file-storage.service';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

export interface FileUploadInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  entityType: string;
  entityId?: string;
  tags?: string[];
  expiresAt?: Date;
}

export interface FileUploadResult {
  file: MktFileWorkspaceEntity;
  downloadUrl?: string;
}

@Injectable()
export class MktFileService {
  constructor(
    @InjectRepository(MktFileWorkspaceEntity, 'workspace')
    private readonly fileRepository: Repository<MktFileWorkspaceEntity>,
    private readonly fileStorageService: FileStorageService,
  ) {}

  /**
   * Upload a file to storage
   */
  async uploadFile(
    input: FileUploadInput,
    workspaceId: string,
    userId: string,
  ): Promise<FileUploadResult> {
    // 1. Validate file
    await this.validateFile(input.buffer, input.mimeType);

    // 2. Calculate checksum
    const checksum = this.calculateChecksum(input.buffer);

    // 3. Check for duplicates
    const existingFile = await this.findByChecksum(checksum, workspaceId);
    if (existingFile && input.entityType !== 'avatar') {
      return this.createDuplicateReference(existingFile, input, userId);
    }

    // 4. Generate storage path
    const storagePath = this.generateStoragePath(
      workspaceId,
      input.entityType,
      input.originalName,
    );

    // 5. Upload to storage
    await this.fileStorageService.write({
      file: input.buffer,
      name: path.basename(storagePath),
      folder: path.dirname(storagePath),
      mimeType: input.mimeType,
    });

    // 6. Save metadata to database
    const file = await this.fileRepository.save({
      id: uuidv4(),
      originalName: input.originalName,
      storagePath,
      storageType: 's3',
      mimeType: input.mimeType,
      size: input.buffer.length,
      checksum,
      entityType: input.entityType,
      entityId: input.entityId,
      tags: input.tags,
      expiresAt: input.expiresAt,
      uploadedBy: { id: userId } as any,
      version: 1,
      isCompressed: false,
      isDeduplicated: false,
      referenceCount: 1,
      downloadCount: 0,
      isPublic: false,
      isDeleted: false,
      lastAccessedAt: DateTimeUtils.now(),
    });

    return { file };
  }

  /**
   * Get file by ID
   */
  async getFile(
    fileId: string,
    workspaceId: string,
  ): Promise<MktFileWorkspaceEntity> {
    const file = await this.fileRepository.findOne({
      where: { id: fileId },
      relations: ['uploadedBy'],
    });

    if (!file || file.isDeleted) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  /**
   * Download file stream
   */
  async downloadFile(
    fileId: string,
    workspaceId: string,
    userId: string,
  ): Promise<{ stream: Readable; file: MktFileWorkspaceEntity }> {
    const file = await this.getFile(fileId, workspaceId);

    // TODO: Check permissions
    await this.checkPermission(userId, file);

    // Get file stream from storage
    const stream = await this.fileStorageService.read({
      folderPath: path.dirname(file.storagePath),
      filename: path.basename(file.storagePath),
    });

    // Update download count and last accessed
    await this.fileRepository.update(fileId, {
      downloadCount: () => 'downloadCount + 1',
      lastAccessedAt: DateTimeUtils.now(),
    });

    return { stream, file };
  }

  /**
   * Generate download URL (pre-signed)
   */
  async generateDownloadUrl(
    fileId: string,
    workspaceId: string,
    userId: string,
    expiresIn: number = 3600, // 1 hour
  ): Promise<string> {
    const file = await this.getFile(fileId, workspaceId);

    // Check permissions
    await this.checkPermission(userId, file);

    // For now, return a token-based URL
    // In production, use S3 pre-signed URLs
    const token = this.generateFileToken(fileId, userId, expiresIn);

    return `/api/files/download/${fileId}?token=${token}`;
  }

  /**
   * Delete file (soft delete)
   */
  async deleteFile(
    fileId: string,
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const file = await this.getFile(fileId, workspaceId);

    // Check permissions
    await this.checkPermission(userId, file);

    // Handle deduplicated files
    if (file.isDeduplicated && file.originalFileId) {
      // Decrement reference count
      await this.fileRepository.decrement(
        { id: file.originalFileId },
        'referenceCount',
        1,
      );
    }

    // Soft delete
    await this.fileRepository.update(fileId, {
      isDeleted: true,
      deletedAt: DateTimeUtils.now(),
    });

    // TODO: Schedule physical deletion after 30 days
  }

  /**
   * List files with filters
   */
  async listFiles(
    workspaceId: string,
    filters?: {
      entityType?: string;
      entityId?: string;
      uploadedBy?: string;
      tags?: string[];
    },
    pagination?: { limit?: number; offset?: number },
  ): Promise<{ files: MktFileWorkspaceEntity[]; total: number }> {
    const query = this.fileRepository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.uploadedBy', 'uploadedBy')
      .where('file.isDeleted = :isDeleted', { isDeleted: false });

    if (filters?.entityType) {
      query.andWhere('file.entityType = :entityType', {
        entityType: filters.entityType,
      });
    }

    if (filters?.entityId) {
      query.andWhere('file.entityId = :entityId', {
        entityId: filters.entityId,
      });
    }

    if (filters?.uploadedBy) {
      query.andWhere('file.uploadedBy = :uploadedBy', {
        uploadedBy: filters.uploadedBy,
      });
    }

    if (filters?.tags && filters.tags.length > 0) {
      query.andWhere('file.tags && :tags', { tags: filters.tags });
    }

    const total = await query.getCount();

    if (pagination?.limit) {
      query.take(pagination.limit);
    }

    if (pagination?.offset) {
      query.skip(pagination.offset);
    }

    query.orderBy('file.createdAt', 'DESC');

    const files = await query.getMany();

    return { files, total };
  }

  /**
   * Get files by entity
   */
  async getFilesByEntity(
    entityType: string,
    entityId: string,
    workspaceId: string,
  ): Promise<MktFileWorkspaceEntity[]> {
    const { files } = await this.listFiles(workspaceId, {
      entityType,
      entityId,
    });

    return files;
  }

  /**
   * Update file metadata
   */
  async updateFileMetadata(
    fileId: string,
    workspaceId: string,
    userId: string,
    updates: {
      originalName?: string;
      tags?: string[];
      isPublic?: boolean;
      metadata?: Record<string, any>;
    },
  ): Promise<MktFileWorkspaceEntity> {
    const file = await this.getFile(fileId, workspaceId);

    // Check permissions
    await this.checkPermission(userId, file);

    await this.fileRepository.update(fileId, updates);

    return this.getFile(fileId, workspaceId);
  }

  // ===== Private Methods =====

  private async validateFile(buffer: Buffer, declaredMimeType: string): Promise<void> {
    // Detect actual MIME type from file content
    const detectedType = await FileType.fromBuffer(buffer);

    if (!detectedType) {
      // For text files, FileType might return null
      if (!declaredMimeType.startsWith('text/')) {
        throw new BadRequestException('Unable to detect file type');
      }
      return;
    }

    // Verify MIME type matches
    if (detectedType.mime !== declaredMimeType) {
      throw new BadRequestException(
        `File type mismatch: expected ${declaredMimeType}, got ${detectedType.mime}`,
      );
    }

    // Check file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (buffer.length > maxSize) {
      throw new BadRequestException('File size exceeds 100MB limit');
    }
  }

  private calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private async findByChecksum(
    checksum: string,
    workspaceId: string,
  ): Promise<MktFileWorkspaceEntity | null> {
    return this.fileRepository.findOne({
      where: {
        checksum,
        isDeleted: false,
      },
    });
  }

  private async createDuplicateReference(
    originalFile: MktFileWorkspaceEntity,
    input: FileUploadInput,
    userId: string,
  ): Promise<FileUploadResult> {
    // Create new metadata entry pointing to same file
    const file = await this.fileRepository.save({
      id: uuidv4(),
      originalName: input.originalName,
      storagePath: originalFile.storagePath,
      storageType: originalFile.storageType,
      mimeType: originalFile.mimeType,
      size: originalFile.size,
      checksum: originalFile.checksum,
      entityType: input.entityType,
      entityId: input.entityId,
      tags: input.tags,
      uploadedBy: { id: userId } as any,
      version: 1,
      isDeduplicated: true,
      originalFileId: originalFile.id,
      referenceCount: 1,
      isDeleted: false,
    });

    // Increment reference count on original
    await this.fileRepository.increment(
      { id: originalFile.id },
      'referenceCount',
      1,
    );

    return { file };
  }

  private generateStoragePath(
    workspaceId: string,
    entityType: string,
    originalName: string,
  ): string {
    const fileId = uuidv4();
    const ext = path.extname(originalName);
    const now = DateTimeUtils.now();
    const year = now.year;
    const month = String(now.month).padStart(2, '0');

    return `workspaces/${workspaceId}/${entityType}/${year}/${month}/${fileId}${ext}`;
  }

  private async checkPermission(
    userId: string,
    file: MktFileWorkspaceEntity,
  ): Promise<void> {
    // TODO: Implement RBAC permission check
    // For now, just check if user is the uploader
    const uploaderId = typeof file.uploadedBy === 'string'
      ? file.uploadedBy
      : file.uploadedBy?.id;

    if (uploaderId !== userId && !file.isPublic) {
      throw new BadRequestException('No permission to access this file');
    }
  }

  private generateFileToken(
    fileId: string,
    userId: string,
    expiresIn: number,
  ): string {
    // Simple token generation (use JWT in production)
    const data = {
      fileId,
      userId,
      exp: Math.floor(Date.now() / 1000) + expiresIn,
    };

    return Buffer.from(JSON.stringify(data)).toString('base64');
  }
}
```

---

## 📡 GraphQL Resolver

### 1. DTOs

```typescript
// packages/twenty-server/src/mkt-core/file/dto/file-upload.input.ts

import { Field, InputType } from '@nestjs/graphql';
import { GraphQLUpload, FileUpload as GraphQLFileUpload } from 'graphql-upload';

@InputType()
export class FileUploadInput {
  @Field(() => GraphQLUpload)
  file: GraphQLFileUpload;

  @Field()
  entityType: string;

  @Field({ nullable: true })
  entityId?: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field({ nullable: true })
  expiresAt?: Date;
}

@InputType()
export class FileFilterInput {
  @Field({ nullable: true })
  entityType?: string;

  @Field({ nullable: true })
  entityId?: string;

  @Field({ nullable: true })
  uploadedBy?: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];
}

@InputType()
export class FilePaginationInput {
  @Field({ nullable: true, defaultValue: 20 })
  limit?: number;

  @Field({ nullable: true, defaultValue: 0 })
  offset?: number;
}
```

```typescript
// packages/twenty-server/src/mkt-core/file/dto/file.output.ts

import { Field, ObjectType, Int } from '@nestjs/graphql';

@ObjectType()
export class FileOutput {
  @Field()
  id: string;

  @Field()
  originalName: string;

  @Field()
  storagePath: string;

  @Field()
  storageType: string;

  @Field()
  mimeType: string;

  @Field(() => Int)
  size: number;

  @Field()
  checksum: string;

  @Field()
  entityType: string;

  @Field({ nullable: true })
  entityId?: string;

  @Field({ nullable: true })
  variant?: string;

  @Field(() => Int)
  version: number;

  @Field()
  isCompressed: boolean;

  @Field()
  isDeduplicated: boolean;

  @Field({ nullable: true })
  originalFileId?: string;

  @Field(() => Int)
  referenceCount: number;

  @Field(() => Int)
  downloadCount: number;

  @Field({ nullable: true })
  lastAccessedAt?: Date;

  @Field({ nullable: true })
  expiresAt?: Date;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field()
  isPublic: boolean;

  @Field()
  isDeleted: boolean;

  @Field({ nullable: true })
  deletedAt?: Date;

  @Field({ nullable: true })
  downloadUrl?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class FileListOutput {
  @Field(() => [FileOutput])
  files: FileOutput[];

  @Field(() => Int)
  total: number;
}
```

### 2. Resolver

```typescript
// packages/twenty-server/src/mkt-core/file/resolvers/mkt-file.resolver.ts

import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { FileUpload } from 'graphql-upload';

import { MktFileService } from '../services/mkt-file.service';
import { FileOutput, FileListOutput } from '../dto/file.output';
import {
  FileUploadInput,
  FileFilterInput,
  FilePaginationInput,
} from '../dto/file-upload.input';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { User } from 'src/engine/core-modules/user/user.entity';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { streamToBuffer } from 'src/utils/stream-to-buffer';

@Resolver(() => FileOutput)
@UseGuards(WorkspaceAuthGuard)
export class MktFileResolver {
  constructor(private readonly fileService: MktFileService) {}

  @Mutation(() => FileOutput)
  async mktUploadFile(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @AuthUser() { id: userId }: User,
    @Args('input') input: FileUploadInput,
  ): Promise<FileOutput> {
    const { createReadStream, filename, mimetype } = await input.file;
    const stream = createReadStream();
    const buffer = await streamToBuffer(stream);

    const result = await this.fileService.uploadFile(
      {
        buffer,
        originalName: filename,
        mimeType: mimetype,
        entityType: input.entityType,
        entityId: input.entityId,
        tags: input.tags,
        expiresAt: input.expiresAt,
      },
      workspaceId,
      userId,
    );

    return result.file as any;
  }

  @Query(() => FileOutput)
  async mktFile(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('id') fileId: string,
  ): Promise<FileOutput> {
    const file = await this.fileService.getFile(fileId, workspaceId);
    return file as any;
  }

  @Query(() => FileListOutput)
  async mktFiles(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('filter', { nullable: true }) filter?: FileFilterInput,
    @Args('pagination', { nullable: true }) pagination?: FilePaginationInput,
  ): Promise<FileListOutput> {
    const result = await this.fileService.listFiles(
      workspaceId,
      filter,
      pagination,
    );

    return {
      files: result.files as any,
      total: result.total,
    };
  }

  @Query(() => [FileOutput])
  async mktFilesByEntity(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('entityType') entityType: string,
    @Args('entityId') entityId: string,
  ): Promise<FileOutput[]> {
    const files = await this.fileService.getFilesByEntity(
      entityType,
      entityId,
      workspaceId,
    );

    return files as any;
  }

  @Mutation(() => String)
  async mktGenerateFileDownloadUrl(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @AuthUser() { id: userId }: User,
    @Args('fileId') fileId: string,
    @Args('expiresIn', { nullable: true, defaultValue: 3600 })
    expiresIn?: number,
  ): Promise<string> {
    return this.fileService.generateDownloadUrl(
      fileId,
      workspaceId,
      userId,
      expiresIn,
    );
  }

  @Mutation(() => Boolean)
  async mktDeleteFile(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @AuthUser() { id: userId }: User,
    @Args('fileId') fileId: string,
  ): Promise<boolean> {
    await this.fileService.deleteFile(fileId, workspaceId, userId);
    return true;
  }

  @ResolveField(() => String, { nullable: true })
  async downloadUrl(
    @Parent() file: FileOutput,
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @AuthUser() { id: userId }: User,
  ): Promise<string> {
    return this.fileService.generateDownloadUrl(file.id, workspaceId, userId);
  }
}
```

---

## 🎨 Frontend Integration

### 1. React Hook for File Upload

```typescript
// packages/twenty-front/src/mkt-core/file/hooks/useFileUpload.ts

import { useState, useCallback } from 'react';
import { useMutation } from '@apollo/client';
import { gql } from '@apollo/client';

const UPLOAD_FILE = gql`
  mutation MktUploadFile($input: FileUploadInput!) {
    mktUploadFile(input: $input) {
      id
      originalName
      size
      mimeType
      downloadUrl
      createdAt
    }
  }
`;

export interface UseFileUploadOptions {
  onSuccess?: (file: any) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

export function useFileUpload(options?: UseFileUploadOptions) {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const [uploadFileMutation] = useMutation(UPLOAD_FILE);

  const uploadFile = useCallback(
    async (
      file: File,
      entityType: string,
      entityId?: string,
      tags?: string[],
    ) => {
      setIsUploading(true);
      setProgress(0);

      try {
        // Simulate progress (in production, use actual upload progress)
        const progressInterval = setInterval(() => {
          setProgress((prev) => Math.min(prev + 10, 90));
        }, 200);

        const { data } = await uploadFileMutation({
          variables: {
            input: {
              file,
              entityType,
              entityId,
              tags,
            },
          },
        });

        clearInterval(progressInterval);
        setProgress(100);

        options?.onSuccess?.(data.mktUploadFile);

        return data.mktUploadFile;
      } catch (error) {
        options?.onError?.(error as Error);
        throw error;
      } finally {
        setIsUploading(false);
        setTimeout(() => setProgress(0), 1000);
      }
    },
    [uploadFileMutation, options],
  );

  return {
    uploadFile,
    isUploading,
    progress,
  };
}
```

### 2. File Upload Component

```typescript
// packages/twenty-front/src/mkt-core/file/components/FileUpload.tsx

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useFileUpload } from '../hooks/useFileUpload';
import { IconUpload, IconFile, IconX } from '@tabler/icons-react';

interface FileUploadProps {
  entityType: string;
  entityId?: string;
  tags?: string[];
  accept?: string[];
  maxSize?: number; // bytes
  onUploadComplete?: (file: any) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  entityType,
  entityId,
  tags,
  accept = [],
  maxSize = 50 * 1024 * 1024, // 50MB default
  onUploadComplete,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  const { uploadFile, isUploading, progress } = useFileUpload({
    onSuccess: (file) => {
      setUploadedFiles((prev) => [...prev, file]);
      onUploadComplete?.(file);
    },
    onError: (error) => {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error.message}`);
    },
  });

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        if (file.size > maxSize) {
          alert(`File ${file.name} exceeds maximum size`);
          continue;
        }

        await uploadFile(file, entityType, entityId, tags);
      }
    },
    [uploadFile, entityType, entityId, tags, maxSize],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept.length > 0 ? accept.join(',') : undefined,
    maxSize,
  });

  return (
    <div>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        style={{
          border: '2px dashed #ccc',
          borderRadius: '8px',
          padding: '40px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isDragActive ? '#f0f0f0' : '#fff',
        }}
      >
        <input {...getInputProps()} />
        <IconUpload size={48} color="#999" />
        {isDragActive ? (
          <p>Drop files here...</p>
        ) : (
          <p>Drag & drop files here, or click to select</p>
        )}
        {accept.length > 0 && (
          <p style={{ fontSize: '12px', color: '#999' }}>
            Accepted: {accept.join(', ')}
          </p>
        )}
      </div>

      {/* Progress */}
      {isUploading && (
        <div style={{ marginTop: '20px' }}>
          <div
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e0e0e0',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#4caf50',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
            Uploading... {progress}%
          </p>
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4>Uploaded Files</h4>
          {uploadedFiles.map((file) => (
            <div
              key={file.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                marginBottom: '8px',
              }}
            >
              <IconFile size={24} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>
                  {file.originalName}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <a
                href={file.downloadUrl}
                download
                style={{ color: '#4caf50', textDecoration: 'none' }}
              >
                Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## 📝 Use Cases

### Use Case 1: Upload Invoice File

```typescript
// Invoice service
async createInvoiceWithFile(
  invoiceData: CreateInvoiceInput,
  pdfBuffer: Buffer,
  workspaceId: string,
  userId: string,
): Promise<Invoice> {
  // 1. Create invoice
  const invoice = await this.invoiceRepository.save({
    ...invoiceData,
    workspaceId,
  });

  // 2. Upload PDF file
  const { file } = await this.fileService.uploadFile(
    {
      buffer: pdfBuffer,
      originalName: `invoice_${invoice.invoiceNumber}.pdf`,
      mimeType: 'application/pdf',
      entityType: 'invoice',
      entityId: invoice.id,
      tags: ['invoice', 'pdf'],
    },
    workspaceId,
    userId,
  );

  // 3. Link file to invoice
  await this.invoiceRepository.update(invoice.id, {
    fileId: file.id,
  });

  return invoice;
}
```

### Use Case 2: Attach Files to Order

```typescript
// Order attachments
async attachFilesToOrder(
  orderId: string,
  files: File[],
  workspaceId: string,
  userId: string,
): Promise<void> {
  for (const file of files) {
    const buffer = await file.arrayBuffer();

    await this.fileService.uploadFile(
      {
        buffer: Buffer.from(buffer),
        originalName: file.name,
        mimeType: file.type,
        entityType: 'order',
        entityId: orderId,
        tags: ['attachment'],
      },
      workspaceId,
      userId,
    );
  }
}

// Get order attachments
async getOrderAttachments(
  orderId: string,
  workspaceId: string,
): Promise<MktFileWorkspaceEntity[]> {
  return this.fileService.getFilesByEntity('order', orderId, workspaceId);
}
```

### Use Case 3: Temporary Export Files

```typescript
// Export service
async exportOrdersToExcel(
  filters: OrderFilterInput,
  workspaceId: string,
  userId: string,
): Promise<{ downloadUrl: string }> {
  // 1. Generate Excel
  const excelBuffer = await this.generateExcelReport(filters);

  // 2. Upload as temporary file (expires in 24h)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  const { file } = await this.fileService.uploadFile(
    {
      buffer: excelBuffer,
      originalName: `orders_export_${Date.now()}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      entityType: 'export',
      tags: ['export', 'order'],
      expiresAt,
    },
    workspaceId,
    userId,
  );

  // 3. Generate download URL
  const downloadUrl = await this.fileService.generateDownloadUrl(
    file.id,
    workspaceId,
    userId,
    86400, // 24 hours
  );

  return { downloadUrl };
}
```

---

## 🧪 Testing

### Unit Tests

```typescript
// packages/twenty-server/src/mkt-core/file/services/__tests__/mkt-file.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MktFileService } from '../mkt-file.service';
import { MktFileWorkspaceEntity } from '../../entities/mkt-file.workspace-entity';
import { FileStorageService } from 'src/engine/core-modules/file-storage/file-storage.service';

describe('MktFileService', () => {
  let service: MktFileService;
  let fileRepository: Repository<MktFileWorkspaceEntity>;
  let fileStorageService: FileStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MktFileService,
        {
          provide: getRepositoryToken(MktFileWorkspaceEntity, 'workspace'),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            increment: jest.fn(),
            decrement: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: FileStorageService,
          useValue: {
            write: jest.fn(),
            read: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MktFileService>(MktFileService);
    fileRepository = module.get(getRepositoryToken(MktFileWorkspaceEntity, 'workspace'));
    fileStorageService = module.get<FileStorageService>(FileStorageService);
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const mockBuffer = Buffer.from('test file content');
      const mockInput = {
        buffer: mockBuffer,
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        entityType: 'invoice',
        entityId: 'entity-123',
        tags: ['test'],
      };

      const mockSavedFile = {
        id: 'file-123',
        originalName: 'test.pdf',
        storagePath: 'workspaces/ws-123/invoice/2026/02/file-123.pdf',
        size: mockBuffer.length,
      };

      jest.spyOn(fileRepository, 'save').mockResolvedValue(mockSavedFile as any);
      jest.spyOn(fileStorageService, 'write').mockResolvedValue(undefined);

      const result = await service.uploadFile(
        mockInput,
        'ws-123',
        'user-123',
      );

      expect(result.file.id).toBe('file-123');
      expect(fileStorageService.write).toHaveBeenCalled();
      expect(fileRepository.save).toHaveBeenCalled();
    });

    it('should detect duplicate files', async () => {
      const mockBuffer = Buffer.from('test file content');
      const mockInput = {
        buffer: mockBuffer,
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        entityType: 'invoice',
      };

      const existingFile = {
        id: 'existing-file-123',
        checksum: 'abc123',
        storagePath: 'path/to/file',
      };

      jest.spyOn(fileRepository, 'findOne').mockResolvedValue(existingFile as any);
      jest.spyOn(fileRepository, 'save').mockResolvedValue({
        id: 'new-file-123',
        isDeduplicated: true,
        originalFileId: existingFile.id,
      } as any);

      const result = await service.uploadFile(mockInput, 'ws-123', 'user-123');

      expect(result.file.isDeduplicated).toBe(true);
      expect(result.file.originalFileId).toBe(existingFile.id);
      expect(fileRepository.increment).toHaveBeenCalledWith(
        { id: existingFile.id },
        'referenceCount',
        1,
      );
    });
  });

  describe('deleteFile', () => {
    it('should soft delete file', async () => {
      const mockFile = {
        id: 'file-123',
        isDeduplicated: false,
        uploadedBy: { id: 'user-123' },
      };

      jest.spyOn(fileRepository, 'findOne').mockResolvedValue(mockFile as any);
      jest.spyOn(fileRepository, 'update').mockResolvedValue(undefined);

      await service.deleteFile('file-123', 'ws-123', 'user-123');

      expect(fileRepository.update).toHaveBeenCalledWith(
        'file-123',
        expect.objectContaining({
          isDeleted: true,
        }),
      );
    });

    it('should decrement reference count for deduplicated files', async () => {
      const mockFile = {
        id: 'file-123',
        isDeduplicated: true,
        originalFileId: 'original-123',
        uploadedBy: { id: 'user-123' },
      };

      jest.spyOn(fileRepository, 'findOne').mockResolvedValue(mockFile as any);

      await service.deleteFile('file-123', 'ws-123', 'user-123');

      expect(fileRepository.decrement).toHaveBeenCalledWith(
        { id: 'original-123' },
        'referenceCount',
        1,
      );
    });
  });
});
```

---

## 🎯 Summary

Đây là implementation example đầy đủ cho File Management System trong mkt-core, bao gồm:

### ✅ Đã Implement:
1. **Workspace Entity** với tất cả fields cần thiết
2. **Service Layer** với các methods chính:
   - Upload file
   - Download file
   - Delete file (soft delete)
   - List files với filters
   - Deduplication
   - Permission checks
3. **GraphQL API** với mutations và queries
4. **Frontend Integration** với React hooks và components
5. **Use Cases** thực tế cho Invoice, Order, Export
6. **Unit Tests** cho service layer

### 🚀 Next Steps:
1. Thêm virus scanning với ClamAV
2. Image processing với Sharp (thumbnails, compression)
3. Chunked upload cho large files
4. CDN integration (CloudFront)
5. Full-text search với Elasticsearch
6. Audit logging
7. File versioning
8. Scheduled cleanup cho expired files

---

**Version**: 1.0.0
**Last Updated**: 2026-02-06
