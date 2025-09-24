# RBAC Module Setup and Testing Guide

## Overview

This guide provides step-by-step instructions for setting up and testing the Role-Based Access Control (RBAC) module in the MKT Core system.

## Architecture Components

### Core Entities
1. **MktPermissionTemplate** - Permission template definitions
2. **MktPermissionResource** - System resources (orders, invoices, etc.)
3. **MktPermissionAction** - Available actions (create, read, update, delete)
4. **MktTemplateResourcePermission** - Links templates to resource permissions
5. **MktTemplateSystemAction** - Links templates to system actions
6. **MktPermissionContext** - Permission contexts (own, department, team, etc.)
7. **MktUserPermissionTemplate** - User-template assignments
8. **MktUserPermissionOverride** - User-specific permission overrides

### Services
- **MktRbacService** - Core RBAC logic and permission checking
- **PermissionContextService** - Context evaluation and filtering

### Guards
- **ModuleAccessGuard** - Module-level access control
- **GraphQLPermissionGuard** - GraphQL query/mutation protection

## Setup Instructions

### 1. Database Setup

```bash
# Reset database and sync metadata
npx nx database:reset twenty-server
npx nx run twenty-server:command workspace:sync-metadata -f
```

### 2. Seed Base Data

```bash
# Seed permission templates (base templates)
npx nx run twenty-server:command seed-dev-workspace MktPermissionTemplate

# Seed permission resources (system resources)
npx nx run twenty-server:command seed-dev-workspace MktPermissionResource

# Seed permission actions (CRUD operations)
npx nx run twenty-server:command seed-dev-workspace MktPermissionAction

# Seed template resource permissions (template-resource links)
npx nx run twenty-server:command seed-dev-workspace MktTemplateResourcePermission

# Seed template system actions (template-action links)
npx nx run twenty-server:command seed-dev-workspace MktTemplateSystemAction

# Seed permission contexts (filtering contexts)
npx nx run twenty-server:command seed-dev-workspace MktPermissionContext
```

### 3. Seed User Assignments

```bash
# Seed user permission template assignments
npx nx run twenty-server:command seed-dev-workspace MktUserPermissionTemplate

# Seed user permission overrides (optional)
npx nx run twenty-server:command seed-dev-workspace MktUserPermissionOverride
```

### 4. Verify Module Registration

Ensure `MktRbacModule.forRoot()` is imported in `/packages/twenty-server/src/mkt-core/mkt-core.module.ts`:

```typescript
@Module({
  imports: [
    MktRbacModule.forRoot(), // RBAC module must be first
    MktOrderModule,
    // ... other modules
  ],
})
export class MktCoreModule {}
```

## Data Seeding Order

**Critical**: Follow this exact order for data seeding to avoid foreign key constraints:

1. **MktPermissionContext** - Independent contexts
2. **MktPermissionTemplate** - Base permission templates
3. **MktPermissionResource** - System resources
4. **MktPermissionAction** - Available actions
5. **MktTemplateResourcePermission** - Template-resource mappings
6. **MktTemplateSystemAction** - Template-action mappings
7. **MktUserPermissionTemplate** - User assignments
8. **MktUserPermissionOverride** - User-specific overrides

## Testing Procedures

### 1. Verify Entity Registration

```bash
# Check if all RBAC entities are properly registered
npx nx run twenty-server:command workspace:sync-metadata -f
```

Expected output: No errors about missing objects or relations.

### 2. Test Permission Context Evaluation

```typescript
// Example: Test context filtering
const context = await permissionContextService.evaluateContext(
  'OWN_RECORDS',
  { currentUserId: 'user-123', ownerId: 'user-123' }
);
// Should return: { allowed: true, filters: {...} }
```

### 3. Test Permission Checking

```typescript
// Example: Check user permissions
const hasPermission = await rbacService.hasPermission(
  'user-123',
  'mkt-order',
  'read',
  { ownerId: 'user-123' }
);
// Should return: true/false based on user's assigned templates
```

