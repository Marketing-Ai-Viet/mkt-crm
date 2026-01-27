# User Management API - Frontend Integration Guide

## Mục lục

- [1. Tổng quan](#1-tổng-quan)
- [2. GraphQL Schema](#2-graphql-schema)
- [3. TypeScript Types](#3-typescript-types)
- [4. GraphQL Operations](#4-graphql-operations)
- [5. React Hooks](#5-react-hooks)
- [6. Ví dụ Implementation](#6-ví-dụ-implementation)
- [7. Error Handling](#7-error-handling)
- [8. Best Practices](#8-best-practices)

---

## 1. Tổng quan

### 1.1 API Endpoints

| Type | Name | Mô tả |
|------|------|-------|
| Query | `getPersonUser` | Lấy thông tin user theo ID |
| Query | `searchPersonUsers` | Tìm kiếm users với filters và pagination |
| Mutation | `createPersonUser` | Tạo user mới |
| Mutation | `updatePersonUser` | Cập nhật thông tin user |
| Mutation | `deletePersonUser` | Xóa user (soft delete) |

### 1.2 Authentication

Tất cả API yêu cầu JWT token trong header:

```typescript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${accessToken}`,
};
```

---

## 2. GraphQL Schema

### 2.1 Input Types

```graphql
# Input để tạo user mới
input CreateUserInput {
  email: String!                    # Email (bắt buộc, unique)
  firstName: String                 # Tên
  lastName: String                  # Họ
  startDate: Date!                  # Ngày bắt đầu làm việc (bắt buộc)
  endDate: Date                     # Ngày kết thúc (nullable)
  position: Float = 0               # Vị trí sắp xếp
  jobTitle: String                  # Chức danh
  city: String                      # Thành phố
  phone: String                     # Số điện thoại
  canImpersonate: Boolean = true    # Quyền impersonate
  canAdmin: Boolean = false         # Quyền admin
  language: String = "en"           # Ngôn ngữ
  avatarUrl: String                 # URL avatar
  calendarStartDay: Float = 7       # Ngày bắt đầu tuần (7 = Sunday)
  departmentId: String              # ID phòng ban
  teamId: String                    # ID team
  status: String                    # Trạng thái (ACTIVE, INACTIVE, ...)
  memberType: String                # Loại nhân viên (FULL_TIME, PART_TIME, ...)
  employmentStatusId: String        # ID trạng thái công việc
  organizationLevelId: String       # ID cấp bậc tổ chức
  roleId: String!                   # ID role (bắt buộc)
}

# Input để cập nhật user
input UpdateUserInput {
  memberId: String!                 # ID member cần update (bắt buộc)
  firstName: String
  lastName: String
  startDate: Date
  endDate: Date
  avatarUrl: String
  status: String
  memberType: String
  grade: String                     # Cấp bậc
  address: String                   # Địa chỉ
  departmentId: String
  teamId: String
  organizationLevelId: String
  employmentStatusId: String
  locale: String                    # Locale (en, vi, ...)
  timeZone: String                  # Timezone
  position: Float
  calendarStartDay: Float
}

# Input để tìm kiếm users
input SearchUserInput {
  keyword: String                   # Tìm trong firstName, lastName, email, memberCode
  email: String                     # Filter theo email (partial match)
  memberCode: String                # Filter theo mã nhân viên (exact match)
  status: String                    # Filter theo status
  memberType: String                # Filter theo loại nhân viên
  departmentId: String              # Filter theo phòng ban
  teamId: String                    # Filter theo team
  organizationLevelId: String       # Filter theo cấp bậc
  employmentStatusId: String        # Filter theo trạng thái công việc
  page: Int = 1                     # Trang (bắt đầu từ 1)
  limit: Int = 20                   # Số lượng mỗi trang (max: 100)
}
```

### 2.2 Output Types

```graphql
# Thông tin user
type UserOutput {
  id: String!
  email: String!
  firstName: String
  lastName: String
  startDate: Date!
  endDate: Date
  language: String!
  avatarUrl: String
  jobTitle: String
  city: String
  phone: String
  memberCode: String
  memberType: String
  status: String
  grade: String
  address: String
  departmentId: String
  teamId: String
  organizationLevelId: String
  employmentStatusId: String
  createdAt: Date!
  updatedAt: Date!
}

# Danh sách users với pagination
type UserListOutput {
  items: [UserOutput!]!             # Danh sách users
  total: Int!                       # Tổng số records
  page: Int!                        # Trang hiện tại
  limit: Int!                       # Số lượng mỗi trang
  totalPages: Int!                  # Tổng số trang
  hasNextPage: Boolean!             # Có trang tiếp theo không
  hasPreviousPage: Boolean!         # Có trang trước không
}
```

---

## 3. TypeScript Types

### 3.1 Định nghĩa types

```typescript
// types/user.types.ts

// ============================================
// INPUT TYPES
// ============================================

export type CreateUserInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  startDate: string; // ISO date string: "2024-01-15"
  endDate?: string | null;
  position?: number;
  jobTitle?: string;
  city?: string;
  phone?: string;
  canImpersonate?: boolean;
  canAdmin?: boolean;
  language?: string;
  avatarUrl?: string | null;
  calendarStartDay?: number;
  departmentId?: string;
  teamId?: string;
  status?: string;
  memberType?: string;
  employmentStatusId?: string;
  organizationLevelId?: string;
  roleId: string;
};

export type UpdateUserInput = {
  memberId: string;
  firstName?: string;
  lastName?: string;
  startDate?: string;
  endDate?: string | null;
  avatarUrl?: string | null;
  status?: string;
  memberType?: string;
  grade?: string;
  address?: string;
  departmentId?: string;
  teamId?: string;
  organizationLevelId?: string;
  employmentStatusId?: string;
  locale?: string;
  timeZone?: string;
  position?: number;
  calendarStartDay?: number;
};

export type SearchUserInput = {
  keyword?: string;
  email?: string;
  memberCode?: string;
  status?: string;
  memberType?: string;
  departmentId?: string;
  teamId?: string;
  organizationLevelId?: string;
  employmentStatusId?: string;
  page?: number;
  limit?: number;
};

// ============================================
// OUTPUT TYPES
// ============================================

export type UserOutput = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  startDate: string;
  endDate?: string | null;
  language: string;
  avatarUrl?: string | null;
  jobTitle?: string;
  city?: string;
  phone?: string;
  memberCode?: string;
  memberType?: string;
  status?: string;
  grade?: string;
  address?: string;
  departmentId?: string;
  teamId?: string;
  organizationLevelId?: string;
  employmentStatusId?: string;
  createdAt: string;
  updatedAt: string;
};

export type UserListOutput = {
  items: UserOutput[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

// ============================================
// ENUM/CONSTANTS
// ============================================

export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  RESIGNED: 'RESIGNED',
  ON_LEAVE: 'ON_LEAVE',
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export const MEMBER_TYPE = {
  FULL_TIME: 'FULL_TIME',
  PART_TIME: 'PART_TIME',
  CONTRACT: 'CONTRACT',
  INTERN: 'INTERN',
} as const;

export type MemberType = (typeof MEMBER_TYPE)[keyof typeof MEMBER_TYPE];

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
```

---

## 4. GraphQL Operations

### 4.1 Queries

```typescript
// graphql/user.queries.ts

import { gql } from '@apollo/client';

// Fragment để reuse fields
export const USER_FRAGMENT = gql`
  fragment UserFields on UserOutput {
    id
    email
    firstName
    lastName
    startDate
    endDate
    language
    avatarUrl
    memberCode
    memberType
    status
    grade
    address
    departmentId
    teamId
    organizationLevelId
    employmentStatusId
    createdAt
    updatedAt
  }
`;

// Lấy thông tin user theo ID
export const GET_PERSON_USER = gql`
  ${USER_FRAGMENT}
  query GetPersonUser($memberId: String!) {
    getPersonUser(memberId: $memberId) {
      ...UserFields
    }
  }
`;

// Tìm kiếm users
export const SEARCH_PERSON_USERS = gql`
  ${USER_FRAGMENT}
  query SearchPersonUsers($input: SearchUserInput!) {
    searchPersonUsers(input: $input) {
      items {
        ...UserFields
      }
      total
      page
      limit
      totalPages
      hasNextPage
      hasPreviousPage
    }
  }
`;
```

### 4.2 Mutations

```typescript
// graphql/user.mutations.ts

import { gql } from '@apollo/client';
import { USER_FRAGMENT } from './user.queries';

// Tạo user mới
export const CREATE_PERSON_USER = gql`
  ${USER_FRAGMENT}
  mutation CreatePersonUser($input: CreateUserInput!) {
    createPersonUser(input: $input) {
      ...UserFields
    }
  }
`;

// Cập nhật user
export const UPDATE_PERSON_USER = gql`
  ${USER_FRAGMENT}
  mutation UpdatePersonUser($input: UpdateUserInput!) {
    updatePersonUser(input: $input) {
      ...UserFields
    }
  }
`;

// Xóa user
export const DELETE_PERSON_USER = gql`
  mutation DeletePersonUser($memberId: String!) {
    deletePersonUser(memberId: $memberId)
  }
`;
```

---

## 5. React Hooks

### 5.1 Custom Hooks

```typescript
// hooks/useUserManagement.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApolloClient, useLazyQuery } from '@apollo/client';

import {
  GET_PERSON_USER,
  SEARCH_PERSON_USERS,
  CREATE_PERSON_USER,
  UPDATE_PERSON_USER,
  DELETE_PERSON_USER,
} from '../graphql';
import {
  CreateUserInput,
  UpdateUserInput,
  SearchUserInput,
  UserOutput,
  UserListOutput,
} from '../types/user.types';

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook để lấy thông tin user theo ID
 */
export const useGetPersonUser = (memberId: string | undefined) => {
  const client = useApolloClient();

  return useQuery({
    queryKey: ['personUser', memberId],
    queryFn: async () => {
      if (!memberId) return null;

      const { data } = await client.query<{ getPersonUser: UserOutput | null }>({
        query: GET_PERSON_USER,
        variables: { memberId },
        fetchPolicy: 'network-only',
      });

      return data.getPersonUser;
    },
    enabled: !!memberId,
  });
};

/**
 * Hook để tìm kiếm users với pagination
 */
export const useSearchPersonUsers = (input: SearchUserInput) => {
  const client = useApolloClient();

  return useQuery({
    queryKey: ['personUsers', input],
    queryFn: async () => {
      const { data } = await client.query<{ searchPersonUsers: UserListOutput }>({
        query: SEARCH_PERSON_USERS,
        variables: { input },
        fetchPolicy: 'network-only',
      });

      return data.searchPersonUsers;
    },
  });
};

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook để tạo user mới
 */
export const useCreatePersonUser = () => {
  const client = useApolloClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const { data } = await client.mutate<{ createPersonUser: UserOutput }>({
        mutation: CREATE_PERSON_USER,
        variables: { input },
      });

      return data?.createPersonUser;
    },
    onSuccess: () => {
      // Invalidate search queries để refresh list
      queryClient.invalidateQueries({ queryKey: ['personUsers'] });
    },
  });
};

/**
 * Hook để cập nhật user
 */
export const useUpdatePersonUser = () => {
  const client = useApolloClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateUserInput) => {
      const { data } = await client.mutate<{ updatePersonUser: UserOutput }>({
        mutation: UPDATE_PERSON_USER,
        variables: { input },
      });

      return data?.updatePersonUser;
    },
    onSuccess: (data) => {
      if (data) {
        // Update cache cho user cụ thể
        queryClient.setQueryData(['personUser', data.id], data);
        // Invalidate search queries
        queryClient.invalidateQueries({ queryKey: ['personUsers'] });
      }
    },
  });
};

/**
 * Hook để xóa user
 */
export const useDeletePersonUser = () => {
  const client = useApolloClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { data } = await client.mutate<{ deletePersonUser: boolean }>({
        mutation: DELETE_PERSON_USER,
        variables: { memberId },
      });

      return data?.deletePersonUser;
    },
    onSuccess: (_, memberId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['personUser', memberId] });
      // Invalidate search queries
      queryClient.invalidateQueries({ queryKey: ['personUsers'] });
    },
  });
};
```

### 5.2 Hook với Recoil State (Twenty CRM Style)

```typescript
// hooks/useUserManagementState.ts

