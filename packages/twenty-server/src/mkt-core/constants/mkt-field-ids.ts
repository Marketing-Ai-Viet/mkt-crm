/**
 * /!\ DO NOT EDIT THE IDS OF THIS FILE /!\
 * This file contains static ids for standard objects.
 * These ids are used to identify standard objects in the database and compare them even when renamed.
 * For readability keys can be edited but the values should not be changed.
 */

export const MKT_I18N_FIELD_IDS = {
  // fields
  name: '28fa2754-f1c3-4b11-a269-a36ca7a8574a',
  mktFieldId: 'd04ad2af-936b-40ca-a3b9-2d35807eb033',
  key: '227440cc-d0c9-4616-8f6a-f8f482511047',
  locale: 'b8ba3d76-e908-40f0-adc4-78c7d36a86c4',
  data: '000e0e26-8fbb-43db-ace4-8a9890934538',
  description: '2b9549f7-ad48-47cf-b7b4-8a4a0de6a388',
  // relations
  // common relations or fields
  position: '847de9f1-5aea-47de-a9d5-b3701eba6daf',
  createdBy: '15d7afda-47c0-4422-afba-8e43ade1c6c3',
  accountOwner: '99fc1e4e-425a-4d5f-9fa6-f837355fbbec',
  timelineActivities: '0a785ab3-233d-4965-9d46-b8e8f627684f',
  searchVector: '462f1388-6a72-414e-97ca-d3122df17d49',
};

export const MKT_OPTION_FIELD_IDS = {
  // fields
  name: '37236f76-8172-4f20-9216-201e6ca2e25e',
  key: 'f275f4c8-431f-4801-87b7-07dbdbd8c292',
  value: 'ddcfbddd-52fb-4b3c-abf4-e2b7c7a9e08f',
  description: 'bc7799a4-b05f-43c9-8016-c252868d3737',
  metadata: 'd3346a07-5da8-4775-9619-fadf1bf6dd75',
  // relations
  // common relations or fields
  position: 'a581e2e2-6c2e-46f9-9881-3ea9c2eda802',
  createdBy: 'ebd45eb0-2004-458a-a3e9-ca6e3119a728',
  accountOwner: 'e0791957-1f27-4f12-9a46-4de07a46c392',
  timelineActivities: 'cec7d59e-7930-4497-bf0f-24de9697cf32',
  searchVector: '87ba0d45-b282-44fd-a929-8c98384f0502',
};

export const MKT_CUSTOMER_FIELD_IDS = {
  // fields
  mktWorkspaceId: '3393c870-41c7-4efd-b57a-cb497569a30a',
  mktCustomerCode: 'b4c82d9d-c204-4ef1-a636-0c9f2779c1ff',
  type: '204aef63-5db1-43d4-b1d6-d01f36df5558',
  userId: '334fcd0c-c83f-4249-8590-7b81c1e8838c',
  syncStatus: 'aee059bf-3d61-4eb8-8ae7-22d92864c0be',
  contracts: 'c0964873-b9ec-4692-93fa-29233809f5af',
  //basic_info
  name: 'bc3ac7d1-2e1c-4fe0-a43d-0fa961552cb6',
  companyName: 'b10c1418-0f38-4f63-8363-b7fbf3f7dd94',
  companyShortName: '93a7137b-ed7a-4b18-9562-4b50cbd9b17e',
  email: 'fbd13f57-d03b-48c4-9e23-ef6c0a412244',
  phone: '9e0b45ef-5ca8-4d71-a087-96aae069287f',
  taxCode: '57685c22-fab6-4be8-85b2-5e4420274698',
  //business_info
  address: '35ce5702-4618-4488-8e00-5d78a96596c3',
  website: '27926764-1e7d-4270-9166-5cbf7168ed6b',
  companySize: '88518a1b-9972-4e92-a069-f8633f14eb1b',
  industry: 'be335fd5-11b0-433a-b08c-93bf2770461a',
  legalRepresentative: 'de344573-4d20-4454-921b-6f29b8a5cb46', //"name": "Nguyễn Văn An", "id_number": "012345678901", "position": "Giám đốc"
  //system_info
  status: '805eddee-a726-41c2-a996-74c3f976b2cc',
  tier: '4103c22a-f604-4f24-aa53-799cb97ce6d0',
  lifecycleStage: 'dae0670f-1e04-407b-bc1e-e8c40c9834d7',
  registrationDate: '7fb838c4-c6d2-4965-9685-3aa15f861aab',
  tags: '91d6687b-a5a5-490c-ba07-970c6dce9d9b',
  //tracking_info
  licensesCount: '049fb64d-b2bd-455d-9a9a-0696c504cad4',
  totalOrderValue: '3142cb73-ef17-4d43-87e5-d32551bea490',
  lastPurchase: '80667a1e-286e-454b-aef7-79fad59c32cc',
  customerLtv: 'c157a7d7-5fa7-429a-a302-6976833a1bd4',
  churnRiskScore: '04537b93-1bb2-47d7-b5b6-46f37c07dc4b',
  engagementScore: 'fa17e8e2-a908-48c0-aad6-81a220a99946',
  //other_info
  notes: '5083861a-a392-49bb-96fc-18058d4edb52',
  //assignment
  assignedDate: 'a378fa80-0e59-4d27-bced-2f6fc41d0deb',
  assignmentReason: '28c2efa3-ed29-4878-9a0e-116aa9327bc8',
  // relations
  salesId: '78be7072-50eb-4edc-81fc-c3e25658d7bd',
  supportId: 'a1ed4146-269d-46a5-ac7e-7cba043974e1', //support_backup_id
  affiliateId: '940e3766-a147-4cf4-bd50-805b1c8c8880',

  mktLicenses: '4ac28e1a-089a-45d3-9725-b40861e98b15',
  mktCustomerTags: '697d8df5-d0a2-4d28-af51-bfa55be23934',
  mktOrders: 'bdfc3b4f-96a0-4a3c-bd6f-d7845367588e',
  // common relations or fields
  position: 'e3ca3ebd-4812-4c82-abde-e14b13a01829',
  createdBy: '4e6d0176-22f4-4b25-bbf2-0a3ed6d7a5e1',
  accountOwner: '0ccf0130-8651-4165-b061-a1d1c3bd7aa7',
  timelineActivities: '78be7072-50eb-4edc-81fc-c3e25658d7bd',
  searchVector: 'a1ed4146-269d-46a5-ac7e-7cba043974e1',

  // personal_info
  personalIdNumber: 'b0a84eb5-ab93-4c2e-990a-b3f47953b51f', // CCCD/CMND

  // payment_info
  billingAddress: '5d298c21-9f32-4670-a9ef-8123b8f8a201', // billing address
  bankInfo: '1b7c2cae-e65e-43f5-b061-2e416a4e2b2d', // JSON: {bankName, accountNumber, swiftCode}
  paymentPreferences: '3a2aba2c-a36d-4117-af00-8e0929148f2e', // example: "credit_card", "bank_transfer"

  // social_info
  fanpage: 'e6cf2880-144d-4dff-bd9f-d4eecb822e59', // Facebook page or social link
  socialLinks: 'd49e183d-0fbc-40a6-93cd-8cf653822ac5', // JSON: {facebook, linkedin, zalo}

  // tracking_info
  trialStatus: '95e58f9f-5281-4df9-9e38-cfcad2acd808', // Current/Expired/Converted
  customerAcquisitionCost: 'acaca736-9651-423e-a1d4-1a79936020b0', // CAC

  // assignment_history
  assignmentHistory: '434bbfb7-6bc5-40f8-8726-06aa7812269d',
  // JSON array [{salesId, supportId, reason, assignedDate}]

  // validation_info
  emailValidated: 'c6bfeb94-d822-457a-87d9-c8e4db6b4317', // boolean
  phoneValidated: '1ff58d4d-9c10-45a1-a7b2-42f6d83dccd2', // boolean
  idNumberValidated: '3afb4d6f-2e95-42f9-9297-6dbc70242e82', // boolean
  taxCodeValidated: 'e3ea4d21-09a0-4f2a-872e-4f00cd7a621c', // boolean
  mergeSuggestion: 'ee1d2375-75fc-4575-8374-18120e31d740', // JSON: suggested duplicate customers
  promotionUsages: '660e8400-e29b-41d4-a716-446655440604',
  assignedCoupons: '660e8400-e29b-41d4-a716-446655440605',
  // external account integration (multiple providers: MKT, Google, Zalo, etc.)
  // primary account tracked via isPrimary field in linkedAccounts JSONB
  linkedAccounts: 'a8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d',
  // tier tracking
  lastTierUpgradeAt: '6c5d17a0-d4a6-4bba-8066-55e331009bac',
  totalOrderCount: 'f7a8b9c0-d1e2-4f3a-5b6c-7d8e9f0a1b2c',
  // tier history relation
  tierHistories: 'ae500603-0b5b-48fa-91e4-551567375edd',
  // Sprint 1: Core Customer Management
  firstPurchase: '490d2d3b-d4b9-4f92-9fd4-6a3022b129e7',
  supportOwner: 'f1533fdb-f64f-4873-ac33-21386e12c4be',
  // Sprint 2: Customer Notes
  customerNotes: '5855b6a6-d7c4-46da-9631-68801d0c634f',
  // Sprint 3: Business Information
  contactPosition: '53b545dd-372c-42bc-a147-6efa828cd03b',
  contactDepartment: 'c0290c2e-020e-421f-9ea2-5bbb9d966bd7',
};

export const MKT_CUSTOMER_NOTE_FIELD_IDS = {
  // fields
  content: 'adab9c56-6fdc-42ee-b26a-65e82c9d8e88',
  noteType: 'b9a533d3-011c-49ad-9c90-b72017ef975f',
  // relations
  customer: 'fd6a6347-65a0-4388-98d1-cbbb344ba462',
  // common relations or fields
  position: '0639d9b8-9ba6-4a7c-b09f-51e1e1abb618',
  createdBy: 'a068ddbf-deee-4f2c-81b6-0a31b3ed50c7',
  searchVector: 'dbb2796c-6480-497c-b73b-63933900b6c7',
};

export const MKT_TAG_FIELD_IDS = {
  // fields
  name: 'a6346e30-e700-44bf-96b8-61dac09c59f8',
  type: 'eeef941e-7826-4152-88c9-ab203f445076',
  labelVn: '76b923d6-161b-43fe-8080-9e867f09f957',
  labelEn: '602bbd3b-4a87-4215-bf00-835ee901ddc0',
  // relations
  mktCustomerTags: '7af63ac8-fadc-4f13-a510-d2e7c397bd2a',
  // common relations or fields
  position: 'c22a8a2e-9d4d-4962-93bf-1d934a36afb5',
  createdBy: '3be70054-87f5-48ad-92b0-db3da8bd5e6f',
  accountOwner: '0a057a17-d56b-4d9d-8c2d-a00296205f71',
  timelineActivities: '0c94dd56-b58b-45ed-9027-5f7d33f64c52',
  searchVector: '69822d19-a1d9-453d-ada4-2fbfe3d59a55',
};

export const MKT_CUSTOMER_TAG_FIELD_IDS = {
  name: '0d6158ca-37b5-4976-9ace-add1e0021079',
  // relations
  mktCustomer: '1b94d69b-c19b-4f3d-808a-e3e170c3bfba',
  mktTag: 'c4ce5adc-e3cb-4d5b-98f9-f32d879376ee',
  // common relations or fields
  position: '1ebaa8e0-b02f-498a-b6b6-7f2c9b24b27f',
  createdBy: '768ae5f7-aedc-452a-8a28-cea7a7114a85',
  accountOwner: '8432f68e-f035-4317-aa0a-9e87e85c0298',
  timelineActivities: '5f453d37-6166-466c-ba07-0caa2b9e6f74',
  searchVector: 'e7145f31-c1d1-421d-be08-1b183ef7ae8a',
};

