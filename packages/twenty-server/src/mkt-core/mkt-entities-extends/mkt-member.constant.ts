export const MEMBER_TYPE = {
  SALES: 'SALES',
  SUPPORT: 'SUPPORT',
  LEADER: 'LEADER',
  ADMIN: 'ADMIN',
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
