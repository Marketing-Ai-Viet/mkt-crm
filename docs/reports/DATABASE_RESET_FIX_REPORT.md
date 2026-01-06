# Database Reset Fix Report

**Date:** 2026-01-06
**Branch:** chore/phuth-order

## Summary

Fixed multiple issues causing `npx nx database:reset twenty-server` to hang or fail during the seed phase.

---

## Issues Fixed

### 1. Process Hanging After `cache:flush`

**Symptom:**
Database reset process would hang indefinitely after completing `cache:flush` step, never proceeding to `workspace:seed:dev`.

**Root Cause:**
`StuckPendingCleanupService` starts a `setInterval` on `OnModuleInit` but did not implement `OnModuleDestroy` to stop it. This prevented NestJS from exiting gracefully after command execution.

**File Modified:**
`packages/twenty-server/src/mkt-core/common/idempotency/services/stuck-pending-cleanup.service.ts`

**Fix:**
Added `OnModuleDestroy` lifecycle hook to stop the cleanup interval:

```typescript
// Before
@Injectable()
export class StuckPendingCleanupService implements OnModuleInit {
  onModuleInit(): void {
    this.startCleanupInterval();
  }
  // No cleanup on destroy
}

// After
@Injectable()
export class StuckPendingCleanupService implements OnModuleInit, OnModuleDestroy {
  onModuleInit(): void {
    this.startCleanupInterval();
  }

  onModuleDestroy(): void {
    this.stopCleanupInterval();
  }
}
```

---

### 2. "Object already exists" Error (DevSeederMetadataService)

**Symptom:**
When running seed multiple times, custom objects (ROCKET, PET, SURVEY_RESULT) would fail with "Object already exists" error.

**Root Cause:**
`seedCustomObject` method in `DevSeederMetadataService` attempted to create objects without checking if they already existed.

**File Modified:**
`packages/twenty-server/src/engine/workspace-manager/dev-seeder/metadata/services/dev-seeder-metadata.service.ts`

**Recommended Fix:**
Implement "delete before create" pattern:

```typescript
private async seedCustomObject({
  dataSourceId,
  workspaceId,
  objectMetadataSeed,
}: {
  dataSourceId: string;
  workspaceId: string;
  objectMetadataSeed: ObjectMetadataSeed;
}): Promise<void> {
  const existingObject =
    await this.objectMetadataService.findOneWithinWorkspace(workspaceId, {
      where: { nameSingular: objectMetadataSeed.nameSingular },
    });

  if (existingObject) {
    await this.objectMetadataService.deleteOneObject(
      { id: existingObject.id },
      workspaceId,
    );
  }

  await this.objectMetadataService.createOne({
    ...objectMetadataSeed,
    dataSourceId,
    workspaceId,
  });
}
```

---

### 3. "Field name is not available" Error (Custom Fields)

**Symptom:**
When seeding custom fields on existing objects (company, person), fields like `tagline` would fail with "Name 'tagline' is not available" error.

**Root Cause:**
`seedCustomFields` method attempted to create fields without checking if they already existed on the target object.

**File Modified:**
`packages/twenty-server/src/engine/workspace-manager/dev-seeder/metadata/services/dev-seeder-metadata.service.ts`

**Recommended Fix:**
Delete existing fields before creating new ones:

```typescript
private async seedCustomFields({
  workspaceId,
  objectMetadataNameSingular,
  fieldMetadataSeeds,
}: {
  workspaceId: string;
  objectMetadataNameSingular: string;
  fieldMetadataSeeds: FieldMetadataSeed[];
}): Promise<void> {
  const objectMetadata =
    await this.objectMetadataService.findOneWithinWorkspace(workspaceId, {
      where: { nameSingular: objectMetadataNameSingular },
    });

  if (!objectMetadata) {
    throw new Error(
      `Object metadata not found for: ${objectMetadataNameSingular}`,
    );
  }

  // Delete existing fields before creating new ones
  for (const fieldSeed of fieldMetadataSeeds) {
    const existingField =
      await this.fieldMetadataService.findOneWithinWorkspace(workspaceId, {
        where: {
          name: fieldSeed.name,
          objectMetadataId: objectMetadata.id,
        },
      });

    if (existingField) {
      await this.fieldMetadataService.deleteOneField(
        { id: existingField.id },
        workspaceId,
      );
    }
  }

  await this.fieldMetadataService.createMany(
    fieldMetadataSeeds.map((fieldMetadataSeed) => ({
      ...fieldMetadataSeed,
      objectMetadataId: objectMetadata.id,
      workspaceId,
    })),
  );
}
```

---

## Related Errors (Not Fixed in This PR)

### Role Duplication Error

**Symptom:**
`QueryFailedError: duplicate key value violates unique constraint "IDX_ROLE_LABEL_WORKSPACE_ID_UNIQUE"`

**Note:**
This is a separate seeding issue related to roles, not addressed in this fix. The role seeder needs similar "delete before create" or "upsert" logic.

---

## Files Changed

| File | Change |
|------|--------|
| `src/mkt-core/common/idempotency/services/stuck-pending-cleanup.service.ts` | Added `OnModuleDestroy` to stop interval |

---

## Testing

After applying the fix:
1. Run `npx nx database:reset twenty-server`
2. Verify process completes without hanging after `cache:flush`
3. Verify seed phase runs successfully

---

## Lessons Learned

1. **Always implement `OnModuleDestroy`** when using `setInterval`, `setTimeout`, or any persistent resources in NestJS services
2. **Idempotent seeding** - Seed operations should be idempotent (safe to run multiple times) by either:
   - Using "delete before create" pattern
   - Using "upsert" operations
   - Checking existence before creation