export const MKT_ORDER_FIELD_IDS = {
  //fields
  name: 'a5faa4d8-e788-465f-811b-a311d07c0aa2',
  orderCode: 'b6db3443-3b87-4fad-b27f-77ec6eb6e57a',
  status: 'c384db65-a8ae-436f-a3c0-63175c91bd53',
  totalAmount: '3d9ea0ed-00bf-4626-bb2a-659d80c39107',
  currency: 'c7d46917-51ff-4dc3-a81e-6937e6f245ea',
  note: '60377888-15dc-42df-b868-5015a1f43c2e',
  requireContract: '3bc491e5-3e65-44d4-97d5-f71300ab3d41',
  subtotal: 'a54ffe1f-a15e-471a-b644-f2a8f6396863',
  discount: '97e1ed20-01ba-48f0-b3b9-15eca354a115',
  refundAmount: '89bb731b-1e21-4279-9ab2-9e0bef878e6e',
  discountPercent: 'd832fc15-950e-4c94-83b2-864e6dc3b904',
  tax: '86a4bf34-9808-4908-b2d6-65cb4d146bc0',
  sInvoiceStatus: '3986dded-a1f3-4f53-9c2a-8e67d1af8cd3',
  licenseStatus: 'd3a61b4a-87d1-41de-ba40-81d0a27bcd10',
  trialLicense: '3449bef1-e719-42d9-8cf6-df3f5d47983c',
  metadata: '82d2986b-ab3c-4563-9d24-e04d42caea0b',
  accountingConfirmed: '7fdf7924-7a90-4ee6-ac9e-523b7dccb920',
  // Multi-payment fields
  paidAmount: 'a6943c80-069a-438b-b505-e8446cd332fc',
  remainingAmount: 'a66a7b25-1ebf-4441-aa7a-8e9d43e38334',
  paymentStatus: 'b218125d-23a4-4627-853d-c9f836646895',
  // relations
  mktContracts: '66277a67-41c6-4709-820f-dda8df091ae9', // ONE_TO_MANY relation with contracts
  mktLicense: '837f7353-df5d-449a-961c-fef566d663b9',
  mktInvoices: '0d4664c7-90ef-491a-8a34-02cdf51ef518',
  items: '5c818b2a-bd61-4423-b1bc-ac89781f4324',
  person: '4d6b6ef3-6d6b-4323-9e4f-a7f01d97e68d',
  mktComboVariants: '28a25b7e-3b7e-4746-ac46-7ac7a2a1d67b',
  mktSInvoice: 'c53bbfe4-0c46-42ac-99a7-f24df8ef56a7',
  mktCustomer: '631879f5-0017-4df2-aa29-124dd38197bf',
  mktPayments: '06240e4d-a9ab-4dcb-b3e9-0bbdf2085242',
  mktOrderHistories: '55e1c6c5-d27b-45c6-8978-956a37be205e',
  mktPaymentHistories: '4d1ad383-7178-43a4-9720-a4e76278f372',
  //common relations or fields
  position: '9d970deb-f1e5-4cc4-8b36-9ad83ca03ee5',
  createdBy: '6d52adfa-9230-4df0-84fc-d51c646e8538',
  accountOwner: '26791ba0-12ef-4596-a659-f096106bc868',
  timelineActivities: '5ddc8d4c-e8f3-4b36-a367-3b812d9f7d02',
  searchVector: '68623375-43f6-49ed-b29f-291f4cd34921',
  orderItems: '1a2b3c4d-5e6f-7890-1234-567890abcdef',
  promotionUsages: '660e8400-e29b-41d4-a716-446655440603',
  // Promotion fields
  couponCode: '631e7f75-b806-447b-81d2-18cc42fb2042',
  promotionDiscount: '4be6781b-b704-406f-9f24-dc9d5607fcf8',
  appliedPromotions: '0165b922-6861-42c4-a905-12699c9e526f',
  // Combo fields
  appliedCombos: '281b870e-b751-42b6-b95a-252170849084',
  comboDiscount: '68ca63d5-0d37-479b-94fc-15b95dd69a98',
  // Payment deadline fields (for new payment flow)
  paymentDeadline: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  paymentDeadlineSource: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
  lockedAt: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
  lockedReason: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
  remindersSent: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
  lastReminderAt: 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c',
  // Optimistic locking
  version: '0af4e91b-b1d5-4f7e-bffd-04e731c14802',
};

export const MKT_ORDER_ITEM_FIELD_IDS = {
  // fields
  name: 'f1e2d3c4-b5a6-9786-5432-109876543210',
  quantity: '2b3c4d5e-6d70-8192-3456-789012345678',
  unitPrice: '3c4d5e6f-7081-9293-4567-890123456789',
  totalPrice: '4d5e6f70-8192-a3b4-5678-901234567890',
  snapshotProductName: '3c3f5fdd-434f-4f02-aa07-59f1df4dd241',
  unitName: 'a7bf1c2e-ed32-46bd-a1c9-337d7bb09f42',
  taxPercentage: '83bcdbfe-21a1-47dc-b734-564586e52807',
  taxAmount: '2b69aed9-7a4a-472d-8966-fe6162aafa30',
  totalAmountWithTax: '47e19201-d41f-43e2-89a0-beeb0da30731',

  // External MKT Product fields (from MKT Server)
  externalMktProductId: '08c49fb4-dcc4-4015-bc23-14cf525502b8',
  externalMktProductCode: '8cb472c9-9810-45d5-bda4-6de5cdd4a207',
  externalMktPackageId: '79afd095-f1ce-4297-a222-fd0e8c563285',
  externalMktPackageCode: '1aa9ffbe-e0d7-40f8-a498-f6de75effc2e',
  snapshotMktProduct: '9d4213c6-5a0e-4478-9835-a57a9858fcac',
  snapshotMktPackage: 'a9763746-b410-4822-8228-a1b3aaf3366c',
  snapshotPackageName: 'db2c5492-eb14-477e-a9e1-94d009d7da7b',
  orderLanguage: '35d900f3-d659-42f1-91c1-dfca25a8733d',

  // External MKT License fields (from MKT Server)
  licenses: 'a8e2c7f1-3d5b-4a9e-8c6d-2f1e0b9a8c7d',
  // License configuration
  maxDevices: '4aa5bb85-50f3-45b0-bc7e-df41930b6350',

  // relations
  mktOrder: '7081a3b4-c5d6-e7f8-8901-234567890123',
  mktProduct: '81a3b4c5-d6e7-f890-9012-345678901234',
  mktVariant: '63c0be01-54b2-4b5e-b24c-7879c881b479',
  mktCombo: '45c7d839-e7f7-44db-9d86-37dc84415dd5',
  // Promotion discount for item
  itemDiscount: '684661fb-6376-473b-a16e-f0315a24816f',

  // Combo-related fields
  itemSource: '225eff6b-a697-4e54-a0cf-86b54965f37e',
  itemType: 'eb271f8f-ae93-43ab-b70d-d4b10d14e067',
  sourceComboId: '4835fa8e-85c4-4bf8-8a6e-b5e4d787ac61',
  sourceComboItemId: '91f4be4e-4540-4e98-bc74-9ecb80767e57',
  comboItemSnapshot: '3110b6dc-0e0d-4c19-bfc4-e19e88e48e00',

  // Internal product/variant snapshots (for INTERNAL_PRODUCT/INTERNAL_VARIANT types)
  internalProductSnapshot: 'f7c3a8e2-1d4b-5c6e-9a0f-b2c3d4e5f6a7',
  internalVariantSnapshot: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',

  // common relations or fields
  position: '5e6f7081-9293-b4c5-6789-012345678901',
  createdBy: '6f708192-a3b4-c5d6-7890-123456789012',
  accountOwner: '9a3b4c5d-6e7f-8091-0123-456789012345',
  timelineActivities: 'a3b4c5d6-e7f8-9012-1234-567890123456',
  searchVector: 'b4c5d6e7-f890-1234-2345-678901234567',
};

export const MKT_ORDER_HISTORY_FIELD_IDS = {
  // fields
  name: '645579a8-fb14-4f2b-9711-dd637e6a9ba9',
  action: '0cf29f34-a34d-4855-add4-b96dcd54a04a',
  metadata: 'c2e0ac56-2641-4933-b277-568f0bff8e77',
  note: '40fd05f6-48b2-477e-b641-adb67d287ff7',
  oldValue: 'a959aca9-41d0-4c1f-ad5c-45d190ec020f',
  newValue: '52e959b5-7bc4-47aa-9387-732538ad7ef9',
  fieldName: '416d039b-1ce2-4196-bbe7-985a2a3001b1',
  position: '7e3539b2-4fc4-4035-b201-10cb0d16376b',
  createdBy: '7d4d8d61-3a9c-4530-868f-9cb980647ae7',

  // relations
  mktOrder: 'd2c85044-ae3f-4bac-8c9b-18d934782ef6',
  accountOwner: '0c9e64c4-da3d-46a1-ab8d-ec535a2e0f10',
  timelineActivities: '53e624f1-26da-41e8-83b5-090bb8fe455a',
  searchVector: 'f8801e93-ed5e-4dd0-9f13-e9987d891359',
};

export const MKT_REPORT_FIELD_IDS = {
  // fields
  name: 'd2dd1dd1-b45a-405d-8472-0a4f95bc50c0',
  reportType: '09372938-8d76-44f2-80de-639e5f32ec5b',
  metadata: 'bf5018be-7211-4096-b9fb-0aaa11f8cd2a',
  notes: 'c269b8a5-735a-4a16-b36f-d3b7ffd85c71',

  // relations
  // common relations or fields
  position: '8b8aeecc-bf80-4af9-a32a-a0c3100f42ab',
  createdBy: 'baa0cdb1-f773-446b-a3f2-023c0b563738',
  accountOwner: 'de4f5552-74c6-45f7-a76e-e8244654ce84',
  timelineActivities: 'ea1ba646-b085-4826-83ac-9a457f219f17',
  searchVector: '7d4aa9e8-af86-42fe-9ac8-d7f16fa1f00f',
};

export const MKT_INVOICE_FIELD_IDS = {
  name: 'e1f98b9c-a4df-4852-8b5a-817c2484d1e8',
  amount: '076ecd76-e7ec-40ba-a410-ce277b439109',
  status: '6104f95e-7bfb-4337-981f-ddbea7d180b4',
  vat: 'edd5c034-2fcd-4b61-b3fd-4ba07d59682b',
  totalAmount: 'ce102ddf-26af-4dd5-aa44-53aeab7a20eb',
  sInvoiceCode: '671561b1-ddf5-4a31-a66e-969135648638',
  sentAt: '0adeb47b-0c7d-43ec-890f-19ecf8e3714a',
  supplierTaxCode: '58422f09-b22f-4f60-bc18-1437dd94e1b7',
  invoiceType: '50ba3465-0697-4066-b257-b77899bae78b',
  templateCode: 'df3b3f45-f560-4a20-9f74-b39ec77040e9',
  invoiceSeries: 'f8c75e9d-2689-4f5b-a40e-7d0faee7c9e7',
  invoiceNo: '6c0702a9-36af-42ad-9b3d-e7d32d4806c1',
  transactionUuid: '36c6c1e3-1aab-4c50-b544-ccb13f5216f3',
  issueDate: 'ba5552fd-dfa7-44fd-b8e4-dc31c50fdd9a',
  totalWithoutTax: 'd0e3fb71-08a6-44f1-9cd7-46cc14963782',
  totalTax: 'cfd0765b-f7fb-4217-9244-92a81d520030',
  totalWithTax: 'e21d045a-8a27-4c46-a9c8-6cb96edb3fd0',
  taxInWords: '35214b59-87a5-4548-8b78-8e275629473f',

  // relations
  mktTemplate: '768581ac-7240-4fd1-bc4c-6a49445d8ad0',
  mktOrder: '3cf48a8e-fa6d-41c2-bcb9-302e90dbe03c',

  // common relations or fields
  position: 'faf1d878-72c2-4011-a76c-da088e6ad92f',
  createdBy: '752aed66-9ddc-4d25-b805-ceac7943788f',
  accountOwner: '244704b8-1beb-400e-be86-ebc92c165a07',
  timelineActivities: 'fafa89ea-f3d3-439e-a3c2-8d42939aa6e8',
  searchVector: '7df8f89a-374c-4ba1-8326-a8a78c5d6b6c',
};

export const MKT_SINVOICE_AUTH_FIELD_IDS = {
  // fields
  name: '6d2acb91-711f-498e-bb91-6c832928c62d',
  username: '2151a44d-8957-4c37-9dc2-b30cd30cfa26',
  password: '810a017b-ed7c-41f7-a813-bd9f13519c14',
  accessToken: '30ca3f13-1049-4df2-b3d8-65d988ba358a',
  refreshToken: 'fcfa152f-d0a1-47db-b542-d8b43153eff6',
  expiresAt: 'b49c491f-e184-4213-8562-0425c7adece2',

  // common relations or fields
  position: '4c20ed36-8702-44e6-b47b-4040fe38752c',
  createdBy: '678b9ac3-1def-434b-be29-26ae50d94e73',
  // relations
  accountOwner: 'aa5b5cf3-b7d9-45af-bdb9-6c1dc37c0b9a',
  timelineActivities: '51ea6895-e07c-42d7-bc95-f9d3cbd860ff',
  searchVector: '6b90048c-9ae3-4fc1-9723-55c95f55590b',
};

