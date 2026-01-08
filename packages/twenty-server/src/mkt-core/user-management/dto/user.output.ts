import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserOutput {
  @Field(() => String)
  email: string;

  @Field(() => String)
  id: string;

  @Field(() => String, { nullable: true })
  firstName?: string;

  @Field(() => Date)
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  endDate?: Date | null;

  @Field(() => String, { nullable: true })
  lastName?: string;

  @Field(() => String)
  language: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string | null = null;

  @Field(() => String, { nullable: true })
  jobTitle?: string;

  @Field(() => String, { nullable: true })
  city?: string;

  @Field(() => String, { nullable: true })
  phone?: string;
}
