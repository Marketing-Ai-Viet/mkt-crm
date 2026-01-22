import { Field, ObjectType } from '@nestjs/graphql';

/**
 * Response khi tạo department với hierarchy
 */
@ObjectType()
export class CreateDepartmentHierarchyResponse {
  @Field({ description: 'Thành công hay không' })
  success: boolean;

  @Field({ nullable: true, description: 'ID của department được tạo' })
  departmentId?: string;

  @Field({ nullable: true, description: 'ID của hierarchy được tạo' })
  hierarchyId?: string;

  @Field({ nullable: true, description: 'Thông báo lỗi nếu có' })
  error?: string;
}

/**
 * Response khi cập nhật department hierarchy
 */
@ObjectType()
export class UpdateDepartmentHierarchyResponse {
  @Field({ description: 'Thành công hay không' })
  success: boolean;

  @Field({ nullable: true, description: 'ID của department' })
  departmentId?: string;

  @Field({ nullable: true, description: 'ID của hierarchy được cập nhật' })
  hierarchyId?: string;

  @Field({ nullable: true, description: 'Thông báo lỗi nếu có' })
  error?: string;
}