export const MKT_SINVOICE_FIELD_IDS = {
  name: 'e1a7ca79-ef83-4b4a-82a5-f2aef48772a4',
  //generalInvoiceInfo
  invoiceType: '0332915a-73f8-4318-b440-ed2aeaf339b7',
  templateCode: 'c54db1b5-e5e2-498b-abb3-b9ab1c9a41c0',
  invoiceSeries: '68e8f81a-779a-48de-ba59-b191bf1938c4',
  currencyCode: 'fcb8bed6-23de-40ca-935a-da7ffc9e48a0',
  exchangeRate: '36796f27-e8f9-47a3-8b14-e3c22e275da5',
  adjustmentType: '6ffb1b03-51a5-4c31-b100-c0e7fbb244cb',
  paymentStatus: 'ba26f355-4f83-4b92-82f2-1c1bafe6a3af',
  cusGetInvoiceRight: '7af5774a-fb30-4c5e-8223-e7affe3c008f',
  invoiceIssuedDate: '5154d339-54cd-4fd6-b127-678776d894dc',
  transactionUuid: '30b8a1d1-eec1-4d86-b49d-2c0fc3e26918',
  //buyerInfo
  buyerName: '93a00c01-fd9e-4453-b7f4-921a2870ef32',
  buyerLegalName: '2a189d77-3811-48ea-8d23-8e4178b10442',
  buyerTaxCode: '7910d294-c510-4c0e-ab2e-4cd5ceb8afba',
  buyerAddressLine: '4c32d772-3140-4132-a498-842418ef3133',
  buyerPhoneNumber: '105d1d68-7b65-48c3-a583-c70756ade3a7',
  buyerEmail: '0fdd4e32-d106-4a1c-91fd-555e27281d07',
  buyerIdNo: '275cbda2-3fc1-4f7c-b2db-191b171d4d90',
  buyerIdType: '38f23203-5f62-4a52-8af0-8647094127d8',
  buyerNotGetInvoice: 'c48f2a55-d06a-48b8-bf22-f38de9d8188a',

  //relations
  mktSInvoicePayments: 'd9d177b1-4ee0-4b2a-a13b-04002ac33429',
  mktSInvoiceItems: 'fbca73ac-126e-4ace-bd51-dd3a84548ef3',
  mktSInvoiceTaxBreakdowns: 'c4739855-bd2e-4b77-b17b-35c21958304e',
  mktSInvoiceMetadata: '34af692b-5ae6-473d-bd9c-ca873b5e96b8',
  mktSInvoiceFiles: '2e61ea3d-df09-45bb-b8fd-57369235cc93',
  mktOrder: '9c7e7a37-86c3-4374-9ec7-283a6f076f8a',

  //summarizeInfo
  sumOfTotalLineAmountWithoutTax: '53e5992f-0aa3-4d20-98bf-1db3b0e2ed3a',
  totalAmountAfterDiscount: '53359824-1975-4116-a3a0-c6b0837c694f',
  totalAmountWithoutTax: '18ecffe4-7351-4159-88aa-e826d6a41133',
  totalTaxAmount: '22a8ec38-c86a-4c7e-ae91-2b9864d3fef3',
  totalAmountWithTax: '46e1bbd9-5b50-42ab-8e07-dbbe001d79e9',
  totalAmountWithTaxInWords: 'f6c8fe49-d4e9-4825-9f72-d8b93757268d',
  discountAmount: '17f9ab0c-4f8e-4600-8957-1eb031a22972',
  //metadata
  //response
  description: 'e0fae56d-d95c-4d36-9f9e-db6b14335c4c',
  supplierTaxCode: 'd654ef6f-cce3-4d76-9444-a6eabdcf5820',
  invoiceNo: 'bebea4a9-b029-418e-9125-1793761cf5ee',
  transactionID: 'be239bcf-19c7-4c6f-b38d-bf5b3bf15575',
  reservationCode: 'ba9da2a8-12f7-4018-8c96-a6af270ef884',
  codeOfTax: 'b2058784-d824-41e5-a838-3aace9b6b946',
  //errors
  errorCode: 'f36110d9-b4a3-48cd-ba4f-a9dfd2e488c7',
  errorMessage: 'a093e941-b901-47be-85f7-835ef2b54bcb',
  errorData: 'e7b188dc-7f46-4445-9c2d-17f1bd7b6385',

  //common relations or fields
  position: '92284b0a-e2b4-4c57-b849-6c0a50fec818',
  createdBy: 'ca00de3f-7745-44f5-8ca8-6c368b5623c8',
  accountOwner: '20707cec-f627-43c4-8a43-dcad9ead4cb0',
  timelineActivities: '2e6206a2-5a43-425d-8529-062ba37846e7',
  searchVector: 'dfcbc3e6-4d1b-4c29-aece-e5e6570fbd69',
};

export const MKT_SINVOICE_PAYMENT_FIELD_IDS = {
  //fields
  name: '75a3e242-a154-4b25-8fb5-cb893a6ddd47',
  paymentMethodName: 'a1d46e66-74c4-4741-bb5f-a9bf5482717e',
  amount: '64af82c4-84da-4ab5-a078-ec4ce6f24c7c',
  currency: '6d536048-84b8-4f5b-8b44-9783e046b81a',
  status: '94b60586-cda3-44d8-ae4b-7d2458bba76d',
  paymentDate: '94e366c1-3c14-4fe4-9803-51c8a95cf8c1',
  description: '87fecc02-60b6-4de0-955b-27d05a47949a',

  //relations
  mktSInvoice: '9ff83a4c-46d0-4f7b-bf50-19ed9ef9ed8a',

  //common relations or fields
  position: 'd12f0fda-e756-4422-837d-5452679eae7b',
  createdBy: '94d6c748-ae10-484b-9ab7-fb0434666f5c',
  accountOwner: 'c1850749-c9fb-4d96-a534-e8cbb5589a80',
  timelineActivities: '31d10198-139f-422c-b5f8-cfe5984472c5',
  searchVector: 'ffdf4ab1-f0d4-4302-8b20-83b44b0821bf',
};

export const MKT_SINVOICE_ITEM_FIELD_IDS = {
  //fields
  name: '4315b8dd-d2cc-4082-a850-ae5b593457df',
  lineNumber: 'e87ec8d3-0a83-42d4-b070-0af4da157ee0',
  selection: '1e2700a2-b601-4687-829d-c9b7afadc1ea',
  itemCode: '9c61785c-44de-4934-93d9-1fd41ea7e528',
  itemName: '9d83f750-8264-4c31-b653-60623d74d30e',
  unitName: 'a7d91ceb-b8d8-44ad-84e7-b4fa6472706c',
  quantity: '72545991-627d-4b68-aa7c-0cc64af74fca',
  unitPrice: 'db900531-a7da-44f3-bdd0-03a4d092fbd8',
  itemTotalAmountWithoutTax: '679b543c-93ec-4598-bf57-1b03b569c5d9',
  itemTotalAmountAfterDiscount: '2d9ef20a-9f5a-4010-8f3a-773d2e431c96',
  itemTotalAmountWithTax: '0a4ccf05-b623-41db-aadf-7d46ae212b16',
  taxPercentage: '28dd5e45-645c-4e88-85e1-f4057e22f8d4',
  taxAmount: '431e1915-3036-4e47-bd34-f958bde92e56',
  discount: '70b7fdde-597b-4ef2-b7fb-15e60def6b7a',
  itemDiscount: '362072d3-f464-49f5-bf80-d91f9bdca9af',
  itemNote: 'e7f247fb-7c33-4767-9369-2c26d3cd5c4c',
  isIncreaseItem: '0adc66c2-979b-489c-aaf3-2211943b7cd1',

  //relations
  mktSInvoice: 'dd83fb41-a390-4b26-a164-72ca621c4b1e',

  //common relations or fields
  position: '105c9a0a-5df3-416b-b3ec-913ea170619b',
  createdBy: 'c4f739b7-0382-4b69-8509-77e7ad92353b',
  accountOwner: 'e89b7b94-4a97-4add-96b2-29347c28ae5c',
  timelineActivities: '6decd6f1-dd12-4e83-9a2b-bca342d1b3ff',
  searchVector: 'c288a042-4a04-4da2-8d57-a3944aaaac36',
};

export const MKT_SINVOICE_TAX_BREAKDOWN_FIELD_IDS = {
  //fields
  name: 'd9214a4c-cece-49d8-a211-c46a2e5546ef',
  taxPercentage: 'e6809b0f-d749-4fda-a72a-ef731fac23ff',
  taxableAmount: 'fb1bdce3-7a24-44f5-aa48-25f2519b6ce6',
  taxAmount: '98e207cb-914b-4d93-9121-66f40a8a32b6',

  //relations
  mktSInvoice: '0738b823-e440-40d5-a378-1988f66f3841',

  //common relations or fields
  position: '53df9018-5286-4542-9942-ee08c2ad1872',
  createdBy: '0f199217-46d8-4567-b113-d9b0768f54a7',
  accountOwner: 'd68ee01a-0c99-4919-916d-ac0aee4f8226',
  timelineActivities: 'ff162819-004a-465e-ac6e-4faf3601b881',
  searchVector: 'b4c7d72b-d84b-4abd-bb71-27d13cf9b38b',
};

export const MKT_SINVOICE_METADATA_FIELD_IDS = {
  //fields
  name: '59abd231-7e18-4980-891d-0740a5422f56',
  keyTag: '41c752b6-6029-447f-be3a-7516daab6541',
  stringValue: 'f415bac0-a04f-47b6-ac32-dd8e10b2eeaa',
  valueType: '5b902365-faab-4a22-9fa3-77d638e0ea3b',
  keyLabel: '10ac367b-769b-4273-ae0e-4fcee5295572',

  //relations
  mktSInvoice: '0870fec6-3d6e-4012-b1ea-8283d4f964b3',

  //common relations or fields
  position: '49ec535d-44e8-4bbc-9dc4-8d0d48a6bbc5',
  createdBy: '68fb79ac-97a5-4abc-95b2-0d8fff9d13bf',
  accountOwner: '38d029ef-d8d6-486a-acb5-c22fd648f1d5',
  timelineActivities: '78bc2be1-6a50-4abf-9be7-5bca69597907',
  searchVector: 'd8f8bc60-8cf2-4017-addf-e6165d10d163',
};

export const MKT_SINVOICE_FILE_FIELD_IDS = {
  //fields
  name: '376ccf4e-750d-46fa-bbad-e8c539b681bd',
  //input fields
  supplierTaxCode: '5cd5a395-9268-469e-baad-06dbf359a42d',
  invoiceNo: 'bd8bf517-634d-4e81-8132-864d39b43b4b',
  templateCode: '4e0cd8ab-0797-4f08-9b63-b1ab80a90d47',
  fileType: '92112290-485e-4d77-83e6-d7a358cfd693',
  //download fields
  fileName: '241a77a4-2dfd-4c6e-8e6b-743a8be83698',
  //fileType
  fileSize: '187a9e86-d198-443c-bf0a-8e1ae72499c0',
  filePath: '232e077e-fec8-44c9-8aa7-a1bb4bed1678',
  downloadUrl: 'dec589e7-a389-4a31-b493-011ecd4cdf93',
  downloadCount: 'c76d77b3-4062-4807-86f5-2f6eefbaed30',
  lastDownloadedAt: '070ad544-d816-400f-a75f-d2cd79d64197',
  status: '89829539-5c85-40d1-8c8c-05e586020d2a',
  errorMessage: '406ca8d8-ad81-4f3c-9bf4-fcb0d0497e47',

  //relations
  mktSInvoice: 'a128856e-e82b-4c8b-95ac-bfb39af1398c',

  //common relations or fields
  position: 'df5c788f-cb53-44f8-b962-c8105cdc7e70',
  createdBy: '0070d18d-02de-4af7-b47c-358f1e44728a',
  accountOwner: '4066e9da-e868-46d1-b780-39019b2ecbdd',
  timelineActivities: 'd7a20b96-c097-4c3a-9c3c-16abed770ae4',
  searchVector: '1a8c06d0-3417-4694-baf5-387fd7bfc20f',
};

