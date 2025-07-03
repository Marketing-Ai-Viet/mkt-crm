import { Module } from '@nestjs/common';
import { AuthModule } from 'src/engine/core-modules/auth/auth.module';
import { JwtModule } from 'src/engine/core-modules/jwt/jwt.module';
import { DataSourceModule } from 'src/engine/metadata-modules/data-source/data-source.module';
import { WorkspaceMetadataCacheModule } from 'src/engine/metadata-modules/workspace-metadata-cache/workspace-metadata-cache.module';
import { MiddlewareService } from 'src/engine/middlewares/middleware.service';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { WorkspaceDataSourceModule } from 'src/engine/workspace-datasource/workspace-datasource.module';
import { PermissionResolver } from './permission.resolver';
@Module({
  imports: [
    AuthModule,
    WorkspaceCacheStorageModule,
    WorkspaceMetadataCacheModule,
    WorkspaceDataSourceModule,
    DataSourceModule,
    JwtModule,
  ],
  providers: [PermissionResolver, MiddlewareService],
})
export class TestModule {}
