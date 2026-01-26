/**
 * SubManagerService - Business logic for Department Sub-Manager operations
 *
 * Handles CRUD operations and business rules for sub-manager assignments.
 */

import { Injectable, Logger } from '@nestjs/common';

import { SUB_MANAGER_MESSAGES } from 'src/mkt-core/mkt-department/messages';
import { MktDepartmentSubManagerWorkspaceEntity } from 'src/mkt-core/mkt-department/objects/mkt-department-sub-manager.workspace-entity';
import { MktDepartmentSubManagerRepository } from 'src/mkt-core/mkt-department/repositories';
import {
  CreateSubManagerData,
  DeleteSubManagerResult,
  SubManagerResult,
  UpdateSubManagerData,
} from 'src/mkt-core/mkt-department/types';

@Injectable()
export class SubManagerService {
  private readonly logger = new Logger(SubManagerService.name);

  constructor(
    private readonly subManagerRepository: MktDepartmentSubManagerRepository,
  ) {}

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Lấy danh sách sub-managers theo department
   */
  async findByDepartmentId(
    workspaceId: string,
    departmentId: string,
    options: { activeOnly?: boolean } = {},
  ): Promise<MktDepartmentSubManagerWorkspaceEntity[]> {
    this.logger.log(
      SUB_MANAGER_MESSAGES.LOG.FIND_BY_DEPARTMENT_START(departmentId),
    );

    const items = await this.subManagerRepository.findByDepartmentId(
      workspaceId,
      departmentId,
      options,
    );

    this.logger.log(
      SUB_MANAGER_MESSAGES.LOG.FIND_BY_DEPARTMENT_SUCCESS(
        departmentId,
        items.length,
      ),
    );

    return items;
  }

  /**
   * Lấy danh sách department assignments theo workspace member
   */
  async findByWorkspaceMemberId(
    workspaceId: string,
    workspaceMemberId: string,
    options: { activeOnly?: boolean } = {},
  ): Promise<MktDepartmentSubManagerWorkspaceEntity[]> {
    this.logger.log(
      SUB_MANAGER_MESSAGES.LOG.FIND_BY_MEMBER_START(workspaceMemberId),
    );

    const items = await this.subManagerRepository.findByWorkspaceMemberId(
      workspaceId,
      workspaceMemberId,
      options,
    );

    this.logger.log(
      SUB_MANAGER_MESSAGES.LOG.FIND_BY_MEMBER_SUCCESS(
        workspaceMemberId,
        items.length,
      ),
    );

    return items;
  }

  /**
   * Lấy sub-manager theo ID
   */
  async findById(
    workspaceId: string,
    id: string,
  ): Promise<MktDepartmentSubManagerWorkspaceEntity | null> {
    this.logger.log(SUB_MANAGER_MESSAGES.LOG.FIND_BY_ID_START(id));

    const subManager = await this.subManagerRepository.findByIdWithWorkspace(
      workspaceId,
      id,
    );

    if (!subManager) {
      this.logger.warn(SUB_MANAGER_MESSAGES.WARN.NOT_FOUND(id));

      return null;
    }

    this.logger.log(SUB_MANAGER_MESSAGES.LOG.FIND_BY_ID_SUCCESS(id));

    return subManager;
  }

  /**
   * Lấy primary sub-manager của department
   */
  async findPrimaryByDepartmentId(
    workspaceId: string,
    departmentId: string,
  ): Promise<MktDepartmentSubManagerWorkspaceEntity | null> {
    this.logger.log(SUB_MANAGER_MESSAGES.LOG.FIND_PRIMARY_START(departmentId));

    const subManager =
      await this.subManagerRepository.findPrimaryByDepartmentId(
        workspaceId,
        departmentId,
      );

    if (!subManager) {
      this.logger.warn(SUB_MANAGER_MESSAGES.WARN.NO_PRIMARY(departmentId));

      return null;
    }

    this.logger.log(
      SUB_MANAGER_MESSAGES.LOG.FIND_PRIMARY_SUCCESS(departmentId),
    );

    return subManager;
  }