export const MKT_TEMPLATE_FIELD_IDS = {
  //fields
  name: '9b5a19c7-fa6c-4a31-ab8f-7e0e83fb678b',
  type: '35760f3b-3bb8-48df-9eef-1ca4c05f12c7',
  templateKey: 'abca0b71-1c05-40e7-96c1-42ea8aa32573',
  subject: '4328ed8f-1534-43c2-a7ae-08de53ae0963', // Email subject (for EMAIL templates)
  content: '3a3b49a8-6fed-4f99-a8c2-d3df9a4efa09',
  version: '2e6ade87-6f35-4dbc-8eb0-c3f4b25dc5c8',
  metadata: '23fd709e-e187-46d3-aafd-55d90f2c1424',
  locale: 'df08c10e-6508-4e21-a62a-f836b74f017d',
  isActive: 'd1fca958-b67f-4892-8e2c-c5f67fedcc26', // Active status

  //relations
  mktContracts: '5ff3cd2e-32f0-48f8-8196-2c879e15e7b8',
  mktInvoices: '6b51b55c-e22c-4472-91a8-c9e920cf942b',
  mktPayments: '628a90c0-85fb-44ae-b501-2f07cbd6b25f',
  //common relations or fields
  position: '81ba7aae-3b8f-41b0-891a-dc0d003d52bf',
  createdBy: '8bf41ea9-eaaf-4718-a8c9-4a071e51b840',
  accountOwner: '2ad28a81-0905-4592-9070-708aa6920e82',
  timelineActivities: '9ec4140d-a6dd-42e0-b882-5f6b35556530',
  searchVector: '7efe35b6-1956-48e2-9e43-183998ebc800',
};

export const MKT_CONTRACT_FIELD_IDS = {
  name: '5c81d04d-b56c-40a9-9d3e-8c0bdba1af0b',
  contractNumber: '361dfd0d-e1fe-4bb6-a204-05600ac57041',
  status: '90a61a70-1871-4534-8215-8031ca107a99',
  startDate: '5cfe9cf4-3f1a-4a9a-bc84-7296da244819',
  endDate: '14548624-e9a4-4203-a1a2-c9b6341a5536',
  contractType: '92440473-2b50-4cff-9100-18a5bf033f21',
  signedDate: '2b57a1fb-9d10-4c97-98b5-6c1adf7d21cd',
  filePath: '6bc6db5f-5879-495f-8244-c492b06eab0c',
  fileName: 'd02c54fd-f3cf-42b6-8293-0860b05f9e17',
  description: 'e72447c6-f775-4cf3-a67d-cc632dac1e65',
  // relations
  mktOrder: '8d607784-4a7f-4b03-b084-ed33561cb830',
  mktOrderId: '9e8ab2f5-3a4c-4d5e-8f1b-7c9d8e0f1a2b',
  customer: '21c8ee47-b6a9-4c93-9fb7-04cbbf119d44',
  // mktTemplate: 'd7eb704c-1c00-4c08-b49d-4e1db26e5472',
  // common relations or fields
  position: '5781e4a6-4a32-46ab-8fe0-f72c6887c83c',
  createdBy: 'ff1664c1-9788-45c4-a1f6-e20626e9d6f4',
  accountOwner: 'b2e28989-9da6-4323-aa4f-9e208425c922',
  timelineActivities: '87d27317-4b2e-4643-a35c-b86065223abb',
  searchVector: '4769af80-5c7a-4c51-8272-e85bd5377a39',
};

export const MKT_EMAIL_FIELD_IDS = {
  // fields
  from: 'b86342d5-1894-47ee-967c-3e78eed36723',
  to: '37848b3e-f83e-4ba3-afb7-b21301007b11',
  subject: '230c0f83-17cf-4fd2-9865-8cd19b8ed9fd',
  body: 'c788f6ea-301c-4827-ac36-293c3fb4b438',
  sentAt: '04a0d894-e55f-459f-adf8-525dfdc21a17',
  status: '7358037d-3342-4c6a-89bc-c1e8a761f181',
  emailType: '480625cf-1f61-4418-aecb-975aeaa8c891',

  // relations

  // common relations or fields
  position: '89501fd9-78c0-4562-a528-d17262e91968',
  createdBy: '9394a32b-0b39-4ab9-8340-0c31aed6f396',
  accountOwner: '49d616d0-210c-4b74-9221-188eb4705f90',
  timelineActivities: '866b37d6-0c14-4f53-8a39-57f0d6229fa6',
  searchVector: '2a32259b-5a20-4333-a61f-3b06edc2d4e8',
};

export const MKT_PAYMENT_FIELD_IDS = {
  name: '3f8a9b7c-6d5e-4f32-9c1a-8b7f6e5d4c3b',
  amount: '4e9a8b7c-6d5f-4e32-9c1b-8b7f6e5d4c3c',
  duration: 'a577d653-ad35-468d-b16f-5ad4a7ed4a84',
  expiredAt: '0f89a97a-1c01-4232-89dc-a1b6fff97442',
  currency: '5e9a8b7d-6d5f-4e33-9c1c-8b7f6e5d4c3d',
  status: '6e9a8b7e-6d5f-4e34-9c1d-8b7f6e5d4c3e',
  paymentDate: '7e9a8b7f-6d5f-4e35-9c1e-8b7f6e5d4c3f',
  description: '8e9a8b80-6d5f-4e36-9c1f-8b7f6e5d4c40',
  orderId: '9e9a8b81-6d5f-4e37-9c20-8b7f6e5d4c41',
  invoiceId: 'ae9a8b82-6d5f-4e38-9c21-8b7f6e5d4c42',
  qrCodeUrl: '3b1e43e9-31e1-4e35-a55c-e6aa1e5b7c99',
  paymentPageUrl: 'a125b6bc-db84-4b01-98e1-8bd16e83e175',
  //relations
  mktOrder: '4b889a4f-bfea-4938-a4e2-66271ebeca12',
  mktPaymentHistories: 'd911020f-6776-4dd7-9e3a-21f478aa65cf',
  mktTemplate: 'be4400ab-ce40-42aa-a72d-271c2caf806c',

  // SePay integration fields
  sepayTransactionId: 'b637c9af-f198-4d24-9f7a-b0c8cede17b8',

  //common relations or fields
  position: 'be9a8b83-6d5f-4e39-9c22-8b7f6e5d4c43',
  createdBy: 'ce9a8b84-6d5f-4e3a-9c23-8b7f6e5d4c44',
  mktPaymentMethod: 'de9a8b85-6d5f-4e3b-9c24-8b7f6e5d4c45',
  accountOwner: 'ee9a8b86-6d5f-4e3c-9c25-8b7f6e5d4c46',
  timelineActivities: 'fe9a8b87-6d5f-4e3d-9c26-8b7f6e5d4c47',
  searchVector: '0f9a8b88-6d5f-4e3e-9c27-8b7f6e5d4c48',
};

export const MKT_PAYMENT_HISTORY_FIELD_IDS = {
  // fields
  name: '0a2fb0f5-7a38-417d-bde2-4ee5a431abe5',
  paymentType: 'e9636196-341a-4546-ae3b-321993c8afea',
  amount: 'd56c04a7-1336-4ef1-8aa8-33cc4b516a0e',
  note: '9cf5ac2a-eacc-412f-994a-e8bafcc96e2a',
  // relations
  mktOrder: '08680373-af4a-4684-b4dd-f711feb241a2',
  mktLicense: '524cd350-4be3-4fd3-bc47-35595a1edf97',
  mktVariant: '0889887f-43f0-47de-8953-fde80fe48ecf',
  mktPayment: '8599c7f2-b216-4995-b92f-d65a30e02f5a',
  // common relations or fields
  position: 'd4866dc0-b643-4028-b48d-321cddfe1c41',
  createdBy: 'ac33e6e5-0de3-48d5-bdab-da57924b70cc',
  accountOwner: '4df21a70-554a-47df-ad73-0abe49486e64',
  timelineActivities: '36c425be-eb0e-4e5e-b4f7-f8c3f547cf55',
  searchVector: '1ebd58a0-deac-46ac-9d78-dd0e15cd97dc',
};

export const MKT_PAYMENT_METHOD_FIELD_IDS = {
  name: '1f8a9b7c-6d5e-4f32-9c1a-8b7f6e5d4c3a',
  type: '2f8a9b7d-6d5e-4f33-9c1b-8b7f6e5d4c3b',
  description: '3f8a9b7e-6d5e-4f34-9c1c-8b7f6e5d4c3c',
  isActive: '4f8a9b7f-6d5e-4f35-9c1d-8b7f6e5d4c3d',
  position: '5f8a9b80-6d5e-4f36-9c1e-8b7f6e5d4c3e',
  createdBy: '6f8a9b81-6d5e-4f37-9c1f-8b7f6e5d4c3f',
  mktPayments: '7f8a9b82-6d5e-4f38-9c20-8b7f6e5d4c40',
  accountOwner: '8f8a9b83-6d5e-4f39-9c21-8b7f6e5d4c41',
  timelineActivities: '9f8a9b84-6d5e-4f3a-9c22-8b7f6e5d4c42',
  searchVector: 'af8a9b85-6d5e-4f3b-9c23-8b7f6e5d4c43',
};

//EXTENDS FROM TIMELINE_ACTIVITY_STANDARD_FIELD_IDS
export const TIMELINE_ACTIVITY_MKT_FIELD_IDS = {
  //core
  mktOption: '1a0fde35-b0e9-4d56-bc9f-400d15aa38cd',
  mktReport: '56bb55c0-59c2-4f68-99c9-4ee1638650dd',
  //i18n
  mktI18n: '70a89432-aeb9-49a3-b263-3b5c57921d78',
  //customers
  mktCustomer: 'e42c00cb-dcc8-4682-ab98-2fa5f5c03f08',
  mktTag: '3bba154a-8267-4c6e-8ef8-f4170938d9f0',
  mktCustomerTag: 'b4521675-814d-4f9e-bd49-e77932eca67b',
  //products
  mktCategory: 'c7f61c4b-2063-44d0-bada-d9b4a165b02e',
  mktProduct: 'fb70cd51-fca9-414c-ac2e-41c00fcb1d45',
  mktAttribute: '18a51a5f-122f-4536-a4c5-cc4672664f93',
  mktVariant: 'b6ecb5e1-14c8-4aaa-b715-e26ed4e81e62',
  mktValue: '9022a8c1-5948-473e-a361-1ddfb017a4f2',
  mktVariantAttribute: 'f656fa33-96e7-42a0-8f4f-f35dfcb0acae',
  mktVariantValue: 'be8a4d17-0ce9-4181-99c0-c63b54d5f461',
  //combos
  mktCombo: '94442c1a-1e57-4038-9e5c-dac724d92a74',
  mktComboVariant: 'dffcadf4-8f5e-4530-8794-61230d68324a',
  //orders
  mktOrder: 'e0919045-74af-4800-bb40-ccef297253a9',
  mktOrderHistory: '7d9f8e5c-3a2b-4c1d-9e8f-1a2b3c4d5e6f',
  mktLicense: '4b8283ce-daa4-4f11-87d0-2ade1cd6dc81',
  mktLicenseHistory: '47624ac0-a675-4144-bbb9-97efcccae7f8',
  mktContract: 'b8c23b61-29ab-47e5-b412-4789f0653a69',
  mktOrderItem: 'c8d7e6f5-4321-0987-6543-21098765432a',
  // payments
  mktPaymentHistory: '47dfb2cc-846f-47f2-bf5c-a2516843e5f2',
  //subscriptions
  //invoices
  mktInvoice: 'a0b038a6-cab6-4777-b51c-861c5671bb49',
  mktSInvoiceAuth: 'f27fadef-d54e-41b3-b688-453e4d29a4ea',
  mktSInvoice: '46478145-a644-4d3a-88c3-06b5b3ed5159',
  mktSInvoicePayment: 'bc929c21-d9a2-49f1-9832-13d12b8cb911',
  mktSInvoiceTaxBreakdown: 'ed99f68d-9e42-474b-9057-a3b9b5f4c7d7',
  mktSInvoiceMetadata: 'fc693847-c30a-4df4-b878-b84efe68d916',
  mktTemplate: 'f0fb46f9-c26f-4154-b17e-326ca166f8c9',
  mktPayment: 'bf8a9b90-6d5e-4f40-9c30-8b7f6e5d4c50',
  mktPaymentMethod: 'cf8a9b91-6d5e-4f41-9c31-8b7f6e5d4c51',
  mktSInvoiceItem: 'fe30be83-1b86-4ec5-b584-2c059f0438b7',
  mktSInvoiceFile: 'fdbfbbef-35e4-4971-9043-59da5c30f23e',
  //kpi system - removed timeline activity references as they're not implemented

  mktEmail: 'c839e840-2190-45b4-8eb2-e0da1d53f339',
};

