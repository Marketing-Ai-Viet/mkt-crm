import { Injectable, NotFoundException } from '@nestjs/common';

import { MktDepartmentHierarchyWorkspaceEntity } from 'src/mkt-core/mkt-department/objects/mkt-department-hierarchy.workspace-entity';
import { MktDepartmentHierarchyRepository } from 'src/mkt-core/mkt-department/repositories';
import { DEPARTMENT_MESSAGES } from 'src/mkt-core/mkt-department/messages';

type UpdateHierarchyResult = {
  updated: boolean;
  hierarchyId?: string;
};

@Injectable()
export class MktDepartmentHierarchyService {
  constructor(
    private readonly hierarchyRepository: MktDepartmentHierarchyRepository,
  ) {}

  /**
   * Tạo hierarchy cho team department
   * @returns Created hierarchy entity
   */
  async createTeamDepartmentHierarchy(
    hierarchyData: Partial<MktDepartmentHierarchyWorkspaceEntity>,
  ): Promise<MktDepartmentHierarchyWorkspaceEntity> {
    return this.hierarchyRepository.createWithContext(hierarchyData);
  }

  /**
   * Cập nhật hierarchy của team department
   * @throws NotFoundException if hierarchy not found
   */
  async updateTeamDepartmentHierarchy(
    hierarchyData: Partial<MktDepartmentHierarchyWorkspaceEntity>,
  ): Promise<UpdateHierarchyResult> {
    if (!hierarchyData.childDepartmentId) {
      throw new NotFoundException(
        DEPARTMENT_MESSAGES.ERROR.CHILD_DEPARTMENT_ID_REQUIRED,
      );
    }

    const result = await this.hierarchyRepository.updateWithContext(
      hierarchyData.childDepartmentId,
      hierarchyData,
    );

    if (!result.updated) {
      throw new NotFoundException(
        DEPARTMENT_MESSAGES.ERROR.HIERARCHY_NOT_FOUND(
          hierarchyData.childDepartmentId,
        ),
      );
    }

    return result;
  }
}
