import { Injectable, Type } from '@nestjs/common';

import { ObjectLiteral } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { MktLicenseHistoryWorkspaceEntity } from 'src/mkt-core/license/objects/mkt-license-history.workspace-entity';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktPaymentMethodWorkspaceEntity } from 'src/mkt-core/payment-method/mkt-payment-method.workspace-entity';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/mkt-payment.workspace-entity';

@Injectable()
export class MktRepositoryService {
  public workspaceId: string | null = null;
  constructor(
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  /**
   * Get a workspace-specific repository for any entity.
   * @param entityClass The Entity constructor for typing the repository
   * @param metadataName The metadata name of the object in the workspace
   * @param options Optional flags (bypass permissions, role)
   */
  private async getRepository<Entity extends ObjectLiteral>(
    entityClass: Type<Entity>,
    options: { shouldBypassPermissionChecks?: boolean; roleId?: string } = {},
  ): Promise<WorkspaceRepository<Entity>> {
    let workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;
    if (!workspaceId) workspaceId = this.workspaceId;
    if (!workspaceId) {
      throw new Error(
        'Workspace ID 2 is not available in the current context.',
      );
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace<Entity>(
      workspaceId,
      entityClass,
      {
        shouldBypassPermissionChecks:
          options.shouldBypassPermissionChecks ?? true,
        roleId: options.roleId,
      },
    );
  }

  private async getRepositoryByWorkspaceId<Entity extends ObjectLiteral>(
    entityClass: Type<Entity>,
    workspaceId: string,
    options: { shouldBypassPermissionChecks?: boolean; roleId?: string } = {},
  ): Promise<WorkspaceRepository<Entity>> {
    if (!workspaceId) {
      throw new Error(
        'Workspace ID 3 is not available in the current context.',
      );
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace<Entity>(
      workspaceId,
      entityClass,
      {
        shouldBypassPermissionChecks:
          options.shouldBypassPermissionChecks ?? true,
        roleId: options.roleId,
      },
    );
  }

  async getPaymentRepository() {
    return this.getRepository(MktPaymentWorkspaceEntity);
  }

  async getLicenseHistoryRepository() {
    return this.getRepository(MktLicenseHistoryWorkspaceEntity);
  }

  async getPaymentMethodRepository() {
    return this.getRepository(MktPaymentMethodWorkspaceEntity);
  }

  async getOrderRepository() {
    return this.getRepository(MktOrderWorkspaceEntity);
  }
  async getLicenseRepository() {
    return this.getRepository(MktLicenseWorkspaceEntity);
  }

  async getLicenseRepositoryByWorkspaceId(workspaceId: string) {
    return this.getRepositoryByWorkspaceId(
      MktLicenseWorkspaceEntity,
      workspaceId,
    );
  }

  async getOrderItemRepository() {
    return this.getRepository(MktOrderItemWorkspaceEntity);
  }

  async getOrderItemRepositoryByWorkspaceId(workspaceId: string) {
    return this.getRepositoryByWorkspaceId(
      MktOrderItemWorkspaceEntity,
      workspaceId,
    );
  }

  async getOrderRepositoryByWorkspaceId(workspaceId: string) {
    return this.getRepositoryByWorkspaceId(
      MktOrderWorkspaceEntity,
      workspaceId,
    );
  }

  async getPaymentRepositoryByWorkspaceId(workspaceId: string) {
    return this.getRepositoryByWorkspaceId(
      MktPaymentWorkspaceEntity,
      workspaceId,
    );
  }
}
