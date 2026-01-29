import { InputType, Field } from '@nestjs/graphql';

/**
 * Input để cập nhật hierarchy của department
 * Sử dụng khi thay đổi parent hoặc các thuộc tính hierarchy
 */
@InputType()
export class UpdateDepartmentHierarchyInput {
  @Field({
    nullable: true,
    description: 'ID của department cần cập nhật hierarchy',
  })
  childDepartmentId?: string;

  @Field({ nullable: true, description: 'ID của department cha mới' })
  parentDepartmentId?: string;

  @Field({ nullable: true, description: 'Tên mối quan hệ' })
  name?: string;

  @Field({
    nullable: true,
    description: 'Loại quan hệ (TEAM, REPORTS_TO, etc.)',
  })
  relationshipType?: string;

  @Field({ nullable: true, description: 'Cấp độ trong hierarchy' })
  hierarchyLevel?: number;

  @Field({ nullable: true, description: 'Kế thừa quyền từ parent' })
  inheritsPermissions?: boolean;

  @Field({ nullable: true, description: 'Cho phép escalate lên parent' })
  canEscalateToParent?: boolean;

  @Field({ nullable: true, description: 'Cho phép truy cập cross-branch' })
  allowsCrossBranchAccess?: boolean;

  @Field({ nullable: true, description: 'Thứ tự hiển thị' })
  displayOrder?: number;

  @Field({ nullable: true, description: 'Ghi chú' })
  notes?: string;

  @Field({ nullable: true, description: 'Trạng thái active' })
  isActive?: boolean;
}
