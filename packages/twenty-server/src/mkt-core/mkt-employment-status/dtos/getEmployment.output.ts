import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class OutputEmploymentStatus {
  @Field(() => String)
  statusNameEn: string;

  @Field(() => String)
  statusName: string;
}
