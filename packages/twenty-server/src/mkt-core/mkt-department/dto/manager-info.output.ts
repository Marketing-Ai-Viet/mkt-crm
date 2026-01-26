import { Field, ID, ObjectType } from '@nestjs/graphql';

/**
 * DTO cho thông tin manager của department
 */
@ObjectType({ description: 'Manager information for department' })
export class ManagerInfo {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  firstName?: string;

  @Field(() => String, { nullable: true })
  lastName?: string;

  @Field(() => String, { nullable: true })
  fullName?: string;

  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string;
}

/**
 * DTO cho thông tin sub-manager với workspace member details
 */
@ObjectType({ description: 'Sub-manager with member details' })
export class SubManagerInfo {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  workspaceMemberId: string;

  @Field(() => String, { nullable: true })
  firstName?: string;

  @Field(() => String, { nullable: true })
  lastName?: string;

  @Field(() => String, { nullable: true })
  fullName?: string;

  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string;

  @Field(() => Boolean)
  isPrimary: boolean;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => String, { nullable: true })
  note?: string;

  @Field(() => Date, { nullable: true })
  assignedAt?: Date;
}