import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { useCallback } from 'react';

import { userListState, userSearchFiltersState, selectedUserState } from '../states/user.state';
import { useSearchPersonUsers, useGetPersonUser } from './useUserManagement';
import { SearchUserInput, UserOutput } from '../types/user.types';

/**
 * Hook quản lý state user list với Recoil
 */
export const useUserListState = () => {
  const [filters, setFilters] = useRecoilState(userSearchFiltersState);
  const setUserList = useSetRecoilState(userListState);

  const { data, isLoading, error, refetch } = useSearchPersonUsers(filters);

  // Sync data to Recoil state
  useEffect(() => {
    if (data) {
      setUserList(data);
    }
  }, [data, setUserList]);

  const updateFilters = useCallback((newFilters: Partial<SearchUserInput>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, [setFilters]);

  const goToPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, [setFilters]);

  const setPageSize = useCallback((limit: number) => {
    setFilters((prev) => ({ ...prev, limit, page: 1 }));
  }, [setFilters]);

  return {
    data,
    isLoading,
    error,
    filters,
    updateFilters,
    goToPage,
    setPageSize,
    refetch,
  };
};
```

---

## 6. Ví dụ Implementation

### 6.1 User List Component

```tsx
// components/UserList/UserList.tsx

import { useState } from 'react';
import { useSearchPersonUsers, useDeletePersonUser } from '../../hooks/useUserManagement';
import { SearchUserInput, UserOutput, DEFAULT_PAGE_SIZE } from '../../types/user.types';

