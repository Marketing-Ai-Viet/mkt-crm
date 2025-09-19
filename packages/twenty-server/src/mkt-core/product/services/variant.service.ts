import { Injectable, Logger } from '@nestjs/common';

import { In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';

import { MktAttributeWorkspaceEntity } from 'src/mkt-core/product/objects/mkt-attribute.workspace-entity';
import { MktValueWorkspaceEntity } from 'src/mkt-core/product/objects/mkt-value.workspace-entity';
import { MktVariantValueWorkspaceEntity } from 'src/mkt-core/product/objects/mkt-variant-value.workspace-entity';

@Injectable()
export class VariantService {
  private readonly logger = new Logger(VariantService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  async updateVariantValue(variantValueId: string, dayDuration: number) {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) {
      this.logger.error('Workspace ID not found when updating variant value');
      throw new Error('Workspace ID not found');
    }

    try {
      // Get repositories with permission bypass
      const variantValueRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktVariantValueWorkspaceEntity>(
          workspaceId,
          'mktVariantValue',
          { shouldBypassPermissionChecks: true },
        );

      const attributeRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktAttributeWorkspaceEntity>(
          workspaceId,
          'mktAttribute',
          { shouldBypassPermissionChecks: true },
        );

      const valueRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktValueWorkspaceEntity>(
          workspaceId,
          'mktValue',
          { shouldBypassPermissionChecks: true },
        );

      // Get current variant value to get its mktVariantId
      this.logger.log(`Looking for variant value with ID: ${variantValueId}`);
      const currentVariantValue = await variantValueRepository.findOne({
        where: { id: variantValueId },
        relations: ['mktVariant'],
      });

      if (!currentVariantValue) {
        this.logger.error(`Variant value with ID ${variantValueId} not found`);
        throw new Error('Variant value not found');
      }

      // 1. Find or create dayDuration attribute
      let dayDurationAttribute = await attributeRepository.findOne({
        where: { name: 'dayDuration' },
      });

      if (!dayDurationAttribute) {
        dayDurationAttribute = attributeRepository.create({
          name: 'dayDuration',
        });
        dayDurationAttribute =
          await attributeRepository.save(dayDurationAttribute);
      }

      // 2. Find or create value for dayDuration
      let durationValue = await valueRepository.findOne({
        where: {
          name: dayDuration.toString(),
          mktAttributeId: dayDurationAttribute.id,
        },
      });

      if (!durationValue) {
        durationValue = valueRepository.create({
          name: dayDuration.toString(),
          mktAttributeId: dayDurationAttribute.id,
        });
        durationValue = await valueRepository.save(durationValue);
      }

      // 3. Delete any existing dayDuration variant values for this variant except the current one
      await variantValueRepository.delete({
        mktVariantId: currentVariantValue.mktVariantId,
        mktValueId: In(
          (
            await valueRepository.find({
              where: { mktAttributeId: dayDurationAttribute.id },
              select: ['id'],
            })
          )
            .map((v: MktValueWorkspaceEntity) => v.id)
            .filter((id) => id !== currentVariantValue.mktValueId),
        ),
      });

      // 4. Update the variant value with new value relation
      const updatedVariantValue = await variantValueRepository.save({
        id: variantValueId,
        mktValueId: durationValue.id,
        name: `${durationValue.name} - ${dayDurationAttribute.name}`,
      });

      this.logger.log(
        `Successfully updated variant value with new duration value ${durationValue.name}`,
      );

      return updatedVariantValue;
    } catch (error) {
      this.logger.error(`Error updating variant value: ${error}`);
      throw error;
    }
  }
}