//EXTENDS FROM WORKSPACE_MEMBER_STANDARD_FIELD_IDS
export const WORKSPACE_MEMBER_MKT_FIELD_IDS = {
  //core
  memberType: 'b4e7aabd-3b48-45ae-8c08-b513d329dc68',
  supportForMemberId: '19278821-d3a2-4158-8056-fe6610e8690a',
  endDate: '81b70197-38b8-4ec4-bc87-eb9a63d9c61a',
  status: '6f656294-ce00-499a-b8e5-bd9c4be9bde9',
  managerForMktDepartments: 'f1f28a95-06e6-4685-a09b-9a51819941c8',
  subManagerAssignments: '43ef504c-9e23-431e-993c-b31c0199252c', // Changed from subLeaderForMktDepartments
  grade: '5ffe14ec-94b9-4c49-b61e-e99493b18f5f',
  address: 'a2312a29-32d9-4ea7-b411-7df882d3562d',
  memberCode: 'bdcdd342-8d54-4686-9725-4c18df2f4977',
  //options
  accountOwnerForMktOptions: '688c5537-77aa-4b1f-a557-d4d0d124c904',
  accountOwnerForMktReports: 'a55048e3-30c5-4a74-a5e0-70c41b159c00',
  //i18n
  accountOwnerForI18ns: '62b34ddc-a703-4172-ad5c-29c7bb7aa681',
  //customers
  accountOwnerForMktCustomers: '06129dff-8941-4cd4-aed8-e5e89e986fd2',
  supportOwnerForMktCustomers: '64392df8-b678-498a-a429-b4cbc27338e8',
  accountOwnerForMktTags: '0a057a17-d56b-4d9d-8c2d-a00296205f71',
  accountOwnerForMktCustomerTags: '316eaa82-e210-4663-ad62-ef058862ce52',
  //products
  accountOwnerForMktCategories: '90cf2133-0d79-4f4e-9ced-efca439478d1',
  accountOwnerForMktProducts: 'fa7e06e6-3d12-4185-928a-db45e0257b95',
  accountOwnerForMktAttributes: '84954c00-5b31-46ab-9b6c-e95b81ae8d94',
  accountOwnerForMktVariants: '27b1e5ab-980b-4c3c-8168-c8ed77e86363',
  accountOwnerForMktValues: '7bdf395c-9f67-4fc9-9149-e58ba5c135de',
  accountOwnerForMktVariantAttributes: '6cd393a4-db2a-4cc6-b444-8e9ca99f93ec',
  accountOwnerForMktVariantValues: 'aa82bb10-0cb7-4d1d-a8f0-c46b84fbd490',
  //combos
  accountOwnerForMktCombos: '90e6970d-8c23-4562-8c25-cece175b20e8',
  accountOwnerForMktComboVariants: '35abe762-d4e7-4c16-b4c6-e22c990dc0b5',
  //generic combos
  createdMktGenericCombos: '5a6b7c8d-9e0f-1a2b-3c4d-e5f6a7b8c9d0',
  accountOwnerForMktGenericCombos: '6b7c8d9e-0f1a-2b3c-4d5e-f6a7b8c9d0e1',
  //orders
  accountOwnerForMktOrders: '797601a1-d5f0-4c33-a4af-0232f02f7c68',
  createdMktOrders: 'c8f4a9e1-7d2b-4c5a-9f3e-8b1d6a2c4e7f',
  accountOwnerForMktLicenses: 'a343e640-2214-4896-a0e2-830ee854a778',
  accountOwnerForMktLicenseHistories: '1acbefb0-f166-488b-96eb-f8a14829f7a2',
  accountOwnerForMktContracts: '87d29139-844b-44b9-a3e7-3f9e5a3e4165',
  createdMktContracts: 'd9e5b2a1-8c3f-4d6e-a7b9-1c2d3e4f5a6b',
  accountOwnerForMktOrderItems: '5f4e3d2c-1b0a-9876-5432-109876543210',
  accountOwnerForMktPayments: 'df8a9b92-6d5e-4f42-9c32-8b7f6e5d4c52',
  accountOwnerForMktPaymentMethods: 'ef8a9b93-6d5e-4f43-9c33-8b7f6e5d4c53',
  //payment
  accountOwnerForMktPaymentHistories: '9e3f9606-e06a-4177-8cb3-53612bfda424',
  //invoices
  accountOwnerForMktInvoices: 'ab600d66-5755-4934-b5c3-19036927cf92',
  accountOwnerForMktSInvoiceAuths: '6b134cc7-ca30-4576-9b91-29912326de57',
  accountOwnerForMktTemplates: 'a88096b8-e818-4421-afc2-5b1ab207aca3',
  accountOwnerForMktSInvoices: 'b99f2abd-47b5-49e3-ad51-188179489dd9',
  accountOwnerForMktSInvoicePayments: '0506abb4-0afc-4c2d-8341-d284643878eb',
  accountOwnerForMktSInvoiceItems: '8070950e-f1d3-4fc3-9282-6efce02f44d7',
  accountOwnerForMktSInvoiceTaxBreakdowns:
    '84fb2cfe-172c-470f-8417-164869884253',
  accountOwnerForMktSInvoiceMetadata: '1a930b9c-fc8e-49b6-a430-d765bfc07921',
  accountOwnerForMktSInvoiceFiles: 'f2a3e8c4-a763-42b6-9a8b-b0fab2c583f4',
  // departments
  team: '8d93b8fd-1e5a-4ced-b248-0587fbd022d0',
  //kpi system
  accountOwnerForMktKpiTemplates: '40404040-7c8d-9e0f-1a2b-3c4d5e6f7a8b',
  changedKpiHistories: '40404040-0b1c-2d3e-4f5a-6b7c8d9e0f1a',
  // temporary permissions
  grantedTemporaryPermissions: '60606060-4f5a-6b7c-8d9e-0f1a2b3c4d5e',
  receivedTemporaryPermissions: '60606060-5a6b-7c8d-9e0f-1a2b3c4d5e6f',
  revokedTemporaryPermissions: '60606060-6b7c-8d9e-0f1a-2b3c4d5e6f7a',
  // data access policies
  dataAccessPolicies: '70707070-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
  // permission audits
  permissionAudits: '80808080-8b9c-0d1e-2f3a-4b5c6d7e8f9a',
  // permission templates
  permissionTemplateAssignments: '90909090-9c0d-1e2f-3a4b-5c6d7e8f9a0b',
  permissionTemplateAssignmentsMade: '90909090-0d1e-2f3a-4b5c-6d7e8f9a0b1c',
  // permission overrides
  permissionOverrides: 'a0a0a0a0-1e2f-3a4b-5c6d-7e8f9a0b1c2d',
  approvedPermissionOverrides: 'a0a0a0a0-2f3a-4b5c-6d7e-8f9a0b1c2d3e',
  // Phase 2: created permission templates
  createdPermissionTemplates: 'b0b0b0b0-3a4b-5c6d-7e8f-9a0b1c2d3e4f',

  accountOwnerForMktEmails: '66a1da50-b66a-439a-99f2-aced752fc864',
};

export const MKT_PERSON_FIELD_IDS = {
  memberType: '0804050d-c4d3-4029-b401-b48369c00e70',
  newEmail: '3dd95a4c-9902-4dbe-bd34-ed1c14f3391a',
  // relations
  departmentId: '24674af6-c1c8-446e-92cb-8d9fd2bf3ed6',
  teamId: '3579b8fd-1e5a-4ced-b248-0587fbd022d0',
  supportForMemberId: 'e7021859-8766-4f68-8730-d32da36774ef',
  startDate: '697bb3ff-fe25-4ffb-b6ad-28a5dab6254f',
  endDate: '8bc02b57-f02e-4853-91a3-ee6e38f989c6',
  status: '3d8d2eb9-572e-4148-a110-c3cb7062f5f2',
  syncStatus: '0b811f27-2dae-4370-a804-04a8955f7b40',
};

export const MKT_ORGANIZATION_LEVEL_FIELD_IDS = {
  // level definition
  levelCode: 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b',
  levelName: 'f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c',
  levelNameEn: 'a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d',
  description: 'b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e',
  // hierarchy structure
  hierarchyLevel: 'c9d0e1f2-a3b4-5c6d-7e8f-9a0b1c2d3e4f',
  parentLevel: 'd0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a',
  // business rules
  defaultPermissions: 'e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b',
  accessLimitations: 'f2a3b4c5-d6e7-8f9a-0b1c-2d3e4f5a6b7c',
  // display & status
  displayOrder: 'a3b4c5d6-e7f8-9a0b-1c2d-3e4f5a6b7c8d',
  isActive: 'b4c5d6e7-f8a9-0b1c-2d3e-4f5a6b7c8d9e',
  // standard fields
  position: 'd6e7f8a9-b0c1-2d3e-4f5a-6b7c8d9e0f1a',
  createdBy: 'e7f8a9b0-c1d2-3e4f-5a6b-7c8d9e0f1a2b',
  // relations
  staffMembers: '20202020-5a6b-7c8d-9e0f-1a2b3c4d5e6f',
  dataAccessPolicies: '20202020-6b7c-8d9e-0f1a-2b3c4d5e6f7a',
  // Phase 2: permission templates relation
  permissionTemplates: '20202020-7c8d-9e0f-1a2b-3c4d5e6f7a8b',
};

export const MKT_EMPLOYMENT_STATUS_FIELD_IDS = {
  // status definition
  statusCode: 'f8a9b0c1-d2e3-4f5a-6b7c-8d9e0f1a2b3c',
  statusName: 'a9b0c1d2-e3f4-5a6b-7c8d-9e0f1a2b3c4d',
  statusNameEn: 'b0c1d2e3-f4a5-6b7c-8d9e-0f1a2b3c4d5e',
  description: 'c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f',
  // business rules
  isInitialStatus: 'd2e3f4a5-b6c7-8d9e-0f1a-2b3c4d5e6f7a',
  isFinalStatus: 'e3f4a5b6-c7d8-9e0f-1a2b-3c4d5e6f7a8b',
  maxDuration: 'f4a5b6c7-d8e9-0f1a-2b3c-4d5e6f7a8b9c',
  requiresApproval: 'a5b6c7d8-e9f0-1a2b-3c4d-5e6f7a8b9c0d',
  // restrictions & flow
  restrictions: 'b6c7d8e9-f0a1-2b3c-4d5e-6f7a8b9c0d1e',
  allowedNextStatuses: 'c7d8e9f0-a1b2-3c4d-5e6f-7a8b9c0d1e2f',
  // display
  displayOrder: 'd8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a',
  statusColor: 'e9f0a1b2-c3d4-5e6f-7a8b-9c0d1e2f3a4b',
  isActive: 'f0a1b2c3-d4e5-6f7a-8b9c-0d1e2f3a4b5c',
  // standard fields
  position: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  createdBy: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
  // relations
  staffMembers: '20202020-4f5a-6b7c-8d9e-0f1a2b3c4d5e',
};

export const MKT_STAFF_STATUS_HISTORY_FIELD_IDS = {
  // reference fields
  staffId: 'c9d0e1f2-a3b4-5c6d-7e8f-9a0b1c2d3e4f',
  fromStatusId: 'd0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a',
  toStatusId: 'e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b',
  // change details
  changeDate: 'f2a3b4c5-d6e7-8f9a-0b1c-2d3e4f5a6b7c',
  changeReason: 'a3b4c5d6-e7f8-9a0b-1c2d-3e4f5a6b7c8d',
  approvedBy: 'b4c5d6e7-f8a9-0b1c-2d3e-4f5a6b7c8d9e',
  notes: 'c5d6e7f8-a9b0-1c2d-3e4f-5a6b7c8d9e0f',
  // expected dates
  expectedEndDate: 'd6e7f8a9-b0c1-2d3e-4f5a-6b7c8d9e0f1a',
  actualEndDate: 'e7f8a9b0-c1d2-3e4f-5a6b-7c8d9e0f1a2b',
  // standard fields
  createdBy: 'f8a9b0c1-d2e3-4f5a-6b7c-8d9e0f1a2b3c',
};

