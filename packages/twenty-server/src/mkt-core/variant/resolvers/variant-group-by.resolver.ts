import { UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';

import { PreventNestToAutoLogGraphqlErrorsFilter } from 'src/engine/core-modules/graphql/filters/prevent-nest-to-auto-log-graphql-errors.filter';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

import { VariantGroupByProductDTO } from '../dto/variant-group-by.dto';
import { VariantGroupByService } from '../services/variant-group-by.service';

@UseGuards(WorkspaceAuthGuard)
@UsePipes(ResolverValidationPipe)
@UseFilters(PreventNestToAutoLogGraphqlErrorsFilter)
@Resolver()
export class VariantGroupByResolver {
  constructor(private readonly variantGroupByService: VariantGroupByService) {}

  @Query(() => [VariantGroupByProductDTO])
  async variantsGroupByProduct(
    @Args('productIds', { type: () => [String], nullable: true })
    productIds?: string[],
  ): Promise<VariantGroupByProductDTO[]> {
    return this.variantGroupByService.getVariantsGroupByProduct(productIds);
  }
}