  // ============================================
  // MUTATIONS
  // ============================================

  /**
   * Tạo sub-manager assignment mới
   */
  async create(
    workspaceId: string,
    data: CreateSubManagerData,
  ): Promise<SubManagerResult> {
    try {
      this.logger.log(
        SUB_MANAGER_MESSAGES.LOG.CREATE_START(
          data.departmentId,
          data.workspaceMemberId,
        ),
      );

      // Kiểm tra xem assignment đã tồn tại chưa
      const exists = await this.subManagerRepository.assignmentExists(
        workspaceId,
        data.departmentId,
        data.workspaceMemberId,
      );

      if (exists) {
        this.logger.warn(
          SUB_MANAGER_MESSAGES.WARN.ALREADY_EXISTS(
            data.departmentId,
            data.workspaceMemberId,
          ),
        );

        return {
          success: false,
          error: SUB_MANAGER_MESSAGES.ERROR.ALREADY_EXISTS,
        };
      }

      const subManager = await this.subManagerRepository.createAssignment(
        workspaceId,
        {
          departmentId: data.departmentId,
          workspaceMemberId: data.workspaceMemberId,
          isPrimary: data.isPrimary,
          note: data.note,
          isActive: data.isActive,
        },
      );

      this.logger.log(SUB_MANAGER_MESSAGES.LOG.CREATE_SUCCESS(subManager.id));

      return {
        success: true,
        subManager,
      };
    } catch (error) {
      this.logger.error(
        SUB_MANAGER_MESSAGES.ERROR.CREATE_FAILED((error as Error).message),
      );

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Cập nhật sub-manager assignment
   */
  async update(
    workspaceId: string,
    id: string,
    data: UpdateSubManagerData,
  ): Promise<SubManagerResult> {
    try {
      this.logger.log(SUB_MANAGER_MESSAGES.LOG.UPDATE_START(id));

      const existing = await this.subManagerRepository.findByIdWithWorkspace(
        workspaceId,
        id,
      );

      if (!existing) {
        this.logger.warn(SUB_MANAGER_MESSAGES.WARN.NOT_FOUND(id));

        return {
          success: false,
          error: SUB_MANAGER_MESSAGES.ERROR.NOT_FOUND(id),
        };
      }

      const updateData: Record<string, unknown> = {};

      if (data.isPrimary !== undefined) {
        updateData.isPrimary = data.isPrimary;
      }
      if (data.note !== undefined) {
        updateData.note = data.note;
      }
      if (data.isActive !== undefined) {
        updateData.isActive = data.isActive;
      }

      await this.subManagerRepository.updateAssignment(
        workspaceId,
        id,
        updateData,
      );

      const updated = await this.subManagerRepository.findByIdWithWorkspace(
        workspaceId,
        id,
      );

      this.logger.log(SUB_MANAGER_MESSAGES.LOG.UPDATE_SUCCESS(id));

      return {
        success: true,
        subManager: updated ?? undefined,
      };
    } catch (error) {
      this.logger.error(
        SUB_MANAGER_MESSAGES.ERROR.UPDATE_FAILED(id, (error as Error).message),
      );

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Xóa sub-manager assignment (soft delete)
   */
  async delete(
    workspaceId: string,
    id: string,
  ): Promise<DeleteSubManagerResult> {
    try {
      this.logger.log(SUB_MANAGER_MESSAGES.LOG.DELETE_START(id));

      const existing = await this.subManagerRepository.findByIdWithWorkspace(
        workspaceId,
        id,
      );

      if (!existing) {
        this.logger.warn(SUB_MANAGER_MESSAGES.WARN.NOT_FOUND(id));

        return {
          success: false,
          error: SUB_MANAGER_MESSAGES.ERROR.NOT_FOUND(id),
        };
      }

      await this.subManagerRepository.softDeleteAssignment(workspaceId, id);

      this.logger.log(SUB_MANAGER_MESSAGES.LOG.DELETE_SUCCESS(id));

      return {
        success: true,
        deletedId: id,
      };
    } catch (error) {
      this.logger.error(
        SUB_MANAGER_MESSAGES.ERROR.DELETE_FAILED(id, (error as Error).message),
      );

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Đặt primary sub-manager cho department
   */
  async setPrimary(
    workspaceId: string,
    departmentId: string,
    subManagerId: string,
  ): Promise<SubManagerResult> {
    try {
      this.logger.log(
        SUB_MANAGER_MESSAGES.LOG.SET_PRIMARY_START(departmentId, subManagerId),
      );

      const existing = await this.subManagerRepository.findByIdWithWorkspace(
        workspaceId,
        subManagerId,
      );

      if (!existing) {
        this.logger.warn(SUB_MANAGER_MESSAGES.WARN.NOT_FOUND(subManagerId));

        return {
          success: false,
          error: SUB_MANAGER_MESSAGES.ERROR.NOT_FOUND(subManagerId),
        };
      }

      if (existing.departmentId !== departmentId) {
        this.logger.warn(
          SUB_MANAGER_MESSAGES.WARN.DEPARTMENT_MISMATCH(
            subManagerId,
            departmentId,
          ),
        );

        return {
          success: false,
          error: SUB_MANAGER_MESSAGES.ERROR.DEPARTMENT_MISMATCH,
        };
      }

      await this.subManagerRepository.setPrimary(
        workspaceId,
        departmentId,
        subManagerId,
      );

      this.logger.log(
        SUB_MANAGER_MESSAGES.LOG.SET_PRIMARY_SUCCESS(
          departmentId,
          subManagerId,
        ),
      );

      return {
        success: true,
      };
    } catch (error) {
      this.logger.error(
        SUB_MANAGER_MESSAGES.ERROR.SET_PRIMARY_FAILED((error as Error).message),
      );

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Deactivate sub-manager assignment
   */
  async deactivate(workspaceId: string, id: string): Promise<SubManagerResult> {
    try {
      this.logger.log(SUB_MANAGER_MESSAGES.LOG.DEACTIVATE_START(id));

      const existing = await this.subManagerRepository.findByIdWithWorkspace(
        workspaceId,
        id,
      );

      if (!existing) {
        return {
          success: false,
          error: SUB_MANAGER_MESSAGES.ERROR.NOT_FOUND(id),
        };
      }

      await this.subManagerRepository.deactivate(workspaceId, id);

      const updated = await this.subManagerRepository.findByIdWithWorkspace(
        workspaceId,
        id,
      );

      this.logger.log(SUB_MANAGER_MESSAGES.LOG.DEACTIVATE_SUCCESS(id));

      return {
        success: true,
        subManager: updated ?? undefined,
      };
    } catch (error) {
      this.logger.error(
        SUB_MANAGER_MESSAGES.ERROR.DEACTIVATE_FAILED(
          id,
          (error as Error).message,
        ),
      );

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Activate sub-manager assignment
   */
  async activate(workspaceId: string, id: string): Promise<SubManagerResult> {
    try {
      this.logger.log(SUB_MANAGER_MESSAGES.LOG.ACTIVATE_START(id));

      const existing = await this.subManagerRepository.findByIdWithWorkspace(
        workspaceId,
        id,
      );

      if (!existing) {
        return {
          success: false,
          error: SUB_MANAGER_MESSAGES.ERROR.NOT_FOUND(id),
        };
      }

      await this.subManagerRepository.activate(workspaceId, id);

      const updated = await this.subManagerRepository.findByIdWithWorkspace(
        workspaceId,
        id,
      );

      this.logger.log(SUB_MANAGER_MESSAGES.LOG.ACTIVATE_SUCCESS(id));

      return {
        success: true,
        subManager: updated ?? undefined,
      };
    } catch (error) {
      this.logger.error(
        SUB_MANAGER_MESSAGES.ERROR.ACTIVATE_FAILED(
          id,
          (error as Error).message,
        ),
      );

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}