### 4. Test Guard Protection

```typescript
// Example: Protected controller method
@UseGuards(ModuleAccessGuard)
@RequirePermission('mkt-order', 'create')
async createOrder(@CurrentUser() user: User, @Body() data: CreateOrderDto) {
  // This method requires 'create' permission on 'mkt-order' resource
}
```

### 5. Verify GraphQL Protection

```graphql
# Test protected GraphQL queries
query GetOrders {
  orders {
    id
    customerName
    totalAmount
  }
}
```

## Common Issues and Troubleshooting

### 1. Dependency Injection Errors

**Error**: `Nest can't resolve dependencies of the ModuleAccessGuard`

**Solution**: Ensure `MktRbacModule.forRoot()` is imported before other modules that use guards.

### 2. Missing Entity Metadata

**Error**: `Target object mktUserPermissionTemplate not found in database`

**Solution**:
- Verify entity is exported in `/mkt-core/mkt-permission-template/entities/index.ts`
- Ensure entity is added to `MKT_FINAL_WORKSPACE_ENTITIES` array
- Run metadata sync: `npx nx run twenty-server:command workspace:sync-metadata -f`

### 3. Foreign Key Constraint Violations

**Error**: `violates foreign key constraint`

**Solution**: Follow the exact seeding order specified above.

### 4. JSON Parsing Errors in Context Data

**Error**: `invalid input syntax for type json`

**Solution**: Ensure JSON fields in context data are properly formatted and column order matches entity definition.

## Permission Template Examples

### 1. Super Admin Template
- All resources: CREATE, READ, UPDATE, DELETE
- All contexts: ALL_RECORDS
- All system actions: Enabled

### 2. Department Manager Template
- Order resources: CREATE, READ, UPDATE
- Invoice resources: READ, UPDATE
- Context: DEPARTMENT_RECORDS
- System actions: Limited to departmental functions

### 3. Regular Employee Template
- Order resources: CREATE, READ
- Invoice resources: READ
- Context: OWN_RECORDS
- System actions: Basic user functions only

### 4. Read-Only User Template
- All resources: READ only
- Context: DEPARTMENT_RECORDS or OWN_RECORDS
- System actions: View-only functions

## Performance Considerations

### 1. Context Evaluation Caching
- Context evaluation results are cached per user session
- Cache invalidation occurs on permission changes
- Consider Redis caching for high-traffic scenarios

### 2. Permission Checking Optimization
- Batch permission checks when possible
- Use database-level filtering for large datasets
- Implement permission-aware repositories

### 3. Guard Performance
- Guards are executed on every request
- Keep permission logic lightweight
- Use database indexes on permission-related fields

## Security Best Practices

### 1. Principle of Least Privilege
- Assign minimal required permissions
- Use specific contexts (OWN_RECORDS, DEPARTMENT_RECORDS) over ALL_RECORDS
- Regularly audit user permission assignments

### 2. Permission Validation
- Always validate permissions at multiple levels (guard, service, database)
- Log permission checks for audit trails
- Implement permission change notifications

### 3. Context Security
- Validate context filter expressions
- Sanitize user inputs in context evaluation
- Use parameterized queries for context filtering

## Monitoring and Logging

### 1. Permission Check Logging
```typescript
// Enable detailed permission logging
process.env.RBAC_DEBUG_MODE = 'true';
```

### 2. Access Audit Trail
- All permission checks are logged
- Failed access attempts are recorded
- User permission changes are tracked

### 3. Performance Monitoring
- Monitor guard execution time
- Track context evaluation performance
- Alert on permission check failures

## Migration Guide

### From Legacy Permission System
1. Export existing user roles and permissions
2. Map legacy roles to new permission templates
3. Create user-template assignments
4. Verify permission equivalency
5. Migrate gradually with feature flags

### Template Updates
1. Create new template versions
2. Assign users to new templates
3. Test permission changes
4. Deactivate old templates
5. Clean up unused templates