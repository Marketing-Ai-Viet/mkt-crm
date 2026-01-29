import { Field, Int, ObjectType } from '@nestjs/graphql';

// ============================================
// NESTED OBJECT TYPES
// ============================================

@ObjectType({ description: 'Basic department information' })
export class DepartmentBasicOutput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  departmentCode: string;

  @Field(() => String)
  departmentName: string;

  @Field(() => String, { nullable: true })
  departmentNameEn?: string;
}

@ObjectType({ description: 'Basic permission template information' })
export class PermissionTemplateBasicOutput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  templateKey: string;

  @Field(() => String)
  templateName: string;

  @Field(() => String, { nullable: true })
  templateNameEn?: string;
}

@ObjectType({ description: 'Basic employment status information' })
export class EmploymentStatusBasicOutput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  statusCode: string;

  @Field(() => String)
  statusName: string;

  @Field(() => String, { nullable: true })
  statusNameEn?: string;
}

@ObjectType({ description: 'Basic organization level information' })
export class OrganizationLevelBasicOutput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  levelCode: string;

  @Field(() => String)
  levelName: string;

  @Field(() => String, { nullable: true })
  levelNameEn?: string;

  @Field(() => Int)
  hierarchyLevel: number;
}

// ============================================
// MAIN USER OUTPUT
// ============================================

@ObjectType()
export class UserOutput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  email: string;

  @Field(() => String, { nullable: true })
  firstName?: string;

  @Field(() => String, { nullable: true })
  lastName?: string;

  @Field(() => Date)
  startDate: Date;

  @Field(() => Date, { nullable: true })
  endDate?: Date | null;

  @Field(() => String)
  language: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string | null;

  @Field(() => String, { nullable: true })
  jobTitle?: string;

  @Field(() => String, { nullable: true })
  city?: string;

  @Field(() => String, { nullable: true })
  phone?: string;

  @Field(() => String, { nullable: true })
  memberCode?: string;

  @Field(() => String, { nullable: true })
  memberType?: string;

  @Field(() => String, { nullable: true })
  status?: string;

  @Field(() => String, { nullable: true })
  grade?: string;

  @Field(() => String, { nullable: true })
  address?: string;

  // ============================================
  // RELATED ENTITIES AS OBJECTS
  // ============================================

  @Field(() => DepartmentBasicOutput, { nullable: true })
  department?: DepartmentBasicOutput | null;

  @Field(() => PermissionTemplateBasicOutput, { nullable: true })
  permissionTemplate?: PermissionTemplateBasicOutput | null;

  @Field(() => EmploymentStatusBasicOutput, { nullable: true })
  employmentStatus?: EmploymentStatusBasicOutput | null;

  @Field(() => OrganizationLevelBasicOutput, { nullable: true })
  organizationLevel?: OrganizationLevelBasicOutput | null;

  // ============================================
  // TIMESTAMPS
  // ============================================

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
