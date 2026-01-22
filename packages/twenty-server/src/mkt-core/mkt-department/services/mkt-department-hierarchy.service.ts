import { Injectable } from '@nestjs/common';

import { MktDepartmentHierarchyWorkspaceEntity } from 'src/mkt-core/mkt-department/objects/mkt-department-hierarchy.workspace-entity';
import { MktDepartmentHierarchyRepository } from 'src/mkt-core/mkt-department/repositories';

@Injectable()
export class MktDepartmentHierarchyService {
  constructor(
    private readonly hierarchyRepository: MktDepartmentHierarchyRepository,
  ) {}

  async createTeamDepartmentHierarchy(
    hierarchyData: Partial<MktDepartmentHierarchyWorkspaceEntity>,
  ): Promise<void> {
    await this.hierarchyRepository.createWithContext(hierarchyData);
  }

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
