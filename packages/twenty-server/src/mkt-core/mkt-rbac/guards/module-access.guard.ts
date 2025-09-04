import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

import { MktRbacService } from 'src/mkt-core/mkt-rbac/services/mkt-rbac.service';
import {
  ModuleName,
  PermissionAction,
  GraphQLOperationType,
  CheckResult,
} from 'src/mkt-core/mkt-rbac/enums/rbac.enums';

// Decorator để định nghĩa module cần bảo vệ
export const MODULE_ACCESS_KEY = 'module_access';

export const RequireModuleAccess = (moduleName: ModuleName) =>
  SetMetadata(MODULE_ACCESS_KEY, moduleName);

/**
 * Guard kiểm tra quyền truy cập vào module cụ thể
 * Đây là layer đầu tiên trong hệ thống phân quyền 4 tầng
 */
@Injectable()
export class ModuleAccessGuard implements CanActivate {
  private readonly logger = new Logger(ModuleAccessGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: MktRbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.reflector) {
      return true; // Allow access if reflector not available
    }

    // Kiểm tra module access requirement
    const requiredModule = this.reflector.getAllAndOverride<ModuleName>(
      MODULE_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredModule) {
      return true; // Allow access if no module protection needed
    }

    return this.performModuleAccessCheck(context, requiredModule);
  }

  /**
   * Thực hiện kiểm tra quyền truy cập module
   */
  private async performModuleAccessCheck(
    context: ExecutionContext,
    moduleName: ModuleName,
  ): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;

    const user = {
      ...request.user,
      workspaceId: request.workspaceId,
      workspaceMemberId: request.workspaceMemberId,
    };

    if (!user) {
      throw new ForbiddenException('Authentication required for module access');
    }

    try {
      // Kiểm tra quyền truy cập module
      const hasModuleAccess = await this.checkModuleAccess(
        user,
        moduleName,
        request.rbacContext, // Pass enriched context
      );

      if (!hasModuleAccess) {
        this.logger.warn(
          `Module access denied: ${user.workspaceMemberId} -> ${moduleName}`,
        );

        throw new ForbiddenException({
          message: `Access denied to ${moduleName} module`,
          module: moduleName,
          reason: 'Insufficient module permissions',
        });
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(
        `Module access check error: ${error.message}`,
        error.stack,
      );

      throw new ForbiddenException('Module access check failed');
    }
  }

  private async checkModuleAccess(
    user: { workspaceMemberId: string; workspaceId: string },
    moduleName: ModuleName,
    rbacContext?: { permissionCache?: Map<string, { result: CheckResult }> },
  ): Promise<boolean> {
    // Try to use cached permission if available
    const cacheKey = `MODULE_ACCESS:${moduleName}:${user.workspaceMemberId}`;

    if (rbacContext?.permissionCache?.has(cacheKey)) {
      const cachedResult = rbacContext.permissionCache.get(cacheKey);

      if (cachedResult) {
        return (
          cachedResult.result === CheckResult.GRANTED ||
          cachedResult.result === CheckResult.PARTIAL
        );
      }
    }

    try {
      // Check permission for module access
      const result = await this.rbacService.checkPermission({
        action: PermissionAction.MODULE_ACCESS,
        operationType: GraphQLOperationType.QUERY,
        operationName: `access${moduleName}Module`,
        objectName: moduleName,
        workspaceMemberId: user.workspaceMemberId,
        workspaceId: user.workspaceId,
        metadata: {
          moduleAccessCheck: true,
          targetModule: moduleName,
          hasEnrichedContext: !!rbacContext,
        },
      });

      // Cache the result if we have RBAC context
      if (rbacContext?.permissionCache) {
        rbacContext.permissionCache.set(cacheKey, result);
      }

      return (
        result.result === CheckResult.GRANTED ||
        result.result === CheckResult.PARTIAL
      );
    } catch (error) {
      this.logger.error(
        `Module access check failed for ${moduleName}: ${error.message}`,
        error.stack,
      );

      return false; // Deny access on error
    }
  }
}