type UserListProps = {
  onSelectUser: (user: UserOutput) => void;
  onEditUser: (user: UserOutput) => void;
};

export const UserList = ({ onSelectUser, onEditUser }: UserListProps) => {
  const [filters, setFilters] = useState<SearchUserInput>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
  });

  const { data, isLoading, error } = useSearchPersonUsers(filters);
  const deleteUser = useDeletePersonUser();

  const handleSearch = (keyword: string) => {
    setFilters((prev) => ({ ...prev, keyword, page: 1 }));
  };

  const handleFilterByStatus = (status: string | undefined) => {
    setFilters((prev) => ({ ...prev, status, page: 1 }));
  };

  const handleFilterByDepartment = (departmentId: string | undefined) => {
    setFilters((prev) => ({ ...prev, departmentId, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleDelete = async (memberId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa user này?')) {
      try {
        await deleteUser.mutateAsync(memberId);
        // Show success toast
      } catch (error) {
        // Show error toast
      }
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return null;

  return (
    <div className="user-list">
      {/* Search & Filters */}
      <div className="user-list__filters">
        <SearchInput
          placeholder="Tìm kiếm theo tên, email..."
          onSearch={handleSearch}
        />
        <StatusFilter
          value={filters.status}
          onChange={handleFilterByStatus}
        />
        <DepartmentFilter
          value={filters.departmentId}
          onChange={handleFilterByDepartment}
        />
      </div>

      {/* User Table */}
      <table className="user-list__table">
        <thead>
          <tr>
            <th>Họ tên</th>
            <th>Email</th>
            <th>Mã NV</th>
            <th>Phòng ban</th>
            <th>Trạng thái</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((user) => (
            <tr key={user.id} onClick={() => onSelectUser(user)}>
              <td>{`${user.firstName || ''} ${user.lastName || ''}`}</td>
              <td>{user.email}</td>
              <td>{user.memberCode || '-'}</td>
              <td>{user.departmentId || '-'}</td>
              <td>
                <StatusBadge status={user.status} />
              </td>
              <td>
                <button onClick={(e) => { e.stopPropagation(); onEditUser(user); }}>
                  Edit
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(user.id); }}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <Pagination
        currentPage={data.page}
        totalPages={data.totalPages}
        hasNextPage={data.hasNextPage}
        hasPreviousPage={data.hasPreviousPage}
        onPageChange={handlePageChange}
      />

      {/* Summary */}
      <div className="user-list__summary">
        Hiển thị {data.items.length} / {data.total} kết quả
      </div>
    </div>
  );
};
```

### 6.2 Create User Form

```tsx
// components/UserForm/CreateUserForm.tsx

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useCreatePersonUser } from '../../hooks/useUserManagement';
import { CreateUserInput } from '../../types/user.types';

// Validation schema
const createUserSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  startDate: z.string().min(1, 'Ngày bắt đầu là bắt buộc'),
  roleId: z.string().min(1, 'Role là bắt buộc'),
  departmentId: z.string().optional(),
  teamId: z.string().optional(),
  status: z.string().optional(),
  memberType: z.string().optional(),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

type CreateUserFormProps = {
  onSuccess: () => void;
  onCancel: () => void;
};

export const CreateUserForm = ({ onSuccess, onCancel }: CreateUserFormProps) => {
  const createUser = useCreatePersonUser();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      startDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      memberType: 'FULL_TIME',
    },
  });

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      await createUser.mutateAsync(data as CreateUserInput);
      reset();
      onSuccess();
    } catch (error) {
      // Error đã được handle trong mutation hook
      console.error('Failed to create user:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="user-form">
      <h2>Tạo User Mới</h2>

      {/* Email */}
      <div className="form-field">
        <label htmlFor="email">Email *</label>
        <input
          id="email"
          type="email"
          {...register('email')}
          placeholder="user@example.com"
        />
        {errors.email && <span className="error">{errors.email.message}</span>}
      </div>

      {/* First Name */}
      <div className="form-field">
        <label htmlFor="firstName">Tên</label>
        <input
          id="firstName"
          type="text"
          {...register('firstName')}
          placeholder="Nguyễn"
        />
      </div>

      {/* Last Name */}
      <div className="form-field">
        <label htmlFor="lastName">Họ</label>
        <input
          id="lastName"
          type="text"
          {...register('lastName')}
          placeholder="Văn A"
        />
      </div>

      {/* Start Date */}
      <div className="form-field">
        <label htmlFor="startDate">Ngày bắt đầu *</label>
        <input
          id="startDate"
          type="date"
          {...register('startDate')}
        />
        {errors.startDate && <span className="error">{errors.startDate.message}</span>}
      </div>

      {/* Role */}
      <div className="form-field">
        <label htmlFor="roleId">Role *</label>
        <RoleSelect {...register('roleId')} />
        {errors.roleId && <span className="error">{errors.roleId.message}</span>}
      </div>

      {/* Department */}
      <div className="form-field">
        <label htmlFor="departmentId">Phòng ban</label>
        <DepartmentSelect {...register('departmentId')} />
      </div>

      {/* Status */}
      <div className="form-field">
        <label htmlFor="status">Trạng thái</label>
        <select {...register('status')}>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Member Type */}
      <div className="form-field">
        <label htmlFor="memberType">Loại nhân viên</label>
        <select {...register('memberType')}>
          <option value="FULL_TIME">Full-time</option>
          <option value="PART_TIME">Part-time</option>
          <option value="CONTRACT">Contract</option>
          <option value="INTERN">Intern</option>
        </select>
      </div>

      {/* Actions */}
      <div className="form-actions">
        <button type="button" onClick={onCancel} disabled={isSubmitting}>
          Hủy
        </button>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang tạo...' : 'Tạo User'}
        </button>
      </div>

      {/* Error Message */}
      {createUser.error && (
        <div className="form-error">
          {createUser.error.message || 'Có lỗi xảy ra'}
        </div>
      )}
    </form>
  );
};
```

### 6.3 Update User Form

```tsx
// components/UserForm/UpdateUserForm.tsx

