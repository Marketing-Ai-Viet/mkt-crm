import { Injectable } from '@nestjs/common';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

/**
 * Service để tạo mã code tự động cho workspace member
 * Pattern: MEMYYYYNNN (VD: MEM2024001, MEM2024002, ...)
 * hoặc đơn giản: MEM001, MEM002, ...
 */
@Injectable()
export class MktMemberCodeGenerationService {
  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  /**
   * Tạo member code tự động dựa trên năm hiện tại và số thứ tự
   * Format: MEMYYYYNNN (VD: MEM2025001)
   */
  async generateMemberCodeWithYear(workspaceId: string): Promise<string> {
    const repository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<WorkspaceMemberWorkspaceEntity>(
        workspaceId,
        'workspaceMember',
      );

    const currentYear = new Date().getFullYear();
    const prefix = `MEM${currentYear}`;

    // Tìm member code lớn nhất có prefix này
    const lastMember = await repository
      .createQueryBuilder('member')
      .where('member.memberCode LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('member.memberCode', 'DESC')
      .getOne();

    let nextSequence = 1;

    if (lastMember?.memberCode) {
      // Extract số sequence từ code cuối cùng
      const lastSequence = parseInt(
        lastMember.memberCode.replace(prefix, ''),
        10,
      );

      if (!isNaN(lastSequence)) {
        nextSequence = lastSequence + 1;
      }
    }

    // Format: MEMYYYYNNN (pad 3 digits)
    return `${prefix}${nextSequence.toString().padStart(3, '0')}`;
  }

  /**
   * Tạo member code đơn giản
   * Format: MEMNNN (VD: MEM001, MEM002)
   */
  async generateSimpleMemberCode(workspaceId: string): Promise<string> {
    const repository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<WorkspaceMemberWorkspaceEntity>(
        workspaceId,
        'workspaceMember',
      );

    const prefix = 'MEM';

    // Tìm member code lớn nhất
    const lastMember = await repository
      .createQueryBuilder('member')
      .where('member.memberCode LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('member.memberCode', 'DESC')
      .getOne();

    let nextSequence = 1;

    if (lastMember?.memberCode) {
      // Extract số sequence từ code cuối cùng
      const lastSequence = parseInt(lastMember.memberCode.replace(prefix, ''));

      if (!isNaN(lastSequence)) {
        nextSequence = lastSequence + 1;
      }
    }

    // Format: MEMNNN (pad 3 digits)
    return `${prefix}${nextSequence.toString().padStart(3, '0')}`;
  }

  /**
   * Tạo member code tùy chỉnh với prefix riêng
   * @param workspaceId - ID workspace
   * @param customPrefix - Prefix tùy chỉnh (VD: "STAFF", "EMP", ...)
   * @param sequenceLength - Độ dài số sequence (default: 3)
   */
  async generateCustomMemberCode(
    workspaceId: string,
    customPrefix: string,
    sequenceLength = 3,
  ): Promise<string> {
    const repository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<WorkspaceMemberWorkspaceEntity>(
        workspaceId,
        'workspaceMember',
      );

    // Tìm member code lớn nhất với prefix này
    const lastMember = await repository
      .createQueryBuilder('member')
      .where('member.memberCode LIKE :prefix', {
        prefix: `${customPrefix}%`,
      })
      .orderBy('member.memberCode', 'DESC')
      .getOne();

    let nextSequence = 1;

    if (lastMember?.memberCode) {
      // Extract số sequence từ code cuối cùng
      const lastSequence = parseInt(
        lastMember.memberCode.replace(customPrefix, ''),
        10,
      );

      if (!isNaN(lastSequence)) {
        nextSequence = lastSequence + 1;
      }
    }

    return `${customPrefix}${nextSequence.toString().padStart(sequenceLength, '0')}`;
  }

  /**
   * Kiểm tra xem member code đã tồn tại chưa
   */
  async isMemberCodeExists(
    workspaceId: string,
    memberCode: string,
  ): Promise<boolean> {
    const repository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<WorkspaceMemberWorkspaceEntity>(
        workspaceId,
        'workspaceMember',
      );

    const count = await repository
      .createQueryBuilder('member')
      .where('member.memberCode = :memberCode', { memberCode })
      .getCount();

    return count > 0;
  }

  /**
   * Tạo member code duy nhất (đảm bảo không trùng)
   * Retry nếu code bị trùng
   */
  async generateUniqueMemberCode(
    workspaceId: string,
    useYearPrefix = true,
  ): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const code = useYearPrefix
        ? await this.generateMemberCodeWithYear(workspaceId)
        : await this.generateSimpleMemberCode(workspaceId);

      const exists = await this.isMemberCodeExists(workspaceId, code);

      if (!exists) {
        return code;
      }

      attempts++;
    }

    throw new Error(
      'Unable to generate unique member code after multiple attempts',
    );
  }
}
