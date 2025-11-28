export const MEMBER_TYPE = {
  SALES: 'SALES',
  SUPPORT: 'SUPPORT',
  LEADER: 'LEADER',
  ADMIN: 'ADMIN',
};

export enum MEMBER_GRADE {
  STAFF = 'STAFF', // Nhân viên
  DEPUTY_MANAGER = 'DEPUTY_MANAGER', // Phó phòng
  MANAGER = 'MANAGER', // Trưởng phòng / Quản lý
  DIRECTOR = 'DIRECTOR', // Giám đốc
  CTO = 'CTO', // Giám đốc công nghệ
  CEO = 'CEO', // Giám đốc điều hành
  COO = 'COO', // Giám đốc vận hành
}

export const MEMBER_GRADE_OPTIONS = {
  grades: MEMBER_GRADE,
  options: [
    {
      value: MEMBER_GRADE.STAFF,
      color: 'blue',
      label: 'Nhân viên',
      position: 1,
    },
    {
      value: MEMBER_GRADE.DEPUTY_MANAGER,
      color: 'green',
      label: 'Phó phòng',
      position: 2,
    },
    {
      value: MEMBER_GRADE.MANAGER,
      color: 'purple',
      label: 'Quản lý',
      position: 3,
    },
    {
      value: MEMBER_GRADE.DIRECTOR,
      color: 'red',
      label: 'Giám đốc',
      position: 4,
    },
    {
      value: MEMBER_GRADE.CTO,
      color: 'orange',
      label: 'Giám đốc công nghệ',
      position: 5,
    },
    {
      value: MEMBER_GRADE.CEO,
      color: 'gold',
      label: 'Giám đốc điều hành',
      position: 6,
    },
    {
      value: MEMBER_GRADE.COO,
      color: 'teal',
      label: 'Giám đốc vận hành',
      position: 7,
    },
  ],
  labels: {
    EN: {
      STAFF: 'Staff',
      DEPUTY_MANAGER: 'Deputy Manager',
      MANAGER: 'Manager',
      DIRECTOR: 'Director',
      CTO: 'Chief Technology Officer',
      CEO: 'Chief Executive Officer',
      COO: 'Chief Operating Officer',
    },
    VI: {
      STAFF: 'Nhân viên',
      DEPUTY_MANAGER: 'Phó phòng',
      MANAGER: 'Quản lý',
      DIRECTOR: 'Giám đốc',
      CTO: 'Giám đốc công nghệ',
      CEO: 'Giám đốc điều hành',
      COO: 'Giám đốc vận hành',
    },
  },
};

export const MEMBER_TYPE_OPTIONS = {
  types: MEMBER_TYPE,
  options: [
    { value: MEMBER_TYPE.SALES, color: 'blue', label: 'Sales', position: 1 },
    {
      value: MEMBER_TYPE.SUPPORT,
      color: 'green',
      label: 'Support',
      position: 2,
    },
    {
      value: MEMBER_TYPE.LEADER,
      color: 'purple',
      label: 'Leader',
      position: 3,
    },
    { value: MEMBER_TYPE.ADMIN, color: 'red', label: 'Admin', position: 4 },
  ],
  labels: {
    EN: {
      SALES: 'Sales',
      SUPPORT: 'Support',
      LEADER: 'Leader',
      ADMIN: 'Admin',
    },
    VI: {
      SALES: 'Bán hàng',
      SUPPORT: 'Hỗ trợ',
      LEADER: 'Trưởng nhóm',
      ADMIN: 'Quản trị viên',
    },
  },
};

export enum MEMBER_STATUS {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
}

export const MEMBER_STATUS_OPTIONS = {
  statuses: MEMBER_STATUS,
  options: [
    {
      value: MEMBER_STATUS.ACTIVE,
      color: 'green',
      label: 'Hoạt động',
      position: 1,
    },
    {
      value: MEMBER_STATUS.INACTIVE,
      color: 'gray',
      label: 'Không hoạt động',
      position: 2,
    },
    {
      value: MEMBER_STATUS.BLOCKED,
      color: 'red',
      label: 'Bị khóa',
      position: 3,
    },
  ],
  labels: {
    EN: {
      ACTIVE: 'Active',
      INACTIVE: 'Inactive',
      BLOCKED: 'Blocked',
    },
    VI: {
      ACTIVE: 'Hoạt động',
      INACTIVE: 'Không hoạt động',
      BLOCKED: 'Bị khóa',
    },
  },
};
