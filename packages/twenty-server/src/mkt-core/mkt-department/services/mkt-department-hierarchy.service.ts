import { Injectable } from '@nestjs/common';

import { MktDepartmentHierarchyWorkspaceEntity } from 'src/mkt-core/mkt-department/objects/mkt-department-hierarchy.workspace-entity';
import { MktDepartmentHierarchyRepository } from 'src/mkt-core/mkt-department/repositories';

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
   */
  async updateTeamDepartmentHierarchy(
    hierarchyData: Partial<MktDepartmentHierarchyWorkspaceEntity>,
  ): Promise<void> {
    if (!hierarchyData.childDepartmentId) {
      return;
    }

    await this.hierarchyRepository.updateWithContext(
      hierarchyData.childDepartmentId,
      hierarchyData,
    );
  }
}
