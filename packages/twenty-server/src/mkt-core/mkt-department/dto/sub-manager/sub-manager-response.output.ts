import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SubManagerOutput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  departmentId: string;

  @Field(() => String)
  workspaceMemberId: string;

  @Field(() => Boolean, { nullable: true })
  isPrimary?: boolean;

  @Field(() => Date, { nullable: true })
  assignedAt?: Date;

  @Field(() => String, { nullable: true })
  note?: string;

  @Field(() => Boolean, { nullable: true })
  isActive?: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

@ObjectType()
export class CreateSubManagerResponse {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => SubManagerOutput, { nullable: true })
  subManager?: SubManagerOutput;

  @Field(() => String, { nullable: true })
  error?: string;
}

@ObjectType()
export class UpdateSubManagerResponse {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => SubManagerOutput, { nullable: true })
  subManager?: SubManagerOutput;

  @Field(() => String, { nullable: true })
  error?: string;
}

@ObjectType()
export class DeleteSubManagerResponse {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  deletedId?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}

@ObjectType()
export class SubManagerListResponse {
  @Field(() => [SubManagerOutput])
  items: SubManagerOutput[];

  @Field(() => Number)
  totalCount: number;
}

@ObjectType()
export class SetPrimarySubManagerResponse {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  error?: string;
}