export const MKT_DEPARTMENT_FIELD_IDS = {
  departmentType: '1a8cd0b1-19e3-4e72-a550-417b7b31f576',
  metadata: '764b1220-3891-4543-9ef5-f71cc2041891',
  address: '6da75069-5b2d-45a3-8081-3699db04a7e6',
  // department definition
  departmentCode: 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
  departmentName: 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a',
  departmentNameEn: 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b',
  description: 'f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c',
  // department leadership
  departmentHead: 'a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d',
  // business configuration
  budgetCode: 'b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e',
  costCenter: 'c9d0e1f2-a3b4-5c6d-7e8f-9a0b1c2d3e4f',
  // department rules
  requiresKpiTracking: 'd0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a',
  allowsCrossDepartmentAccess: 'e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b',
  defaultKpiCategory: 'f2a3b4c5-d6e7-8f9a-0b1c-2d3e4f5a6b7c',
  // display
  displayOrder: 'a3b4c5d6-e7f8-9a0b-1c2d-3e4f5a6b7c8d',
  colorCode: 'b4c5d6e7-f8a9-0b1c-2d3e-4f5a6b7c8d9e',
  iconName: 'c5d6e7f8-a9b0-1c2d-3e4f-5a6b7c8d9e0f',
  isActive: 'd6e7f8a9-b0c1-2d3e-4f5a-6b7c8d9e0f1a',
  // relations
  staffMembers: 'e7f8a9b0-c1d2-3e4f-5a6b-7c8d9e0f1a2b',
  manager: 'c64c55df-a9c8-4607-84d2-a914f1bff0db',
  subManagers: '3507df29-4966-4116-8be1-ee2e19b25af5', // Changed from subLeader to support multiple sub-managers
  childHierarchies: 'a1d2c3b4-e5f6-7a8b-9c0d-e1f2a3b4c5d6',
  parentHierarchies: 'b2c3d4e5-f6a7-8b9c-0d1e-f2a3b4c5d6e7',
  dataAccessPolicies: '6742dde7-8567-4e8f-a30d-e6b6c70ede0a',
  departmentOwnerForMktLicenses: 'a5f91075-a4d8-4ff2-9b4a-ff646b39850c',
  teamOwnerForMktLicenses: 'a3510a9e-04c7-4a8d-874b-332f87911b37',
  teamMembers: '9186741b-ad29-4acb-a955-48af8c1f7b1f',
  // ancestry relations (for materialized ancestry table)
  ancestryRecordsAsDescendant: 'd7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a',
  ancestryRecordsAsAncestor: 'e8f9a0b1-c2d3-4e5f-6a7b-8c9d0e1f2a3b',
  // standard fields
  position: 'f8a9b0c1-d2e3-4f5a-6b7c-8d9e0f1a2b3c',
  createdBy: 'a9b0c1d2-e3f4-5a6b-7c8d-9e0f1a2b3c4d',
  searchVector: '2e4afe2b-ad65-4582-a81b-2cf5ba66687a',
};

export const MKT_KPI_FIELD_IDS = {
  // basic kpi information
  kpiName: '20202020-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
  kpiCode: '20202020-8b9c-0d1e-2f3a-4b5c6d7e8f9a',
  kpiType: '20202020-9c0d-1e2f-3a4b-5c6d7e8f9a0b',
  kpiCategory: '20202020-0d1e-2f3a-4b5c-6d7e8f9a0b1c',
  description: '20202020-1e2f-3a4b-5c6d-7e8f9a0b1c2d',

  // target and actual values
  targetValue: '20202020-2f3a-4b5c-6d7e-8f9a0b1c2d3e',
  actualValue: '20202020-3a4b-5c6d-7e8f-9a0b1c2d3e4f',
  unitOfMeasure: '20202020-4b5c-6d7e-8f9a-0b1c2d3e4f5a',

  // time period
  periodType: '20202020-5c6d-7e8f-9a0b-1c2d3e4f5a6b',
  periodYear: '20202020-6d7e-8f9a-0b1c-2d3e4f5a6b7c',
  periodQuarter: '3d72979b-ddf8-4f90-b0d3-650ee6c35611',
  periodMonth: '14dbd050-ecec-4538-9721-0d2c98a55c57',
  periodWeek: '20202020-9a0b-1c2d-3e4f-5a6b7c8d9e0f',
  periodStartDate: '20202020-0b1c-2d3e-4f5a-6b7c8d9e0f1a',
  periodEndDate: '20202020-1c2d-3e4f-5a6b-7c8d9e0f1a2b',

  // assignment
  assigneeType: '20202020-2d3e-4f5a-6b7c-8d9e0f1a2b3c',
  assigneeWorkspaceMember: '20202020-3e4f-5a6b-7c8d-9e0f1a2b3c4d',
  assigneeDepartment: '20202020-4f5c-6d7e-8f9a-0b1a2b3c4d5e',

  // status and progress
  status: '20202020-5a6b-7c8d-9e0f-1a2b3c4d5e6f',
  achievedAt: '20202020-6b7c-8d9e-0f1a-2b3c4d5e6f7a',

  // calculation configuration
  isAutoCalculated: '20202020-7c8d-9e0f-1a2b-3c4d5e6f7a8b',
  calculationFormula: '20202020-8d9e-0b1c-2d3e-4d5e6f7a8b9c',
  alertThresholds: '20202020-9e0f-1a2b-3c4d-5e6f7a8b9c0d',

  // additional information
  notes: '20202020-0f1a-2b3c-4d5e-6f7a8b9c0d1e',
  priority: '20202020-1a2b-3c4d-5e6f-7a8b9c0d1e2f',
  weight: '20202020-2b3c-4d5e-6f7a-8b9c0d1e2f3a',

  // standard fields
  position: '20202020-3c4d-5e6f-7a8b-9c0d1e2f3a4b',
  createdBy: '20202020-4d5e-6f7a-8b9c-0d1e2f3a4b5c',
  assignedTo: '20202020-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
  assignedToId: 'e99355eb-0c55-4ca4-ac32-2a8b389212ee',

  // relations
  kpiHistories: '20202020-6f7a-8b9c-0d1e-2f3a4b5c6d7e',
};

export const MKT_KPI_TEMPLATE_FIELD_IDS = {
  // basic template information
  templateName: '30303030-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
  templateCode: '30303030-8b9c-0d1e-2f3a-4b5c6d7e8f9a',
  description: '30303030-9c0d-1e2f-3a4b-5c6d7e8f9a0b',

  // target application
  targetRole: '30303030-0d1e-2f3a-4b5c-6d7e8f9a0b1c',

  // default kpi configuration
  kpiType: '30303030-2f3a-4b5c-6d7e-8f9a0b1c2d3e',
  kpiCategory: '30303030-3a4b-5c6d-7e8f-9a0b1c2d3e4f',
  unitOfMeasure: '30303030-4b5c-6d7e-8f9a-0b1c2d3e4f5a',
  defaultTargetValue: '30303030-5c6d-7e8f-9a0b-1c2d3e4f5a6b',
  periodType: '30303030-6d7e-8f9a-0b1c-2d3e4f5a6b7c',

  // calculation configuration
  isAutoCalculated: '30303030-7e8f-9a0b-1c2d-3e4f5a6b7c8d',
  calculationFormula: '30303030-8f9a-0b1c-2d3e-4f5a6b7c8d9e',

  // template configuration
  isActive: '30303030-9a0b-1c2d-3e4f-5a6b7c8d9e0f',
  isDefault: '30303030-0b1c-2d3e-4f5a-6b7c8d9e0f1a',
  priority: '30303030-1c2d-3e4f-5a6b-7c8d9e0f1a2b',
  weight: '30303030-2d3e-4f5a-6b7c-8d9e0f1a2b3c',
  templateConfig: '30303030-3e4f-5a6b-7c8d-9e0f1a2b3c4d',

  // standard fields
  position: '30303030-4f5a-6b7c-8d9e-0f1a2b3c4d5e',
  createdBy: '30303030-5a6b-7c8d-9e0f-1a2b3c4d5e6f',
  assignedTo: '30303030-6b7c-8d9e-0f1a-2b3c4d5e6f7a',
  assignedToId: '1d0e7e5a-53bb-4fd0-a74a-af26d8ca5d96',

  // relations
  accountOwner: '30303030-7c8d-9e0f-1a2b-3c4d5e6f7a8b',
  searchVector: '30303030-9e0f-1a2b-3c4d-5e6f7a8b9c0d',
};

export const MKT_KPI_HISTORY_FIELD_IDS = {
  // relation to KPI
  kpi: '40404040-7a8b-9c0d-1e2f-3a4b5c6d7e8f',

  // change information
  changeType: '40404040-8b9c-0d1e-2f3a-4b5c6d7e8f9a',
  oldValue: '40404040-9c0d-1e2f-3a4b-5c6d7e8f9a0b',
  newValue: '40404040-0d1e-2f3a-4b5c-6d7e8f9a0b1c',
  changeReason: '40404040-1e2f-3a4b-5c6d-7e8f9a0b1c2d',
  changeDescription: '40404040-2f3a-4b5c-6d7e-8f9a0b1c2d3e',

  // change context
  changedByWorkspaceMember: '40404040-3a4b-5c6d-7e8f-9a0b1c2d3e4f',
  changeSource: '40404040-4b5c-6d7e-8f9a-0b1c2d3e4f5a',
  changeTimestamp: '40404040-5c6d-7e8f-9a0b-1c2d3e4f5a6b',

  // additional data
  additionalData: '40404040-6d7e-8f9a-0b1c-2d3e4f5a6b7c',

  // standard fields
  position: '40404040-7e8f-9a0b-1c2d-3e4f5a6b7c8d',
  createdBy: '40404040-8f9a-0b1c-2d3e-4f5a6b7c8d9e',
  searchVector: '40404040-9a0b-1c2d-3e4f-5a6b7c8d9e0f',
};

export const MKT_TEMPORARY_PERMISSION_FIELD_IDS = {
  // grantee information
  granteeWorkspaceMember: 'b7e2c1a4-3d5f-4e8a-9c2b-1f3e4d5a6b7c',
  granterWorkspaceMember: 'c8f3d2b5-4e6a-4b9c-8d2e-2a3b4c5d6e7f',

  // permission scope
  objectName: 'd9a4e3c2-5b6f-4c8d-9e2a-3b4c5d6e7f8a',
  recordId: 'e0b5f4d3-6c7a-4d9e-8f2b-4c5d6e7f8a9b',

  // permissions granted
  canRead: 'f1c6a5d4-7e8b-4f9a-9c3d-5e6f7a8b9c0d',
  canUpdate: 'a2d7b6e5-8f9c-4a0b-9d4e-6f7a8b9c0d1e',
  canDelete: 'b3e8c7f6-9a0d-4b1c-8e5f-7a8b9c0d1e2f',

  // time control
  expiresAt: 'c4f9d8e7-0b1a-4c2d-9f6e-8b9c0d1e2f3a',

  // justification
  reason: 'd5a0e9f8-1c2b-4d3e-8a7f-9c0d1e2f3a4b',
  purpose: 'e6b1f0a9-2d3c-4e5f-9b8a-0d1e2f3a4b5c',

  // status tracking
  isActive: 'f7c2a1b0-3e4d-5f6a-8b9c-1e2f3a4b5c6d',
  revokedAt: 'a8d3b2c1-4f5e-6a7b-9c0d-2f3a4b5c6d7e',
  revokedBy: 'b9e4c3d2-5a6f-7b8c-0d1e-3a4b5c6d7e8f',
  revokeReason: 'c0f5d4e3-6b7a-8c9d-1e2f-4b5c6d7e8f9a',

  // standard fields
  position: 'd1a6e5f4-7c8b-9d0e-2f3a-5c6d7e8f9a0b',
  createdBy: 'e2b7f6a5-8d9c-0a1b-3c4d-6e7f8a9b0c1d',
  searchVector: 'f3c8a7b6-9e0d-1b2c-4d5e-7f8a9b0c1d2e',
};

export const MKT_PERMISSION_TEMPLATE_FIELD_IDS = {
  // template identification
  templateKey: 'a4c9e1f2-3b5d-4e7a-8c9b-0d1e2f3a4b5c',
  templateName: 'b5d0f2a3-4c6e-5f8b-9d0c-1e2f3a4b5c6d',
  description: 'c6e1a3b4-5d7f-6a9c-0e1d-2f3a4b5c6d7e',

  // hierarchy mapping
  hierarchyLevel: 'd7f2b4c5-6e8a-7b0d-1f2e-3a4b5c6d7e8f',
  applicableToLevels: 'e8a3c5d6-7f9b-8c1e-2a3f-4b5c6d7e8f9a',

  // configuration
  priority: 'f9b4d6e7-8a0c-9d2f-3b4a-5c6d7e8f9a0b',
  isActive: 'a0c5e7f8-9b1d-0e3a-4c5b-6d7e8f9a0b1c',
  isSystemTemplate: 'b1d6f8a9-0c2e-1f4b-5d6c-7e8f9a0b1c2d',
  version: 'c2e7a9b0-1d3f-2a5c-6e7d-8f9a0b1c2d3e',
  createdBySource: 'd3f8b0c1-2e4a-3b6d-7f8e-9a0b1c2d3e4f',

  // tracking
  lastModifiedAt: 'e4a9c1d2-3f5b-4c7e-8a9f-0b1c2d3e4f5a',
  lastModifiedBy: 'f5b0d2e3-4a6c-5d8f-9b0a-1c2d3e4f5a6b',

  // relations
  resourcePermissions: 'a6c1e3f4-5b7d-6e9a-0c1b-2d3e4f5a6b7c',
  systemActions: 'b7d2f4a5-6c8e-7f0b-1d2c-3e4f5a6b7c8d',
  accessLimitations: 'c8e3a5b6-7d9f-8a1c-2e3d-4f5a6b7c8d9e',
  userAssignments: 'd9f4b6c7-8e0a-9b2d-3f4e-5a6b7c8d9e0f',
  dataAccessPolicies: 'e0a5c7d8-9f1b-0c3e-4a5f-6b7c8d9e0f1a',

  // standard fields
  position: 'f1b6d8e9-0a2c-1d4f-5b6a-7c8d9e0f1a2b',

  // Phase 2: New fields per authorization-design-v2.md
  templateType: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  departmentType: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
  organizationLevel: 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
  resolutionStrategy: 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a',
  effectiveFrom: 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b',
  effectiveTo: 'f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c',
  metadata: 'a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d',
  createdBy: 'b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e',
};

