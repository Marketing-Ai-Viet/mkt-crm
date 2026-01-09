import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIndex } from 'src/engine/twenty-orm/decorators/workspace-index.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { MKT_CASBIN_RULE_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';

/**
 * MktCasbinRuleWorkspaceEntity
 *
 * Stores Casbin authorization policy rules within each workspace schema.
 * Each workspace has its own isolated set of policies.
 *
 * Policy Types (ptype):
 * - 'p': Permission policies (subject, object, action, effect)
 * - 'g': Role assignment (user -> role)
 * - 'g2': Resource grouping (resource -> group)
 *
 * Examples:
 * - p, role:admin, mktCustomer, *, allow
 * - g, user:uuid-123, role:admin
 * - g2, mktCustomer, crm_entities
 */
@WorkspaceIndex(['ptype'], {
  indexWhereClause: '"deletedAt" IS NULL',
})
@WorkspaceIndex(['subject'], {
  indexWhereClause: '"deletedAt" IS NULL',
})
@WorkspaceIndex(['ptype', 'subject'], {
  indexWhereClause: '"deletedAt" IS NULL',
})
@WorkspaceIndex(['ptype', 'subject', 'object'], {
  indexWhereClause: '"deletedAt" IS NULL',
})
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktCasbinRule,
  namePlural: 'mktCasbinRules',
  labelSingular: msg`Casbin Rule`,
  labelPlural: msg`Casbin Rules`,
  description: msg`Casbin authorization policy rules for RBAC`,
  icon: 'IconShieldLock',
  shortcut: 'CR',
  labelIdentifierStandardId: MKT_CASBIN_RULE_FIELD_IDS.subject,
})
export class MktCasbinRuleWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_CASBIN_RULE_FIELD_IDS.ptype,
    type: FieldMetadataType.TEXT,
    label: msg`Policy Type`,
    description: msg`Policy type: p (permission), g (role assignment), g2 (resource group)`,
    icon: 'IconTag',
  })
  ptype: string;

  @WorkspaceField({
    standardId: MKT_CASBIN_RULE_FIELD_IDS.subject,
    type: FieldMetadataType.TEXT,
    label: msg`Subject`,
    description: msg`Subject identifier (user:id or role:name)`,
    icon: 'IconUser',
  })
  subject: string;

  @WorkspaceField({
    standardId: MKT_CASBIN_RULE_FIELD_IDS.object,
    type: FieldMetadataType.TEXT,
    label: msg`Object`,
    description: msg`Resource or role target`,
    icon: 'IconBox',
  })
  @WorkspaceIsNullable()
  object: string | null;

  @WorkspaceField({
    standardId: MKT_CASBIN_RULE_FIELD_IDS.action,
    type: FieldMetadataType.TEXT,
    label: msg`Action`,
    description: msg`Action (read, write, delete, * for all)`,
    icon: 'IconClick',
  })
  @WorkspaceIsNullable()
  action: string | null;

  @WorkspaceField({
    standardId: MKT_CASBIN_RULE_FIELD_IDS.effect,
    type: FieldMetadataType.TEXT,
    label: msg`Effect`,
    description: msg`Effect: allow or deny`,
    icon: 'IconCheck',
    defaultValue: "'allow'",
  })
  @WorkspaceIsNullable()
  effect: string | null;

  @WorkspaceField({
    standardId: MKT_CASBIN_RULE_FIELD_IDS.condition,
    type: FieldMetadataType.TEXT,
    label: msg`Condition`,
    description: msg`Optional condition expression for ABAC`,
    icon: 'IconFilter',
  })
  @WorkspaceIsNullable()
  condition: string | null;

  @WorkspaceField({
    standardId: MKT_CASBIN_RULE_FIELD_IDS.position,
    type: FieldMetadataType.POSITION,
    label: msg`Position`,
    description: msg`Position for ordering in lists`,
    icon: 'IconHierarchy2',
  })
  @WorkspaceIsNullable()
  position: number | null;
}
