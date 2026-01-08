export const MKT_EMAIL_DATA_SEED_COLUMNS = [
  'id',
  'from',
  'to',
  'subject',
  'body',
  'sentAt',
  'status',
  'emailType',

  'position',
  'createdBySource',
  'createdByWorkspaceMemberId',
  'createdByName',
];
export const MKT_EMAIL_DATA_SEEDS = [
  {
    id: '7135e86d-5722-4161-8df4-cafd1177528f',
    from: 'from@example.com',
    to: 'to@example.com',
    subject: 'Subject here',
    body: 'Email body content here.',
    sentAt: new Date('2024-01-01T10:00:00Z'),
    status: 'SENT',
    emailType: 'MARKETING',

    position: 1,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Admin User',
  },
];
