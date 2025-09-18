import { Resolver, Mutation, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { DefaultPolicyCreationService } from 'src/mkt-core/mkt-organization-level/services/default-policy-creation.service';
import { PolicyCreationSummaryOutput } from 'src/mkt-core/mkt-organization-level/graphql-types/policy-creation-summary.types';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

@Resolver()
@UseGuards(WorkspaceAuthGuard)
export class OrganizationLevelPolicyResolver {
  constructor(
    private readonly defaultPolicyCreationService: DefaultPolicyCreationService,
  ) {}

  @Mutation(() => Boolean)
  async createDefaultPoliciesForAllOrganizationLevels(
    @AuthWorkspace() { id: workspaceId }: Workspace,
  ): Promise<boolean> {
    try {
      await this.defaultPolicyCreationService.createDefaultPoliciesForAllLevels(
        workspaceId,
      );

      return true;
    } catch (error) {
      throw new Error(`Failed to create default policies: ${error.message}`);
    }
  }

  @Mutation(() => Boolean)
  async removeAllDefaultOrganizationLevelPolicies(
    @AuthWorkspace() { id: workspaceId }: Workspace,
  ): Promise<boolean> {
    try {
      await this.defaultPolicyCreationService.removeAllDefaultPolicies(
        workspaceId,
      );

      return true;
    } catch (error) {
      throw new Error(`Failed to remove default policies: ${error.message}`);
    }
  }

  @Query(() => PolicyCreationSummaryOutput)
  async getOrganizationLevelPolicyCreationSummary(
    @AuthWorkspace() { id: workspaceId }: Workspace,
  ): Promise<PolicyCreationSummaryOutput> {
    try {
      return await this.defaultPolicyCreationService.getPolicyCreationSummary(
        workspaceId,
      );
    } catch (error) {
      throw new Error(
        `Failed to get policy creation summary: ${error.message}`,
      );
    }
  }
}
