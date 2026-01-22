# Test Report: Order Optimistic Locking

**Test Date**: 2026-01-22
**Tester**: Claude Code
**Module**: `mkt-core/order`
**Feature**: Optimistic Locking for concurrent editing

---

## Summary

| Metric | Value |
|--------|-------|
| Total Test Cases | 5 |
| Passed | 5 |
| Failed | 0 |
| Pass Rate | 100% |

---

## Test Environment

- **Server**: Twenty CRM Server (localhost:3000)
- **Database**: PostgreSQL
- **Workspace ID**: `20202020-1c25-4d02-bf25-6aeccf7ea419`
- **Test Order ID**: `09f33908-d459-44c3-999e-97f42faf6d30`

---

## Test Results

### Test Case 1: Update Order Success

**Objective**: Verify single user update works correctly

**Input**:
```graphql
mutation {
  updateOrderWithVersion(input: {
    orderId: "09f33908-d459-44c3-999e-97f42faf6d30"
    expectedVersion: 1
    data: { name: "Test Update - User A", note: "Ghi chu test" }
  }) { success newVersion error }
}
```

**Expected**: `success: true, newVersion: 2`

**Actual Response**:
```json
{
  "data": {
    "updateOrderWithVersion": {
      "success": true,
      "newVersion": 2,
      "error": null
    }
  }
}
```

**Result**: PASSED

---

### Test Case 2: Conflict Detection

**Objective**: Verify conflict detection when User B tries to update with old version

**Scenario**:
- User A updated order → version = 2
- User B tries to update with expectedVersion = 1

**Input**:
```graphql
mutation {
  updateOrderWithVersion(input: {
    orderId: "09f33908-d459-44c3-999e-97f42faf6d30"
    expectedVersion: 1
    data: { name: "User B - Ten khac", note: "User B ghi chu" }
  }) { success newVersion error conflict { currentVersion conflicts { field yourValue currentValue } } currentData }
}
```

**Expected**: `success: false` with conflict info

**Actual Response**:
```json
{
  "data": {
    "updateOrderWithVersion": {
      "success": false,
      "newVersion": null,
      "error": "Entity was modified by another user",
      "currentData": {
        "name": "Test Update - User A",
        "note": "Ghi chu test",
        "version": 2,
        ...
      },
      "conflict": {
        "currentVersion": 2,
        "conflicts": [
          {
            "field": "name",
            "yourValue": "User B - Ten khac",
            "currentValue": "Test Update - User A"
          },
          {
            "field": "note",
            "yourValue": "User B ghi chu",
            "currentValue": "Ghi chu test"
          }
        ]
      }
    }
  }
}
```

**Result**: PASSED

**Notes**:
- Conflict detection correctly identified version mismatch
- Field-level conflicts properly detected for `name` and `note`
- currentData returned for merge UI

---

### Test Case 3: Resolve Conflict

**Objective**: Verify force update after reviewing conflict

**Input**:
```graphql
mutation {
  resolveOrderConflict(input: {
    orderId: "09f33908-d459-44c3-999e-97f42faf6d30"
    currentVersion: 2
    data: { name: "User B - Resolved", note: "Da merge xong" }
  }) { success newVersion error }
}
```

**Expected**: `success: true, newVersion: 3`

**Actual Response**:
```json
{
  "data": {
    "resolveOrderConflict": {
      "success": true,
      "newVersion": 3,
      "error": null
    }
  }
}
```

**Result**: PASSED

---

### Test Case 4: Invalid Version

**Objective**: Verify validation for expectedVersion < 1

**Input**:
```graphql
mutation {
  updateOrderWithVersion(input: {
    orderId: "09f33908-d459-44c3-999e-97f42faf6d30"
    expectedVersion: 0
    data: { name: "Invalid" }
  }) { success error }
}
```

**Expected**: `success: false` with validation error

**Actual Response**:
```json
{
  "data": {
    "updateOrderWithVersion": {
      "success": false,
      "error": "Expected version must be a positive integer (>= 1)"
    }
  }
}
```

**Result**: PASSED

---

### Test Case 5: Order Not Found

**Objective**: Verify error handling when order doesn't exist

**Input**:
```graphql
mutation {
  updateOrderWithVersion(input: {
    orderId: "00000000-0000-0000-0000-000000000000"
    expectedVersion: 1
    data: { name: "Not Found" }
  }) { success error }
}
```

**Expected**: `success: false` with not found error

**Actual Response**:
```json
{
  "data": {
    "updateOrderWithVersion": {
      "success": false,
      "error": "Entity not found"
    }
  }
}
```

**Result**: PASSED

---

## Database Verification

**Final State** (after all tests):
```sql
SELECT id, name, note, version, "updatedAt"
FROM mktOrder WHERE id = '09f33908-d459-44c3-999e-97f42faf6d30';
```

| Field | Value |
|-------|-------|
| id | 09f33908-d459-44c3-999e-97f42faf6d30 |
| name | User B - Resolved |
| note | Da merge xong |
| version | 3 |
| updatedAt | 2026-01-22T03:19:44.925Z |

**Version History**:
- Version 1 → 2: Test Case 1 (User A update)
- Version 2 → 3: Test Case 3 (User B resolve conflict)

---

## Concurrent Edit Flow Verified

```
Timeline:
─────────────────────────────────────────────────────────────────
T1: Order version = 1
T2: User A reads order (version = 1)
T3: User B reads order (version = 1)
T4: User A saves → SUCCESS → version = 2
T5: User B saves with version 1 → CONFLICT detected
    - Returns: currentVersion=2, conflicts=[name, note]
T6: User B reviews conflict, decides to keep their changes
T7: User B resolves conflict with currentVersion=2 → SUCCESS → version = 3
─────────────────────────────────────────────────────────────────
```

---

## Conclusion

All test cases passed successfully. The Optimistic Locking implementation is working as expected:

1. **Single user updates** work correctly with version increment
2. **Conflict detection** properly identifies version mismatch and returns field-level conflicts
3. **Conflict resolution** allows force update after user reviews conflicts
4. **Input validation** correctly rejects invalid versions
5. **Error handling** properly handles non-existent entities

---

## Notes

- Permission bypass was enabled for testing (`shouldBypassPermissionChecks: true`)
- TODO: Remove bypass after proper RBAC setup for production
