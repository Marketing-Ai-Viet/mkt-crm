import { InputType, Field } from '@nestjs/graphql';

/**
 * Input để tạo hierarchy cho department (TEAM type)
 * Sử dụng khi tạo team department và cần thiết lập parent relationship
 */
@InputType()
export class CreateDepartmentHierarchyInput {
  @Field({ description: 'ID của department cha' })
  parentDepartmentId: string;

  @Field({ description: 'ID của department con (team)' })
  childDepartmentId: string;

  @Field({ nullable: true, description: 'Tên mối quan hệ' })
  name?: string;

  @Field({
    nullable: true,
    description: 'Loại quan hệ (TEAM, REPORTS_TO, etc.)',
  })
  relationshipType?: string;

  @Field({ nullable: true, description: 'Cấp độ trong hierarchy' })
  hierarchyLevel?: number;

  @Field({
    nullable: true,
    defaultValue: true,
    description: 'Kế thừa quyền từ parent',
  })
  inheritsPermissions?: boolean;

  @Field({
    nullable: true,
    defaultValue: false,
    description: 'Cho phép escalate lên parent',
  })
  canEscalateToParent?: boolean;

  @Field({
    nullable: true,
    defaultValue: false,
    description: 'Cho phép truy cập cross-branch',
  })
  allowsCrossBranchAccess?: boolean;

  @Field({ nullable: true, defaultValue: 0, description: 'Thứ tự hiển thị' })
  displayOrder?: number;

  @Field({ nullable: true, description: 'Ghi chú' })
  notes?: string;

  @Field({
    nullable: true,
    defaultValue: true,
    description: 'Trạng thái active',
  })
  isActive?: boolean;
}
