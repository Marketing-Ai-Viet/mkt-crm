import { UseFilters,UseGuards,UsePipes } from '@nestjs/common';
import { Args,Query,Resolver } from '@nestjs/graphql';

import { PreventNestToAutoLogGraphqlErrorsFilter } from 'src/engine/core-modules/graphql/filters/prevent-nest-to-auto-log-graphql-errors.filter';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

import { VariantGroupByProductConnectionDTO } from '../dto/variant-group-by-v-2.dto';
import { VariantGroupByService } from '../services/variant-group-by-v-2.service';

@UseGuards(WorkspaceAuthGuard)
@UsePipes(ResolverValidationPipe)
@UseFilters(PreventNestToAutoLogGraphqlErrorsFilter)
@Resolver()
export class VariantGroupByResolver {
  constructor(private readonly variantGroupByService: VariantGroupByService) {}

  @Query(() => VariantGroupByProductConnectionDTO)
  async variantsGroupByProduct(
    @Args('productIds', { type: () => [String], nullable: true })
    productIds?: string[],
    @Args('first', { type: () => Number, nullable: true })
    first?: number,
    @Args('after', { type: () => String, nullable: true })
    after?: string,
    @Args('last', { type: () => Number, nullable: true })
    last?: number,
    @Args('before', { type: () => String, nullable: true })
    before?: string,
  ): Promise<VariantGroupByProductConnectionDTO> {
    return this.variantGroupByService.getVariantsGroupByProduct(
      productIds,
      first,
      after,
      last,
      before,
    );
  }
}