import { useForm } from 'react-hook-form';
import { useEffect } from 'react';

import { useUpdatePersonUser, useGetPersonUser } from '../../hooks/useUserManagement';
import { UpdateUserInput, UserOutput } from '../../types/user.types';

type UpdateUserFormProps = {
  memberId: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export const UpdateUserForm = ({ memberId, onSuccess, onCancel }: UpdateUserFormProps) => {
  const { data: user, isLoading } = useGetPersonUser(memberId);
  const updateUser = useUpdatePersonUser();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<Omit<UpdateUserInput, 'memberId'>>();

  // Populate form khi có data
  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        status: user.status || '',
        memberType: user.memberType || '',
        grade: user.grade || '',
        address: user.address || '',
        departmentId: user.departmentId || '',
        teamId: user.teamId || '',
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: Omit<UpdateUserInput, 'memberId'>) => {
    try {
      await updateUser.mutateAsync({
        memberId,
        ...data,
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (!user) return <div>User not found</div>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="user-form">
      <h2>Cập nhật User</h2>

      {/* Email (readonly) */}
      <div className="form-field">
        <label>Email</label>
        <input type="email" value={user.email} disabled />
      </div>

      {/* First Name */}
      <div className="form-field">
        <label htmlFor="firstName">Tên</label>
        <input id="firstName" type="text" {...register('firstName')} />
      </div>

      {/* Last Name */}
      <div className="form-field">
        <label htmlFor="lastName">Họ</label>
        <input id="lastName" type="text" {...register('lastName')} />
      </div>

      {/* Status */}
      <div className="form-field">
        <label htmlFor="status">Trạng thái</label>
        <select {...register('status')}>
          <option value="">-- Chọn --</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="RESIGNED">Resigned</option>
          <option value="ON_LEAVE">On Leave</option>
        </select>
      </div>

      {/* Grade */}
      <div className="form-field">
        <label htmlFor="grade">Cấp bậc</label>
        <select {...register('grade')}>
          <option value="">-- Chọn --</option>
          <option value="JUNIOR">Junior</option>
          <option value="MIDDLE">Middle</option>
          <option value="SENIOR">Senior</option>
          <option value="LEAD">Lead</option>
        </select>
      </div>

      {/* Department */}
      <div className="form-field">
        <label htmlFor="departmentId">Phòng ban</label>
        <DepartmentSelect {...register('departmentId')} />
      </div>

      {/* Address */}
      <div className="form-field">
        <label htmlFor="address">Địa chỉ</label>
        <textarea id="address" {...register('address')} />
      </div>

      {/* Actions */}
      <div className="form-actions">
        <button type="button" onClick={onCancel} disabled={isSubmitting}>
          Hủy
        </button>
        <button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </form>
  );
};
```

---

## 7. Error Handling

### 7.1 Error Types

```typescript
// types/error.types.ts

export type GraphQLError = {
  message: string;
  extensions?: {
    code?: string;
    userFriendlyMessage?: string;
    subCode?: string;
  };
};

export const ERROR_CODES = {
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export const ERROR_MESSAGES: Record<string, string> = {
  'Workspace member not found': 'Không tìm thấy thành viên',
  'An account already exists with this email.': 'Email đã được sử dụng',
  'Forbidden resource': 'Bạn không có quyền truy cập',
  'You must be authenticated': 'Vui lòng đăng nhập',
};
```

### 7.2 Error Handler Hook

```typescript
// hooks/useErrorHandler.ts

import { useCallback } from 'react';
import { toast } from 'react-toastify';

import { GraphQLError, ERROR_MESSAGES } from '../types/error.types';

export const useErrorHandler = () => {
  const handleError = useCallback((error: unknown) => {
    let message = 'Có lỗi xảy ra, vui lòng thử lại';

    if (error instanceof Error) {
      // Check if it's a GraphQL error
      const graphqlError = error as { graphQLErrors?: GraphQLError[] };

      if (graphqlError.graphQLErrors?.length) {
        const firstError = graphqlError.graphQLErrors[0];
        message = firstError.extensions?.userFriendlyMessage
          || ERROR_MESSAGES[firstError.message]
          || firstError.message;
      } else {
        message = ERROR_MESSAGES[error.message] || error.message;
      }
    }

    toast.error(message);

    return message;
  }, []);

  return { handleError };
};
```

### 7.3 Sử dụng Error Handler

```tsx
const CreateUserButton = () => {
  const createUser = useCreatePersonUser();
  const { handleError } = useErrorHandler();

  const handleClick = async () => {
    try {
      await createUser.mutateAsync({
        email: 'test@example.com',
        startDate: '2024-01-15',
        roleId: 'role-123',
      });
      toast.success('Tạo user thành công!');
    } catch (error) {
      handleError(error);
    }
  };

  return <button onClick={handleClick}>Tạo User</button>;
};
```

---

## 8. Best Practices

### 8.1 Performance

```typescript
// ✅ DO: Sử dụng query key chính xác cho caching
const { data } = useSearchPersonUsers({
  page: 1,
  limit: 20,
  departmentId: 'dept-123',
});

// ✅ DO: Invalidate đúng queries khi mutate
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['personUsers'] });
}

// ✅ DO: Sử dụng pagination thay vì load tất cả
const { data } = useSearchPersonUsers({
  page: currentPage,
  limit: 20, // Không load quá 100 items/page
});

// ❌ DON'T: Load tất cả data cùng lúc
const { data } = useSearchPersonUsers({
  limit: 10000, // Quá nhiều!
});
```

### 8.2 Form Handling

```typescript
// ✅ DO: Validate trước khi submit
const schema = z.object({
  email: z.string().email(),
  startDate: z.string().min(1),
  roleId: z.string().min(1),
});

// ✅ DO: Chỉ gửi fields đã thay đổi khi update
const changedFields = Object.keys(dirtyFields).reduce((acc, key) => {
  acc[key] = formData[key];
  return acc;
}, {});

await updateUser.mutateAsync({
  memberId,
  ...changedFields,
});

// ❌ DON'T: Gửi tất cả fields khi update
await updateUser.mutateAsync({
  memberId,
  firstName: formData.firstName,
  lastName: formData.lastName,
  // ... tất cả fields khác dù không thay đổi
});
```

### 8.3 UX Patterns

```typescript
// ✅ DO: Hiển thị loading state
if (isLoading) return <LoadingSpinner />;

// ✅ DO: Confirm trước khi delete
const handleDelete = async (memberId: string) => {
  const confirmed = await confirmDialog({
    title: 'Xác nhận xóa',
    message: 'Bạn có chắc chắn muốn xóa user này?',
  });

  if (confirmed) {
    await deleteUser.mutateAsync(memberId);
  }
};

// ✅ DO: Disable button khi đang submit
<button disabled={isSubmitting}>
  {isSubmitting ? 'Đang xử lý...' : 'Submit'}
</button>

// ✅ DO: Hiển thị validation errors inline
{errors.email && (
  <span className="error">{errors.email.message}</span>
)}
```

### 8.4 Date Handling

```typescript
// ✅ DO: Sử dụng ISO string cho date input
const startDate = new Date().toISOString().split('T')[0]; // "2024-01-15"

// ✅ DO: Parse date từ API response
const formattedDate = new Date(user.startDate).toLocaleDateString('vi-VN');

// ✅ DO: Sử dụng date-fns hoặc dayjs
import { format, parseISO } from 'date-fns';
const formatted = format(parseISO(user.startDate), 'dd/MM/yyyy');
```

---

## Appendix

### A. Full Example: User Management Page

```tsx
// pages/UserManagementPage.tsx

import { useState } from 'react';

import { UserList } from '../components/UserList';
import { CreateUserForm } from '../components/UserForm/CreateUserForm';
import { UpdateUserForm } from '../components/UserForm/UpdateUserForm';
import { UserOutput } from '../types/user.types';

type ModalType = 'create' | 'edit' | null;

export const UserManagementPage = () => {
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<UserOutput | null>(null);

  const handleCreateClick = () => {
    setModalType('create');
    setSelectedUser(null);
  };

  const handleEditClick = (user: UserOutput) => {
    setSelectedUser(user);
    setModalType('edit');
  };

  const handleCloseModal = () => {
    setModalType(null);
    setSelectedUser(null);
  };

  return (
    <div className="user-management-page">
      <header className="page-header">
        <h1>Quản lý User</h1>
        <button onClick={handleCreateClick}>+ Tạo User</button>
      </header>

      <UserList
        onSelectUser={(user) => console.log('Selected:', user)}
        onEditUser={handleEditClick}
      />

      {/* Create Modal */}
      {modalType === 'create' && (
        <Modal onClose={handleCloseModal}>
          <CreateUserForm
            onSuccess={handleCloseModal}
            onCancel={handleCloseModal}
          />
        </Modal>
      )}

      {/* Edit Modal */}
      {modalType === 'edit' && selectedUser && (
        <Modal onClose={handleCloseModal}>
          <UpdateUserForm
            memberId={selectedUser.id}
            onSuccess={handleCloseModal}
            onCancel={handleCloseModal}
          />
        </Modal>
      )}
    </div>
  );
};
```

### B. Dependencies

```json
{
  "dependencies": {
    "@apollo/client": "^3.8.0",
    "@tanstack/react-query": "^5.0.0",
    "react-hook-form": "^7.48.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0",
    "date-fns": "^2.30.0",
    "react-toastify": "^9.1.0"
  }
}
```

---

## Liên hệ

Nếu có câu hỏi về API, vui lòng liên hệ:
- Backend Team: backend@company.com
- API Documentation: /graphql (GraphQL Playground)
