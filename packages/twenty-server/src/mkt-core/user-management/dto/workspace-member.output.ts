import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class WorkspaceMemberListOutput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string;

  @Field(() => String, { nullable: true })
  locale?: string;

  @Field(() => String, { nullable: true })
  colorScheme?: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => String, { nullable: true })
  userEmail?: string;

  @Field(() => String)
  startDate: string;

  @Field(() => String, { nullable: true })
  endDate?: string | null;
}
