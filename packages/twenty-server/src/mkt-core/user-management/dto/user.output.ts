import { Field, ObjectType } from '@nestjs/graphql';

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

  @Field(() => String, { nullable: true })
  departmentId?: string;

  @Field(() => String, { nullable: true })
  organizationLevelId?: string;

  @Field(() => String, { nullable: true })
  employmentStatusId?: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
