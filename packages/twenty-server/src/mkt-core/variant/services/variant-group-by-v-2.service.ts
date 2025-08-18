import { Injectable } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';

import {
  VariantGroupByProductConnectionDTO,
  VariantGroupByProductEdgeDTO,
  VariantGroupByProductPageInfoDTO,
  VariantSummaryConnectionDTO,
  VariantSummaryEdgeDTO
} from '../dto/variant-group-by-v-2.dto';
import { MktVariantWorkspaceEntity } from '../mkt-variant.workspace-entity';

@Injectable()
export class VariantGroupByService {
  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  async getVariantsGroupByProduct(
    productIds?: string[],
    first?: number,
    after?: string,
    last?: number,
    before?: string,
  ): Promise<VariantGroupByProductConnectionDTO> {
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
    // If productIds is not provided or empty, return all products grouped by product
    if (productIds && productIds.length > 0) {
      queryBuilder.andWhere('product.id IN (:...productIds)', { productIds });
    }
    // If productIds is undefined, null, or empty array, no additional filter is applied
    // This means all products with variants will be returned and grouped by product

    const groupedProducts = await queryBuilder.getRawMany();

    const products = groupedProducts
      .filter((group) => group.productid)
      .map((group) => {
        const variants = group.variants || [];
        
        // Create mktVariants with connection pattern
        const variantEdges: VariantSummaryEdgeDTO[] = variants.map((variant: any, index: number) => ({
          node: {
            id: variant.id,
            name: variant.name,
            price: variant.price,
            sku: variant.sku,
          },
          cursor: Buffer.from(JSON.stringify({ position: index + 1, id: variant.id })).toString('base64'),
        }));

        const mktVariants: VariantSummaryConnectionDTO = {
          edges: variantEdges,
          totalCount: variants.length,
        };

        return {
          productId: group.productid,
          productName: group.productname || 'Unknown Product',
          totalPrice: parseFloat(group.totalprice || '0'),
          variantCount: parseInt(group.variantcount || '0'),
          mktVariants,
        };
      });

    // Create all edges with cursors
    const allEdges: VariantGroupByProductEdgeDTO[] = products.map((product, index) => ({
      node: product,
      cursor: Buffer.from(JSON.stringify({ position: index + 1, id: product.productId })).toString('base64'),
    }));

    // Apply pagination
    let edges = allEdges;
    let hasNextPage = false;
    let hasPreviousPage = false;

    // Parse cursor to get position
    const getPositionFromCursor = (cursor: string): number => {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString());
        return decoded.position;
      } catch {
        return 0;
      }
    };

    // Apply 'after' cursor
    if (after) {
      const afterPosition = getPositionFromCursor(after);
      edges = edges.filter(edge => {
        const position = getPositionFromCursor(edge.cursor);
        return position > afterPosition;
      });
      hasPreviousPage = true;
    }

    // Apply 'before' cursor
    if (before) {
      const beforePosition = getPositionFromCursor(before);
      edges = edges.filter(edge => {
        const position = getPositionFromCursor(edge.cursor);
        return position < beforePosition;
      });
      hasNextPage = true;
    }

    // Apply 'first' limit
    if (first && first > 0) {
      if (edges.length > first) {
        edges = edges.slice(0, first);
        hasNextPage = true;
      }
    }

    // Apply 'last' limit
    if (last && last > 0) {
      if (edges.length > last) {
        edges = edges.slice(-last);
        hasPreviousPage = true;
      }
    }

    // Create page info
    const pageInfo: VariantGroupByProductPageInfoDTO = {
      hasNextPage,
      hasPreviousPage,
      startCursor: edges.length > 0 ? edges[0].cursor : null,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
    };

    return {
      edges,
      pageInfo,
      totalCount: products.length,
    };
  }
}
