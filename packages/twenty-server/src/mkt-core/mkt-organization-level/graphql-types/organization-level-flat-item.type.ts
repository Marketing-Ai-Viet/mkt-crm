import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * Flat organization level item - không bao gồm hierarchy relationships
 * Sử dụng cho query lấy toàn bộ levels dạng danh sách đơn giản
 */
@ObjectType('OrganizationLevelFlatItem')
export class OrganizationLevelFlatItem {
  @Field(() => String)
  id: string;

  @Field(() => String)
  levelCode: string;

  @Field(() => String)
  levelName: string;

  @Field(() => String, { nullable: true })
  levelNameEn?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Int)
  hierarchyLevel: number;

  @Field(() => String, { nullable: true })
  parentLevelId?: string;

  @Field(() => Int)
  displayOrder: number;

  @Field(() => Boolean, { nullable: true })
  isActive?: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
