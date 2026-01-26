import { InputType, Field, Int } from '@nestjs/graphql';

/**
 * Input for creating a new department
 */
@InputType()
export class CreateDepartmentInput {
  @Field({ description: 'Unique department code' })
  departmentCode: string;

  @Field({ description: 'Display name of the department' })
  departmentName: string;

  @Field({ nullable: true, description: 'English name of the department' })
  departmentNameEn?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Type of department (DEPARTMENT or TEAM)',
  })
  departmentType?: string;

  @Field({ nullable: true, description: 'Detailed description' })
  description?: string;

  @Field({ nullable: true, description: 'Budget tracking code' })
  budgetCode?: string;

  @Field({ nullable: true, description: 'Cost allocation center' })
  costCenter?: string;

  @Field({
    nullable: true,
    defaultValue: false,
    description: 'Whether KPI tracking is required',
  })
  requiresKpiTracking?: boolean;

  @Field({
    nullable: true,
    defaultValue: false,
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

  @Field({
    nullable: true,
    defaultValue: true,
    description: 'Whether this department is active',
  })
  isActive?: boolean;

  @Field({ nullable: true, description: 'Manager ID (workspace member)' })
  managerId?: string;
}
