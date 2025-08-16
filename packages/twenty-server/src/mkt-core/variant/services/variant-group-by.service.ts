import { Injectable } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';

import { VariantGroupByProductDTO } from '../dto/variant-group-by.dto';
import { MktVariantWorkspaceEntity } from '../mkt-variant.workspace-entity';

@Injectable()
export class VariantGroupByService {
  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  async getVariantsGroupByProduct(
    productIds?: string[],
  ): Promise<VariantGroupByProductDTO[]> {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) {
      throw new Error('No workspace id found');
    }

    const variantRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        workspaceId,
        MktVariantWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    const queryBuilder = variantRepository
      .createQueryBuilder('variant')
      .innerJoin('variant.mktProduct', 'product')
      .select([
        'product.id as productId',
        'product.name as productName',
        'SUM(COALESCE(variant.price, 0)) as totalPrice',
        'COUNT(variant.id) as variantCount',
        "JSON_AGG(JSON_BUILD_OBJECT('id', variant.id, 'name', variant.name, 'price', variant.price, 'sku', variant.sku)) as variants",
      ])
      .where('product.id IS NOT NULL')
      .groupBy('product.id, product.name')
      .orderBy('product.name');

    // Filter by selected product IDs if provided
    if (productIds && productIds.length > 0) {
      queryBuilder.andWhere('product.id IN (:...productIds)', { productIds });
    }

    const groupedProducts = await queryBuilder.getRawMany();

    return groupedProducts
      .filter((group) => group.productid)
      .map((group) => ({
        productId: group.productid,
        productName: group.productname || 'Unknown Product',
        totalPrice: parseFloat(group.totalprice || '0'),
        variantCount: parseInt(group.variantcount || '0'),
        variants: group.variants || [],
      }));
  }
}
