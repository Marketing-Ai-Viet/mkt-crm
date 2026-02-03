export * from './create-user.input';
export * from './update-user.input';
export * from './update-my-profile.input';
export * from './search-user.input';
export * from './user.output';
export * from './user-list.output';

// Re-export nested output types for convenience
export {
  DepartmentBasicOutput,
  DirectManagerOutput,
  PermissionTemplateBasicOutput,
  EmploymentStatusBasicOutput,
  OrganizationLevelBasicOutput,
} from './user.output';
