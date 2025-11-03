import { Injectable } from '@nestjs/common';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktDepartmentHierarchyWorkspaceEntity } from 'src/mkt-core/mkt-department-hierarchy/mkt-department-hierarchy.workspace-entity';

@Injectable()
export class MktDepartmentHierarchyService {
  constructor(private readonly mktRepo: MktRepositoryService) {}

  async createTeamDepartmentHierarchy(
    hierarchyData: MktDepartmentHierarchyWorkspaceEntity,
  ): Promise<void> {
    // Implementation for creating team department hierarchy

    const hierarchyRepo = await this.mktRepo.getRepository(
      MktDepartmentHierarchyWorkspaceEntity,
    );
    const hierarchy = hierarchyRepo.create(hierarchyData);
    await hierarchyRepo.save(hierarchy);
  }

  async updateTeamDepartmentHierarchy(
    hierarchyData: MktDepartmentHierarchyWorkspaceEntity,
  ): Promise<void> {
    const hierarchyRepo = await this.mktRepo.getRepository(
      MktDepartmentHierarchyWorkspaceEntity,
    );
    const hierarchy = await hierarchyRepo.findOneBy({
      childDepartmentId: hierarchyData.childDepartmentId,
    });
    if (hierarchy) {
      hierarchyRepo.update(hierarchy.id, hierarchyData);
    }
  }
}