export const MKT_PERMISSION_ACTION_FIELD_IDS = {
  // action identification
  actionKey: 'a2c7e9f0-1b3d-2e5a-6c7b-8d9e0f1a2b3c',
  actionName: 'b3d8f0a1-2c4e-3f6b-7d8c-9e0f1a2b3c4d',
  actionCategory: 'c4e9a1b2-3d5f-4a7c-8e9d-0f1a2b3c4d5e',
  description: 'd5f0b2c3-4e6a-5b8d-9f0e-1a2b3c4d5e6f',

  // security
  riskLevel: 'e6a1c3d4-5f7b-6c9e-0a1f-2b3c4d5e6f7a',
  requiresApproval: 'f7b2d4e5-6a8c-7d0f-1b2a-3c4d5e6f7a8b',
  isSystemAction: 'a8c3e5f6-7b9d-8e1a-2c3b-4d5e6f7a8b9c',
  isActive: 'b9d4f6a7-8c0e-9f2b-3d4c-5e6f7a8b9c0d',

  // relations
  userOverrides: 'c0e5a7b8-9d1f-0a3c-4e5d-6f7a8b9c0d1e',

  // standard fields
  position: 'd1f6b8c9-0e2a-1b4d-5f6e-7a8b9c0d1e2f',
};

export const MKT_PERMISSION_RESOURCE_FIELD_IDS = {
  // resource identification
  resourceKey: 'e2a7c9d0-1f3b-2c5e-6a7f-8b9c0d1e2f3a',
  resourceName: 'f3b8d0e1-2a4c-3d6f-7b8a-9c0d1e2f3a4b',
  resourceCategory: 'a4c9e1f2-3b5d-4e7a-8c9b-0d1e2f3a4b5c',
  description: 'b5d0f2a3-4c6e-5f8b-9d0c-1e2f3a4b5c6d',

  // display
  icon: 'c6e1a3b4-5d7f-6a9c-0e1d-2f3a4b5c6d7e',
  colorCode: 'd7f2b4c5-6e8a-7b0d-1f2e-3a4b5c6d7e8f',
  displayOrder: 'e8a3c5d6-7f9b-8c1e-2a3f-4b5c6d7e8f9a',

  // configuration
  isSystemResource: 'f9b4d6e7-8a0c-9d2f-3b4a-5c6d7e8f9a0b',
  isActive: 'a0c5e7f8-9b1d-0e3a-4c5b-6d7e8f9a0b1c',

  // relations
  templatePermissions: 'b1d6f8a9-0c2e-1f4b-5d6c-7e8f9a0b1c2d',
  userOverrides: 'c2e7a9b0-1d3f-2a5c-6e7d-8f9a0b1c2d3e',

  // standard fields
  position: 'd3f8b0c1-2e4a-3b6d-7f8e-9a0b1c2d3e4f',
};

export const MKT_PERMISSION_CONTEXT_FIELD_IDS = {
  // context identification
  name: 'e4a9c1d2-3f5b-4c7e-8a9f-0b1c2d3e4f5a',
  contextKey: 'f5b0d2e3-4a6c-5d8f-9b0a-1c2d3e4f5a6b',
  contextType: 'a6c1e3f4-5b7d-6e9a-0c1b-2d3e4f5a6b7c',
  description: 'b7d2f4a5-6c8e-7f0b-1d2c-3e4f5a6b7c8d',

  // rules
  filterExpression: 'c8e3a5b6-7d9f-8a1c-2e3d-4f5a6b7c8d9e',
  validationRules: 'd9f4b6c7-8e0a-9b2d-3f4e-5a6b7c8d9e0f',

  // configuration
  priority: 'e0a5c7d8-9f1b-0c3e-4a5f-6b7c8d9e0f1a',
  isActive: 'f1b6d8e9-0a2c-1d4f-5b6a-7c8d9e0f1a2b',
  isSystemDefault: 'a2c7e9f0-1b3d-2e5a-6c7b-8d9e0f1a2b3c',

  // relations
  templateResourcePermissions: 'b3d8f0a1-2c4e-3f6b-7d8c-9e0f1a2b3c4d',

  // standard fields
  position: 'c4e9a1b2-3d5f-4a7c-8e9d-0f1a2b3c4d5e',
};

export const MKT_TEMPLATE_RESOURCE_PERMISSION_FIELD_IDS = {
  // permissions
  allowedActions: 'd5f0b2c3-4e6a-5b8d-9f0e-1a2b3c4d5e6f',
  deniedActions: 'e6a1c3d4-5f7b-6c9e-0a1f-2b3c4d5e6f7a',
  restrictions: 'f7b2d4e5-6a8c-7d0f-1b2a-3c4d5e6f7a8b',
  conditions: 'a8c3e5f6-7b9d-8e1a-2c3b-4d5e6f7a8b9c',

  // configuration
  isActive: 'b9d4f6a7-8c0e-9f2b-3d4c-5e6f7a8b9c0d',

  // relations
  template: 'c0e5a7b8-9d1f-0a3c-4e5d-6f7a8b9c0d1e',
  resource: 'd1f6b8c9-0e2a-1b4d-5f6e-7a8b9c0d1e2f',
  context: 'e2a7c9d0-1f3b-2c5e-6a7f-8b9c0d1e2f3a',
};

export const MKT_TEMPLATE_SYSTEM_ACTION_FIELD_IDS = {
  // action configuration
  actionKey: 'f3b8d0e1-2a4c-3d6f-7b8a-9c0d1e2f3a4b',
  isAllowed: 'a4c9e1f2-3b5d-4e7a-8c9b-0d1e2f3a4b5c',
  restrictions: 'b5d0f2a3-4c6e-5f8b-9d0c-1e2f3a4b5c6d',
  configuration: 'c6e1a3b4-5d7f-6a9c-0e1d-2f3a4b5c6d7e',

  // status
  isActive: 'd7f2b4c5-6e8a-7b0d-1f2e-3a4b5c6d7e8f',

  // relations
  template: 'e8a3c5d6-7f9b-8c1e-2a3f-4b5c6d7e8f9a',
};

export const MKT_TEMPLATE_ACCESS_LIMITATION_FIELD_IDS = {
  // limitation details
  limitationKey: 'f9b4d6e7-8a0c-9d2f-3b4a-5c6d7e8f9a0b',
  limitationType: 'a0c5e7f8-9b1d-0e3a-4c5b-6d7e8f9a0b1c',
  limitationValue: 'b1d6f8a9-0c2e-1f4b-5d6c-7e8f9a0b1c2d',
  severity: 'c2e7a9b0-1d3f-2a5c-6e7d-8f9a0b1c2d3e',

  // configuration
  isActive: 'd3f8b0c1-2e4a-3b6d-7f8e-9a0b1c2d3e4f',
  isEnforced: 'e4a9c1d2-3f5b-4c7e-8a9f-0b1c2d3e4f5a',

  // relations
  template: 'f5b0d2e3-4a6c-5d8f-9b0a-1c2d3e4f5a6b',
};

export const MKT_USER_PERMISSION_TEMPLATE_FIELD_IDS = {
  // assignment tracking
  assignedAt: 'a6c1e3f4-5b7d-6e9a-0c1b-2d3e4f5a6b7c',
  expiresAt: 'b7d2f4a5-6c8e-7f0b-1d2c-3e4f5a6b7c8d',
  assignmentReason: 'c8e3a5b6-7d9f-8a1c-2e3d-4f5a6b7c8d9e',

  // status
  isActive: 'd9f4b6c7-8e0a-9b2d-3f4e-5a6b7c8d9e0f',

  // relations
  workspaceMember: 'e0a5c7d8-9f1b-0c3e-4a5f-6b7c8d9e0f1a',
  template: 'f1b6d8e9-0a2c-1d4f-5b6a-7c8d9e0f1a2b',
  assignedBy: 'a2c7e9f0-1b3d-2e5a-6c7b-8d9e0f1a2b3c',

  // standard fields
  position: 'b3d8f0a1-2c4e-3f6b-7d8c-9e0f1a2b3c4d',
};

export const MKT_USER_PERMISSION_OVERRIDE_FIELD_IDS = {
  // override details
  isAllowed: 'c4e9a1b2-3d5f-4a7c-8e9d-0f1a2b3c4d5e',
  reason: 'd5f0b2c3-4e6a-5b8d-9f0e-1a2b3c4d5e6f',
  reasonDescription: 'e6a1c3d4-5f7b-6c9e-0a1f-2b3c4d5e6f7a',
  contextFilter: 'f7b2d4e5-6a8c-7d0f-1b2a-3c4d5e6f7a8b',

  // time control
  expiresAt: 'a8c3e5f6-7b9d-8e1a-2c3b-4d5e6f7a8b9c',
  approvedAt: 'b9d4f6a7-8c0e-9f2b-3d4c-5e6f7a8b9c0d',

  // status
  isActive: 'c0e5a7b8-9d1f-0a3c-4e5d-6f7a8b9c0d1e',

  // relations
  workspaceMember: 'd1f6b8c9-0e2a-1b4d-5f6e-7a8b9c0d1e2f',
  resource: 'e2a7c9d0-1f3b-2c5e-6a7f-8b9c0d1e2f3a',
  action: 'f3b8d0e1-2a4c-3d6f-7b8a-9c0d1e2f3a4b',
  approvedBy: 'a4c9e1f2-3b5d-4e7a-8c9b-0d1e2f3a4b5c',

  // standard fields
  position: 'b5d0f2a3-4c6e-5f8b-9d0c-1e2f3a4b5c6d',
};

export const MKT_PERMISSION_PRIORITY_CONFIG_FIELD_IDS = {
  // source configuration
  sourceType: 'c6e1a3b4-5d7f-6a9c-0e1d-2f3a4b5c6d7e',
  sourceSubType: 'd7f2b4c5-6e8a-7b0d-1f2e-3a4b5c6d7e8f',
  description: 'e8a3c5d6-7f9b-8c1e-2a3f-4b5c6d7e8f9a',

  // priority configuration
  basePriority: 'f9b4d6e7-8a0c-9d2f-3b4a-5c6d7e8f9a0b',
  priorityBoost: 'a0c5e7f8-9b1d-0e3a-4c5b-6d7e8f9a0b1c',
  minPriority: 'b1d6f8a9-0c2e-1f4b-5d6c-7e8f9a0b1c2d',
  maxPriority: 'c2e7a9b0-1d3f-2a5c-6e7d-8f9a0b1c2d3e',
  priorityFormula: 'd3f8b0c1-2e4a-3b6d-7f8e-9a0b1c2d3e4f',

  // conditions
  conditions: 'e4a9c1d2-3f5b-4c7e-8a9f-0b1c2d3e4f5a',

  // status
  isActive: 'f5b0d2e3-4a6c-5d8f-9b0a-1c2d3e4f5a6b',

  // standard fields
  position: 'a6c1e3f4-5b7d-6e9a-0c1b-2d3e4f5a6b7c',
};

