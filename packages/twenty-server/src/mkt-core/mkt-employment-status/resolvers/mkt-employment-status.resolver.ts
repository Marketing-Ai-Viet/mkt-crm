import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';

import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { OutputEmploymentStatus } from 'src/mkt-core/mkt-employment-status/dtos/getEmployment.output';
import { MktEmploymentStatusService } from 'src/mkt-core/mkt-employment-status/services/mkt-employment-status.service';

@UseGuards(UserAuthGuard, WorkspaceAuthGuard)
@Resolver(() => OutputEmploymentStatus)
export class MktEmploymentStatusResolver {
  constructor(
    private readonly mktEmploymentStatusService: MktEmploymentStatusService,
  ) {}

  @Query(() => [OutputEmploymentStatus])
  async getEmploymentStatus(
    @AuthWorkspace() { id: workspaceId }: Workspace,
  ): Promise<OutputEmploymentStatus[]> {
    const statuses =
      await this.mktEmploymentStatusService.getEmploymentStatus(workspaceId);
    return statuses.map((status: any) => ({
      statusNameEn: status.statusNameEn,
      statusName: status.statusName,
    }));
  }
}
