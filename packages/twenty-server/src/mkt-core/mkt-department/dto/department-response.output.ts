import { Field, ObjectType, Int } from '@nestjs/graphql';

import { ManagerInfo, SubManagerInfo } from './manager-info.output';
import { SubManagerOutput } from './sub-manager';

/**
 * Created hierarchy information output
 */
@ObjectType()
export class CreatedHierarchyOutput {
  @Field({ description: 'Hierarchy record ID' })
  id: string;

  @Field({ description: 'Parent department ID' })
  parentDepartmentId: string;

  @Field({ description: 'Parent department code' })
  parentDepartmentCode: string;

  @Field({ description: 'Parent department name' })
  parentDepartmentName: string;

  @Field({ description: 'Child department ID' })
  childDepartmentId: string;

  @Field({ description: 'Child department code' })
  childDepartmentCode: string;

  @Field({ description: 'Child department name' })
  childDepartmentName: string;

  @Field({
    nullable: true,
    description:
      'Type of relationship (e.g., PARENT_CHILD, MATRIX, FUNCTIONAL)',
  })
  relationshipType?: string;

  @Field(() => Int, { nullable: true, description: 'Level in hierarchy' })
  hierarchyLevel?: number;
}

/**
 * Department data output for GraphQL responses
 */
@ObjectType()
export class DepartmentOutput {
  @Field({ description: 'Department ID' })
  id: string;

  @Field({ description: 'Unique department code' })
  departmentCode: string;

  @Field({ description: 'Display name of the department' })
  departmentName: string;

  @Field({ nullable: true, description: 'English name of the department' })
  departmentNameEn?: string;

  @Field({ nullable: true, description: 'Type of department' })
  departmentType?: string;

  @Field({ nullable: true, description: 'Detailed description' })
  description?: string;

  @Field({ nullable: true, description: 'Budget tracking code' })
  budgetCode?: string;

  @Field({ nullable: true, description: 'Cost allocation center' })
  costCenter?: string;

  @Field({ nullable: true, description: 'Whether KPI tracking is required' })
  requiresKpiTracking?: boolean;

  @Field({
    nullable: true,
    description: 'Whether cross-department access is allowed',
  })
  allowsCrossDepartmentAccess?: boolean;

  @Field({ nullable: true, description: 'Default KPI category' })
  defaultKpiCategory?: string;

  @Field(() => Int, { nullable: true, description: 'Display order' })
  displayOrder?: number;

  @Field({ nullable: true, description: 'Color code for UI display' })
  colorCode?: string;

  @Field({ nullable: true, description: 'Icon name for UI display' })
  iconName?: string;

  @Field({ nullable: true, description: 'Physical address' })
  address?: string;

  @Field({ nullable: true, description: 'Whether this department is active' })
  isActive?: boolean;

  @Field({ nullable: true, description: 'Manager ID' })
  managerId?: string;

  @Field(() => ManagerInfo, { nullable: true, description: 'Manager details' })
  manager?: ManagerInfo;

  @Field(() => [SubManagerInfo], {
    nullable: true,
    description: 'Sub-managers with member details',
  })
  subManagers?: SubManagerInfo[];

  @Field({ description: 'Created timestamp' })
  createdAt: Date;

  @Field({ description: 'Updated timestamp' })
  updatedAt: Date;

  @Field(() => Int, {
    nullable: true,
    description:
      'Total member count including this department and all descendant departments',
  })
  totalMemberCount?: number;
}

/**
 * Response when creating a department
 */
@ObjectType()
export class CreateDepartmentResponse {
  @Field({ description: 'Whether the operation was successful' })
  success: boolean;

  @Field(() => DepartmentOutput, {
    nullable: true,
    description: 'Created department data',
  })
  department?: DepartmentOutput;

  @Field(() => [SubManagerOutput], {
    nullable: true,
    description: 'Created sub-managers for the department',
  })
  subManagers?: SubManagerOutput[];

  @Field(() => [CreatedHierarchyOutput], {
    nullable: true,
    description: 'Created hierarchies (parent and/or child relationships)',
  })
  hierarchies?: CreatedHierarchyOutput[];

  @Field({ nullable: true, description: 'Error message if failed' })
  error?: string;
}

/**
 * Response when updating a department
 */
@ObjectType()
export class UpdateDepartmentResponse {
  @Field({ description: 'Whether the operation was successful' })
  success: boolean;

  @Field(() => DepartmentOutput, {
    nullable: true,
    description: 'Updated department data',
  })
  department?: DepartmentOutput;

  @Field(() => [SubManagerOutput], {
    nullable: true,
    description: 'Replaced sub-managers for the department',
  })
  subManagers?: SubManagerOutput[];

  @Field({ nullable: true, description: 'Error message if failed' })
  error?: string;
}

/**
 * Response when deleting a department
 */
@ObjectType()
export class DeleteDepartmentResponse {
  @Field({ description: 'Whether the operation was successful' })
  success: boolean;

  @Field({ nullable: true, description: 'ID of deleted department' })
  deletedId?: string;

  @Field({ nullable: true, description: 'Error message if failed' })
  error?: string;
}