export const MKT_DEPARTMENT_HIERARCHY_FIELD_IDS = {
  name: '220d1e69-8cdf-4ad5-9368-0dd2f8c39458',
  // parent department relation
  parentDepartment: 'e1b2c3d4-5f6a-4b7c-8d9e-0f1a2b3c4d5e',
  // child department relation (acts as departmentId in design)
  childDepartment: '855bb84d-b802-4ee5-a048-7eeb68ef9c3a',
  // hierarchy information
  hierarchyLevel: 'a3d4e5f6-7b8c-4d9e-0f1a-2b3c4d5e6f7a',
  hierarchyPath: 'b4e5f6a7-8c9d-4e0f-1a2b-3c4d5e6f7a8b',
  // manager & permissions
  manager: 'c5f6a7b8-9d0e-4f1a-2b3c-4d5e6f7a8b9c',
  canViewTeamData: 'd6a7b8c9-0e1f-4a2b-3c4d-5e6f7a8b9c0d',
  canEditTeamData: 'e7b8c9d0-1f2a-4b3c-5d6e-7a8b9c0d1e2f',
  canExportTeamData: 'f8c9d0e1-2a3b-4c5d-6e7f-8a9b0c1d2e3f',
  inheritsParentPermissions: 'a9d0e1f2-3b4c-5d6e-7f8a-9b0c1d2e3f4a',
  // legacy / additional relationship type
  relationshipType: 'b0e1f2a3-4c5d-6e7f-8a9b-0c1d2e3f4a5b',

  // validity period
  validFrom: 'c1f2a3b4-5d6e-7f8a-9b0c-1d2e3f4a5b6c',
  validTo: 'd2a3b4c5-6e7f-8a9b-0c1d-2e3f4a5b6c7d',
  // business configuration (legacy)
  inheritsPermissions: 'e3b4c5d6-7f8a-9b0c-1d2e-3f4a5b6c7d8e',
  canEscalateToParent: 'f4c5d6e7-8a9b-0c1d-2e3f-4a5b6c7d8e9f',
  allowsCrossBranchAccess: 'a5d6e7f8-9b0c-1d2e-3f4a-5b6c7d8e9fa0',
  // display and metadata
  displayOrder: 'b6e7f8a9-0c1d-2e3f-4a5b-6c7d8e9fa0b1',
  notes: 'c7f8a9b0-1d2e-3f4a-5b6c-7d8e9fa0b1c2',
  isActive: 'd8a9b0c1-2e3f-4a5b-6c7d-8e9fa0b1c2d3',
  // standard fields
  position: 'e9b0c1d2-3f4a-5b6c-7d8e-9fa0b1c2d3e4',
  createdBy: 'f0c1d2e3-4a5b-6c7d-8e9f-a0b1c2d3e4f5',
  searchVector: 'a1d2e3f4-5b6c-7d8e-9fa0-b1c2d3e4f5a6',
};

export const MKT_DATA_ACCESS_POLICY_FIELD_IDS = {
  // basic info
  name: 'b2e3f4a5-6c7d-8e9f-a0b1-c2d3e4f5a6b7',
  description: 'c3f4a5b6-7d8e-9fa0-b1c2-d3e4f5a6b7c8',

  // applies to whom
  department: 'd4a5b6c7-8e9f-a0b1-c2d3-e4f5a6b7c8d9',
  specificMember: 'e5b6c7d8-9fa0-b1c2-d3e4-f5a6b7c8d9ea',
  organizationLevel: 'f5c7d9e0-0b1a-2c3d-4e5f-6a7b8c9d0e1f',
  permissionTemplate: 'a6d8e0f1-1c2b-3d4e-5f6a-7b8c9d0e1f2a',

  // applies to what
  objectName: 'f6c7d8e9-a0b1-c2d3-e4f5-a6b7c8d9eafb',
  filterConditions: 'a7d8e9fa-b1c2-d3e4-f5a6-b7c8d9eafba0',

  // control
  priority: 'b8e9fab0-c2d3-e4f5-a6b7-c8d9eafba0b1',
  isActive: 'c9fab0c1-d3e4-f5a6-b7c8-d9eafba0b1c2',

  // standard fields
  position: 'd0b0c1d2-e4f5-a6b7-c8d9-eafba0b1c2d3',

  // Phase 2: New fields per authorization-design-v2.md
  policyType: 'e1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
  evaluationMode: 'f2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d',
  riskLevel: 'a3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e',
  conflictResolution: 'b4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f',
};

export const MKT_PERMISSION_AUDIT_FIELD_IDS = {
  // who performed the action
  workspaceMember: 'e1f2a3b4-5c6d-7e8f-a0b1-c2d3e4f5a6b7',
  userId: 'f2a3b4c5-6d7e-8f9a-b1c2-d3e4f5a6b7c8',

  // what action was performed
  action: 'a3b4c5d6-7e8f-9a0b-c2d3-e4f5a6b7c8d9',
  objectName: 'b4c5d6e7-8f9a-0b1c-d3e4-f5a6b7c8d9ea',
  recordId: 'c5d6e7f8-9a0b-1c2d-e4f5-a6b7c8d9eafb',

  // permission check details
  permissionSource: 'd6e7f8a9-0b1c-2d3e-f5a6-b7c8d9eafba0',
  checkResult: 'e7f8a9b0-1c2d-3e4f-a6b7-c8d9eafba0b1',
  denialReason: 'f8a9b0c1-2d3e-4f5a-b7c8-d9eafba0b1c2',

  // request context
  requestContext: 'a9b0c1d2-3e4f-5a6b-c8d9-eafba0b1c2d3',
  ipAddress: 'b0c1d2e3-4f5a-6b7c-d9ea-fba0b1c2d3e4',
  userAgent: 'c1d2e3f4-5a6b-7c8d-eafb-a0b1c2d3e4f5',

  // performance metrics
  checkDurationMs: 'd2e3f4a5-6b7c-8d9e-fba0-b1c2d3e4f5a6',

  // standard fields
  position: 'e3f4a5b6-7c8d-9eaf-ba0b-1c2d3e4f5a6b',

  // Phase 2: New fields per authorization-design-v2.md
  stepResults: 'a5b6c7d8-9e0f-1ab2-3c4d-5e6f7a8b9c0d',
  cacheHit: 'b6c7d8e9-0f1a-2bc3-4d5e-6f7a8b9c0d1e',
  executionPath: 'c7d8e9f0-1a2b-3cd4-5e6f-7a8b9c0d1e2f',
  requestId: 'd8e9f0a1-2b3c-4de5-6f7a-8b9c0d1e2f3a',

  // Extensible metadata for future requirements
  metadata: 'e9f0a1b2-3c4d-5ef6-7a8b-9c0d1e2f3a4b',
};

export const MKT_CUSTOMER_TIER_HISTORY_FIELD_IDS = {
  // core fields
  customerId: 'f42abfed-871b-4b56-b334-25a7eccc9b03',
  previousTier: 'd88a1494-1ff3-40c1-b987-3a992d3a7d91',
  newTier: '958eeee5-1f66-49d1-8c92-16c8ce0281f3',
  reason: '4b167bae-d056-430b-b513-6861afde4fc4',
  orderValueAtChange: '2a2f8d86-6924-4e65-b946-11392e466361',
  orderCountAtChange: 'f7f8b36b-ebd8-44f6-8222-221271ec87a1',
  // relation
  customer: 'c95e0199-3547-409a-ab8c-e96d7511be4e',
};

// Webhook Log entity for auditing webhook requests
export const MKT_WEBHOOK_LOG_FIELD_IDS = {
  // core fields
  sepayTransactionId: 'b4c5d6e7-f8a9-0b1c-2d3e-4f5a6b7c8d9e',
  gateway: 'c5d6e7f8-a9b0-1c2d-3e4f-5a6b7c8d9e0f',
  requestBody: 'd6e7f8a9-b0c1-2d3e-4f5a-6b7c8d9e0f1a',
  responseStatus: 'e7f8a9b0-c1d2-3e4f-5a6b-7c8d9e0f1a2b',
  responseBody: 'f8a9b0c1-d2e3-4f5a-6b7c-8d9e0f1a2b3c',
  processingTimeMs: 'a9b0c1d2-e3f4-5a6b-7c8d-9e0f1a2b3c4d',
  ipAddress: 'b0c1d2e3-f4a5-6b7c-8d9e-0f1a2b3c4d5e',
  status: 'c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f',
  errorMessage: 'd2e3f4a5-b6c7-8d9e-0f1a-2b3c4d5e6f7a',
  matchedOrderCode: 'e3f4a5b6-c7d8-9e0f-1a2b-3c4d5e6f7a8b',
  // standard fields
  position: 'f4a5b6c7-d8e9-0f1a-2b3c-4d5e6f7a8b9c',
  createdBy: 'a5b6c7d8-e9f0-1a2b-3c4d-5e6f7a8b9c0d',
};

// Casbin RBAC - Authorization policy rules
export const MKT_CASBIN_RULE_FIELD_IDS = {
  // policy fields
  ptype: '3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
  subject: '4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a',
  object: '5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b',
  action: '6f7a8b9c-0d1e-2f3a-4b5c-6d7e8f9a0b1c',
  effect: '7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d',
  condition: '8b9c0d1e-2f3a-4b5c-6d7e-8f9a0b1c2d3e',
  // standard fields
  position: '9c0d1e2f-3a4b-5c6d-7e8f-9a0b1c2d3e4f',
};

// Casbin RBAC - Policy version tracking
export const MKT_POLICY_VERSION_FIELD_IDS = {
  // version fields
  version: 'a0b1c2d3-e4f5-6789-0abc-def123456789',
  policyHash: 'b1c2d3e4-f567-890a-bcde-f01234567890',
  policyCount: 'c2d3e4f5-6789-0abc-def0-123456789012',
  syncedAt: 'd3e4f5a6-7890-abcd-ef01-234567890123',
  // standard fields
  position: 'e4f5a6b7-890a-bcde-f012-345678901234',
};

// Casbin RBAC - Policy change request (approval workflow)
export const MKT_POLICY_CHANGE_REQUEST_FIELD_IDS = {
  // title (label identifier)
  title: 'e4f5a6b7-8019-abcd-ef01-234567890134',
  // status and type
  status: 'f5a6b7c8-901a-bcde-f012-345678901235',
  changeType: 'a6b7c8d9-012b-cdef-0123-456789012346',
  // policy data
  policyData: 'b7c8d9e0-123c-def0-1234-567890123457',
  riskAssessment: 'c8d9e0f1-234d-ef01-2345-678901234568',
  // approval tracking
  requiredApprovals: 'd9e0f1a2-345e-f012-3456-789012345679',
  currentApprovals: 'e0f1a2b3-456f-0123-4567-890123456780',
  // reason and notes
  requestReason: 'f1a2b3c4-5670-1234-5678-901234567891',
  // relations
  requestedBy: 'a2b3c4d5-6781-2345-6789-012345678902',
  approvals: 'b3c4d5e6-7892-3456-7890-123456789013',
  // standard fields
  position: 'c4d5e6f7-8903-4567-8901-234567890124',
};

// Casbin RBAC - Policy approval
export const MKT_POLICY_APPROVAL_FIELD_IDS = {
  // title (label identifier)
  title: 'd4e5f6a7-8013-4567-8901-234567890134',
  // approval details
  decision: 'd5e6f7a8-9014-5678-9012-345678901235',
  reason: 'e6f7a8b9-0125-6789-0123-456789012346',
  // relations
  changeRequest: 'f7a8b9c0-1236-7890-1234-567890123457',
  approver: 'a8b9c0d1-2347-8901-2345-678901234568',
  // standard fields
  position: 'b9c0d1e2-3458-9012-3456-789012345679',
};

// Department ancestry (materialized)
export const MKT_DEPARTMENT_ANCESTRY_FIELD_IDS = {
  // ancestry fields
  departmentId: 'c0d1e2f3-4569-0123-4567-890123456780',
  ancestorId: 'd1e2f3a4-5670-1234-5678-901234567891',
  distance: 'e2f3a4b5-6781-2345-6789-012345678902',
  computedAt: 'f3a4b5c6-7892-3456-7890-123456789013',
  // relations
  department: 'a4b5c6d7-8903-4567-8901-234567890124',
  ancestor: 'b5c6d7e8-9014-5678-9012-345678901235',
  // standard fields
  position: 'c6d7e8f9-0125-6789-0123-456789012346',
};

export const MKT_DEPARTMENT_SUB_MANAGER_FIELD_IDS = {
  // assignment fields
  isPrimary: 'd7e8f9a0-1236-7890-1234-567890123457',
  assignedAt: 'e8f9a0b1-2347-8901-2345-678901234568',
  note: 'f9a0b1c2-3458-9012-3456-789012345679',
  isActive: 'a0b1c2d3-4569-0123-4567-890123456780',
  // relations
  department: 'b1c2d3e4-5670-1234-5678-901234567891',
  workspaceMember: 'c2d3e4f5-6781-2345-6789-012345678902',
};

// Payment deadline configuration
export const MKT_PAYMENT_DEADLINE_CONFIG_FIELD_IDS = {
  // config type: GLOBAL, PRODUCT, CUSTOMER_TYPE, RESELLER_TIER
  configType: 'd3e4f5a6-7893-4568-9012-345678901236',
  // target ID: product ID, customer type value, reseller tier ID (nullable for GLOBAL)
  targetId: 'e4f5a6b7-8904-5679-0123-456789012347',
  // deadline hours from confirmation (1-720)
  deadlineHours: 'f5a6b7c8-9015-6780-1234-567890123458',
  // active status
  isActive: 'a6b7c8d9-0126-7891-2345-678901234569',
  // priority (lower = higher priority)
  priority: 'b7c8d9e0-1237-8902-3456-789012345670',
  // description/note
  description: 'c8d9e0f1-2348-9013-4567-890123456781',
  // standard fields
  position: 'd9e0f1a2-3459-0124-5678-901234567892',
  createdBy: 'e0f1a2b3-4560-1235-6789-012345678903',
};
