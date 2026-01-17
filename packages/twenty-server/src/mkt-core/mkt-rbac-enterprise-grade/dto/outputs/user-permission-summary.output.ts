import { Field, ObjectType, Int } from '@nestjs/graphql';

/**
 * Assigned template summary
 */
@ObjectType('AssignedTemplateOutput')
export class AssignedTemplateOutput {
  @Field(() => String, { description: 'Template ID' })
  templateId: string;

  @Field(() => String, { description: 'Template name' })
  templateName: string;

  @Field(() => String, { description: 'Assigned at timestamp' })
  assignedAt: string;

  @Field(() => String, { nullable: true, description: 'Expiration timestamp' })
  expiresAt?: string;
}

/**
 * Active temporary permission summary
 */
@ObjectType('ActiveTemporaryPermissionOutput')
export class ActiveTemporaryPermissionOutput {
  @Field(() => String, { description: 'Permission ID' })
  id: string;

  @Field(() => String, { description: 'Action granted' })
  action: string;

  @Field(() => String, { description: 'Resource type' })
  resourceType: string;

  @Field(() => String, { nullable: true, description: 'Resource ID' })
  resourceId?: string;

  @Field(() => String, { description: 'Expiration timestamp' })
  expiresAt: string;
}

/**
 * User permission summary output
 */
@ObjectType('UserPermissionSummaryOutput')
export class UserPermissionSummaryOutput {
  @Field(() => String, { description: 'User ID' })
  userId: string;

  @Field(() => [AssignedTemplateOutput], { description: 'Assigned templates' })
  assignedTemplates: AssignedTemplateOutput[];

  @Field(() => [ActiveTemporaryPermissionOutput], {
    description: 'Active temporary permissions',
  })
  temporaryPermissions: ActiveTemporaryPermissionOutput[];

  @Field(() => Int, { description: 'Total number of assigned templates' })
  totalTemplates: number;

  @Field(() => Int, {
    description: 'Total number of active temporary permissions',
  })
  totalTemporaryPermissions: number;
}
