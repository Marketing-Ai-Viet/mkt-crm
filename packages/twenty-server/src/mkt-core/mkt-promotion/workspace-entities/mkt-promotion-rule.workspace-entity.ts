import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { RelationOnDeleteAction } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-on-delete-action.interface';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import {
  MKT_PROMOTION_FIELD_IDS,
  MKT_PROMOTION_RELATION_IDS,
  PROMOTION_RULE_TYPE,
  PROMOTION_RULE_TYPE_OPTIONS,
  LOGIC_OPERATOR,
  PromotionRuleType,
  RuleOperator,
  LogicOperator,
} from 'src/mkt-core/mkt-promotion/constants';

import { MktPromotionWorkspaceEntity } from './mkt-promotion.workspace-entity';

/**
 * MktPromotionRuleWorkspaceEntity
 *
 * Promotion application rules supporting:
 * - Multiple rule types (PRODUCT, CATEGORY, VARIANT, ORDER_VALUE, CUSTOMER_TAG, etc.)
 * - Flexible operators (IN, NOT_IN, EQUALS, GREATER_THAN, BETWEEN, etc.)
 * - Required/Optional rules
 * - AND/OR logic operators
 */
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktPromotionRule,
  namePlural: 'mktPromotionRules',
  labelSingular: msg`Promotion Rule`,
  labelPlural: msg`Promotion Rules`,
  description: msg`Promotion application rule`,
  icon: 'IconRuler',
  shortcut: 'PR',
  labelIdentifierStandardId: MKT_PROMOTION_FIELD_IDS.mktPromotionRule.name,
})
export class MktPromotionRuleWorkspaceEntity extends BaseWorkspaceEntity {
  // ============================================
  // BASIC INFORMATION
  // ============================================

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotionRule.name,
    type: FieldMetadataType.TEXT,
    label: msg`Name`,
    description: msg`Rule name`,
    icon: 'IconTag',
  })
  name: string;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotionRule.ruleType,
    type: FieldMetadataType.SELECT,
    label: msg`Rule Type`,
    description: msg`Type of rule to evaluate`,
    icon: 'IconCategory',
    options: PROMOTION_RULE_TYPE_OPTIONS,
    defaultValue: `'${PROMOTION_RULE_TYPE.PRODUCT}'`,
  })
  ruleType: PromotionRuleType;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotionRule.operator,
    type: FieldMetadataType.TEXT,
    label: msg`Operator`,
    description: msg`Comparison operator`,
    icon: 'IconEqual',
  })
  operator: RuleOperator;

  // ============================================
  // RULE VALUES
  // ============================================

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotionRule.targetIds,
    type: FieldMetadataType.ARRAY,
    label: msg`Target IDs`,
    description: msg`Target object IDs (products, categories, etc.)`,
    icon: 'IconId',
  })
  @WorkspaceIsNullable()
  targetIds: string[] | null;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotionRule.targetValues,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Target Values`,
    description: msg`Comparison values (min, max, values)`,
    icon: 'IconNumbers',
  })
  @WorkspaceIsNullable()
  targetValues: JSON | null;

  // ============================================
  // RULE BEHAVIOR
  // ============================================

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotionRule.isRequired,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Required`,
    description: msg`Must be satisfied for promotion to apply`,
    icon: 'IconAlertCircle',
    defaultValue: true,
  })
  isRequired: boolean;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotionRule.logicOperator,
    type: FieldMetadataType.TEXT,
    label: msg`Logic Operator`,
    description: msg`AND/OR with other rules`,
    icon: 'IconMathFunction',
    defaultValue: `'${LOGIC_OPERATOR.AND}'`,
  })
  logicOperator: LogicOperator;

  @WorkspaceField({
    standardId: MKT_PROMOTION_FIELD_IDS.mktPromotionRule.position,
    type: FieldMetadataType.NUMBER,
    label: msg`Position`,
    description: msg`Order in rule group`,
    icon: 'IconArrowsSort',
    defaultValue: 0,
  })
  position: number;

  // Note: deletedAt is inherited from BaseWorkspaceEntity

  // ============================================
  // RELATIONS
  // ============================================

  @WorkspaceRelation({
    standardId: MKT_PROMOTION_RELATION_IDS.mktRuleToPromotion,
    type: RelationType.MANY_TO_ONE,
    label: msg`Promotion`,
    description: msg`Parent promotion`,
    icon: 'IconTag',
    inverseSideTarget: () => MktPromotionWorkspaceEntity,
    inverseSideFieldKey: 'rules',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  promotion: Relation<MktPromotionWorkspaceEntity>;

  @WorkspaceJoinColumn('promotion')
  promotionId: string;
}
