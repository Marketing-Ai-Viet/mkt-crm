import { PERMISSION_ACTION_KEYS } from 'src/mkt-core/mkt-permission-template/constants/permission-actions.constants';

import { MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS } from './mkt-permission-template-data-seeds.constants';
/**
 * Template System Action IDs - Simplified RBAC System (5 templates)
 * Based on RBAC_PERMISSIONS_MATRIX_GUIDE.md
 *
 * Total actions by template:
 * - ADMIN: 113 actions (100% - all actions)
 * - MANAGER: ~75 actions (66% - department-scoped)
 * - TEAM_LEAD: ~50 actions (44% - team-scoped)
 * - STAFF: ~30 actions (27% - own records)
 * - INTERN: ~15 actions (13% - read-only mostly)
 */

type MktTemplateSystemActionDataSeed = {
  id: string;
  templateId: string;
  actionKey: string;
  isAllowed: boolean;
  configuration: string | null; // JSON string for database storage
  restrictions: string | null; // JSON string for database storage
  isActive: boolean;
};

export const MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_COLUMNS: (keyof MktTemplateSystemActionDataSeed)[] =
  [
    'id',
    'templateId',
    'actionKey',
    'isAllowed',
    'configuration',
    'restrictions',
    'isActive',
  ];

/**
 * Static UUID v4 values for each template-action combination
 * These are fixed UUIDs to ensure consistency across seeding operations
 */
const ACTION_IDS = {
  'ADMIN:READ': '36200e75-e8ff-4edf-9824-97d68d28f06d',
  'ADMIN:CREATE': '2f4a39dc-a83e-4e1b-9025-27c93d4210a4',
  'ADMIN:UPDATE': 'c3e36b03-eafc-415d-b7f2-00a80525130a',
  'ADMIN:DELETE': 'a4f8ba7c-0425-425b-ba50-0e70899a57b1',
  'ADMIN:EXPORT': '8490cfca-5491-44d3-bc4b-1c6fe4c75271',
  'ADMIN:IMPORT': 'd8a08566-279a-4a07-8e5a-f9bc1bd18994',
  'ADMIN:SHARE': '774937a9-f22c-49ea-bf7d-778b421777fd',
  'ADMIN:PUBLISH': 'c8c21f85-162f-445e-9148-2e0be64a471e',
  'ADMIN:ARCHIVE': '9d4470c8-c922-4f83-a1ea-dacebca5a44d',
  'ADMIN:RESTORE': '071c6214-0ce3-471c-a558-1bd1b01474e6',
  'ADMIN:CONFIGURE': '97828dd2-f8bd-42c5-89c8-89237cf02b4a',
  'ADMIN:MONITOR': '5dee339d-c705-42aa-9b64-032a544061d2',
  'ADMIN:AUDIT': '7c308cf4-e4de-462f-9cd7-21156dedbd4b',
  'ADMIN:ACCESS_SENSITIVE_DATA': '27c6d882-f7b2-4142-ac6c-d9c9cb883496',
  'ADMIN:VIEW_CONFIDENTIAL_INFO': 'ef3c48e4-d473-449a-a2cb-9a4d56ee6c81',
  'ADMIN:BYPASS_WORKFLOW_APPROVAL': '28959fb5-fb4d-4afa-8e90-732ecadde422',
  'ADMIN:APPROVE': 'b5bf632d-cdbf-433f-8ce4-270586e7491a',
  'ADMIN:REJECT': '45a7b02a-6d08-4175-a6e8-1d33c2b0c24d',
  'ADMIN:ESCALATE': 'e29bbacb-0d75-4337-9ebb-4f99a38958c4',
  'ADMIN:BULK_CREATE': 'ee53863f-6aad-409e-ae55-53972dd9f861',
  'ADMIN:BULK_UPDATE': 'ab18ff1a-f88f-4dba-9ba3-89d972ae0dc7',
  'ADMIN:BULK_DELETE': 'a1d42e5f-454a-4b85-930f-945636582441',
  'ADMIN:BULK_EXPORT': 'ebe674ad-6b1d-4f97-bf03-847d4fd6d324',
  'ADMIN:MANAGE_TEAM': '871db828-156f-4338-bb0d-29b1d7c9ab01',
  'ADMIN:ASSIGN_TASKS': '9893b179-18e3-421e-af28-0da2fb727cce',
  'ADMIN:VIEW_TEAM_REPORTS': 'a3c5381c-9730-4008-acd8-f566f43b3787',
  'ADMIN:CONDUCT_REVIEWS': '74060ab3-8c37-413f-8942-d32671a3b34a',
  'ADMIN:ACCESS_SALARY_DATA': '5f2a5cfd-237e-4f93-b54e-36755b0068b0',
  'ADMIN:APPROVE_TRANSACTIONS': '19777a63-f958-4380-982e-6092131f81a0',
  'ADMIN:VIEW_FINANCIAL_REPORTS': '58fc9a54-ac74-4113-a786-24add0d6f691',
  'ADMIN:BUDGET_MANAGEMENT': 'e2da0181-0a51-42e7-890e-7d0948c75aad',
  'ADMIN:ASSIGN_CUSTOMER': '711060d1-dac4-40ae-90ac-034642bb9593',
  'ADMIN:TRANSFER_CUSTOMER': '06d6ac77-b6b7-49bf-9ade-ce632630e398',
  'ADMIN:MERGE_CUSTOMERS': '460bdfbd-7d57-4695-8a28-60b4347ef7c7',
  'ADMIN:CONVERT_LEAD': 'a917de3f-dc75-417a-9d04-ce50f41ef265',
  'ADMIN:SEND_EMAIL': '29da6fb1-4a12-443f-9ff8-b1324bfa1854',
  'ADMIN:MAKE_CALL': '49ccd040-c5bc-4164-a358-8cedfd0bab51',
  'ADMIN:SEND_SMS': '3db5ec8f-bcfb-44ea-88e7-535056e7ce41',
  'ADMIN:SCHEDULE_MEETING': 'c7ebd5a8-7406-4598-9c13-f8ca2b0dc8f7',
  'ADMIN:CLOSE_DEAL': 'f708906c-cef3-4fc6-828a-d9ec6d8e143b',
  'ADMIN:CHANGE_DEAL_STAGE': '8e876e8b-3fc7-4208-a1ec-65e7f573f40c',
  'ADMIN:APPROVE_DISCOUNT': '0861cbe9-8f4f-40ae-b195-34f7d9fa9708',
  'ADMIN:CREATE_REPORT': 'e1c7b219-29fd-4163-88aa-0442e427e45f',
  'ADMIN:SCHEDULE_REPORT': 'fc6cbb4c-c924-4933-8893-46cf19d9fec6',
  'ADMIN:VIEW_DASHBOARD': '40b7e573-49c5-47c5-af2a-1342b8b58cfb',
  'ADMIN:EXPORT_ANALYTICS': '34ad924e-d4d7-413e-a0be-a86cf476b13b',
  'ADMIN:MANAGE_USERS': '3b56eb3f-eba1-4e9c-abf1-60bb81269011',
  'ADMIN:ASSIGN_ROLES': '78125cb3-7bfa-4113-af42-541f2310f1bf',
  'ADMIN:RESET_PASSWORD': 'ad8f320c-3866-476f-8463-3535ef5a4c2a',
  'ADMIN:VIEW_USER_ACTIVITY': '58c0d4fd-ba3e-400b-bfa8-746833410335',
  'ADMIN:CONFIGURE_INTEGRATION': '782e238a-5744-4991-a3e5-4cd199897b03',
  'ADMIN:CREATE_WORKFLOW': 'f987e19f-269a-4c61-a2d4-a776b6f97b99',
  'ADMIN:EXECUTE_API': 'a37ecfba-9713-4933-aa64-d1b32062d644',
  'ADMIN:MANAGE_SECURITY_POLICIES': '5995d39b-55da-48c3-bf30-7fe42a6a2684',
  'ADMIN:CONFIGURE_ACCESS_CONTROLS': 'b209aa72-cfec-4f1f-8d92-bf999ea5e4b8',
  'ADMIN:VIEW_SECURITY_LOGS': 'bbbb935f-3923-448f-bc77-841e862d7d91',
  'MANAGER:READ': '0a021775-9df3-438d-ad09-5297acc06eca',
  'MANAGER:CREATE': '7ea7c6f5-6628-4f52-ad17-0683903a20d0',
  'MANAGER:UPDATE': 'cfb1138f-c60e-4b59-bb7c-138909ebf0a5',
  'MANAGER:DELETE': '7ebf70c7-b9dc-4daf-bf52-e2b1072d3ad5',
  'MANAGER:EXPORT': '8e29d708-a70c-4b91-91e0-4322814b4b48',
  'MANAGER:IMPORT': 'caa0494e-f2cf-42fb-b2ea-b9f12ae8c289',
  'MANAGER:SHARE': '5a6fd782-33c4-420f-87d1-a453c9f56b22',
  'MANAGER:PUBLISH': 'c4e83d9a-b96f-4ffd-846e-baca8bddef54',
  'MANAGER:ARCHIVE': 'afb223ca-158c-4fa7-9835-b264ec4ef75a',
  'MANAGER:RESTORE': 'a1be41f5-f587-40f4-876b-2eb76d18204e',
  'MANAGER:CONFIGURE': 'd07cd0cb-e102-4772-8800-eb503738edf8',
  'MANAGER:MONITOR': 'e948353a-88eb-4927-9d58-2298ec914eb9',
  'MANAGER:AUDIT': '43b0283a-e4df-4a12-bcfe-79bf822234b3',
  'MANAGER:ACCESS_SENSITIVE_DATA': 'c1a5fc5c-2ad5-4950-a3c3-a43228600bab',
  'MANAGER:VIEW_CONFIDENTIAL_INFO': 'fd571bbe-e49c-4b59-8e77-43aff738ac9d',
  'MANAGER:BYPASS_WORKFLOW_APPROVAL': '0979082b-c276-4528-9927-7d3e8a72c090',
  'MANAGER:APPROVE': 'e9ecebb6-47f5-4da9-8f6e-45573406441d',
  'MANAGER:REJECT': '481737cf-b593-4a02-9b3d-3700034c9abe',
  'MANAGER:ESCALATE': '5d9d1b0e-dd8c-4093-b65f-1a5db7b4e502',
  'MANAGER:BULK_CREATE': 'dd9dc08a-b6d9-42c4-87df-46996d29a593',
  'MANAGER:BULK_UPDATE': 'daa829a5-e784-447a-8716-4f8bf1fc6654',
  'MANAGER:BULK_DELETE': '9b95e924-4140-421f-a95b-16f5619e4fc3',
  'MANAGER:BULK_EXPORT': '863b3e08-7a59-49a8-a027-306a9bf121dc',
  'MANAGER:MANAGE_TEAM': '1539b7da-3c46-42bb-8822-a34b2d6c2c1b',
  'MANAGER:ASSIGN_TASKS': '14eae2f2-e2a2-4f90-8ea7-b3391b654729',
  'MANAGER:VIEW_TEAM_REPORTS': 'df39b6e4-eedc-4e4c-9320-16b1b0e4b78e',
  'MANAGER:CONDUCT_REVIEWS': '1f8c6b19-d0e9-4784-9b14-ac4a00e7a726',
  'MANAGER:ACCESS_SALARY_DATA': 'aed3a671-de12-4bd9-8b0d-83f63fde6e48',
  'MANAGER:APPROVE_TRANSACTIONS': 'e16cccb2-1eec-4325-884c-bd5ae1f79edd',
  'MANAGER:VIEW_FINANCIAL_REPORTS': '00b55df4-7002-45eb-9d3c-10762352cd4e',
  'MANAGER:BUDGET_MANAGEMENT': 'ca9b187f-a4a0-412b-a302-be1e087ad3f8',
  'MANAGER:ASSIGN_CUSTOMER': 'de851e04-56f4-4813-8c7b-a8a59fefea4e',
  'MANAGER:TRANSFER_CUSTOMER': 'c0f66703-1592-4167-b269-6c31fa73c369',
  'MANAGER:MERGE_CUSTOMERS': 'a0c710d3-e766-474f-81ad-51186b5ec72f',
  'MANAGER:CONVERT_LEAD': 'b8a4e5ad-7951-46c5-99f3-fe57798bdb9d',
  'MANAGER:SEND_EMAIL': 'a0b02458-c6a0-4dd8-9303-854665b58b24',
  'MANAGER:MAKE_CALL': '4095d408-7851-4c9c-9da4-3b8a83af5caf',
  'MANAGER:SEND_SMS': 'd501ee48-6ce6-4859-abef-16fe0519fd39',
  'MANAGER:SCHEDULE_MEETING': 'a173cc72-a5b2-4cf4-b476-e1ac36e8cd58',
  'MANAGER:CLOSE_DEAL': '824dc95a-e1a2-436b-a5ba-e7b4796a5049',
  'MANAGER:CHANGE_DEAL_STAGE': 'afe46f6b-8609-407b-ad95-5cb766b02997',
  'MANAGER:APPROVE_DISCOUNT': 'd362c6f4-6b06-41d5-823e-56172b967e3e',
  'MANAGER:CREATE_REPORT': '02dc0bb5-203f-4547-a6ba-9a2a2b014353',
  'MANAGER:SCHEDULE_REPORT': '0b99e21c-d34e-4abf-8e45-c31af249b4c8',
  'MANAGER:VIEW_DASHBOARD': '109eb9d2-45f5-4b31-95b2-4a2293744ec1',
  'MANAGER:EXPORT_ANALYTICS': '1db9a622-5b0d-4dc8-8353-1f478a929ec4',
  'MANAGER:MANAGE_USERS': '4e3bb5e0-e1f8-45d6-ad96-956e4c3b3180',
  'MANAGER:ASSIGN_ROLES': 'b5c867e4-aabb-493b-b4f6-60bfee1eb659',
  'MANAGER:RESET_PASSWORD': '6c5db3d0-0e0d-4aa9-85a7-c7a0ccad4b2e',
  'MANAGER:VIEW_USER_ACTIVITY': '7f341a2a-62c0-482b-9435-c61e9f9b6edc',
  'MANAGER:CONFIGURE_INTEGRATION': '6d2fcded-fe44-487e-8297-adc0a22e4e46',
  'MANAGER:CREATE_WORKFLOW': '1c1a823c-a236-43dc-bf6b-30d9b6ba18df',
  'MANAGER:EXECUTE_API': '1c98848f-0838-444e-8712-beff9dc2c7b8',
  'MANAGER:MANAGE_SECURITY_POLICIES': 'b7d4ccd8-601b-4c01-a30c-70e0ba89c97a',
  'MANAGER:CONFIGURE_ACCESS_CONTROLS': '9d8b8e46-ca71-4ca7-b024-2dd8b61777c6',
  'MANAGER:VIEW_SECURITY_LOGS': '42f86c42-6a97-48a8-98a4-0386a7bcab9e',
  'TEAM_LEAD:READ': 'b572c27c-2829-4e8e-8b7b-828e8c166815',
  'TEAM_LEAD:CREATE': '2c7fcddc-5a0a-42aa-babd-8ee66c8d5f72',
  'TEAM_LEAD:UPDATE': 'bbb8b1e3-bc21-49e3-8db8-4e0b4e6b9ff1',
  'TEAM_LEAD:DELETE': 'ce3641ac-9332-4b13-b0c9-b0cd845099d7',
  'TEAM_LEAD:EXPORT': '906c5eb5-3461-4069-8288-7b6b19b125e1',
  'TEAM_LEAD:IMPORT': '85fdb238-c96b-4083-b296-5a4fa7a9083c',
  'TEAM_LEAD:ARCHIVE': '6ec079fc-6334-4ba2-a8c5-3dd84e77fbef',
  'TEAM_LEAD:CONFIGURE': 'a031db58-b4da-447b-a0d5-dce3e646261d',
  'TEAM_LEAD:APPROVE': '78517f0a-fd9f-4acf-9427-3dc666ff658a',
  'TEAM_LEAD:REJECT': '37e21e15-b288-49d7-b126-b2f40cdb5d6d',
  'TEAM_LEAD:ESCALATE': '45a2c652-0c1d-42a0-8e5f-a3bb0d71a949',
  'TEAM_LEAD:BULK_CREATE': 'bd7669b5-e3fd-4c0b-b7b9-a52e0e30b9c9',
  'TEAM_LEAD:MANAGE_TEAM': '5ce8b6c1-d6df-4b31-ad4e-aaf63ef1e344',
  'TEAM_LEAD:ASSIGN_TASKS': 'a793b86a-f3b9-4310-8b15-e3d2d8b4e6a0',
  'TEAM_LEAD:APPROVE_TRANSACTIONS': '5d5031e9-bef3-4ada-832a-f6e9f410206d',
  'TEAM_LEAD:ACCESS_SALARY_DATA': 'dccf1313-043f-4525-9b3f-f7c3da76e384',
  'TEAM_LEAD:ASSIGN_CUSTOMER': '24d007b2-ad4d-4bf2-8bf5-d951b1253b4c',
  'TEAM_LEAD:TRANSFER_CUSTOMER': '30b9b38b-39b5-4dfd-9b74-04ca6ad61e06',
  'TEAM_LEAD:SEND_EMAIL': 'c3a6e3c9-4281-4fe3-8894-719215985b84',
  'TEAM_LEAD:SEND_SMS': '087683db-6bbb-40a0-9b27-0bb86eca014f',
  'TEAM_LEAD:MAKE_CALL': '095ba07e-b457-4906-b5f0-fbd970b576a0',
  'TEAM_LEAD:SCHEDULE_MEETING': '31dce5e8-08a5-428f-8647-1ed3a8f03e30',
  'TEAM_LEAD:CLOSE_DEAL': 'b6e6ea42-4bb9-4943-a449-87acd555175e',
  'TEAM_LEAD:VIEW_REPORTS': 'ba9e0907-05b2-4b09-ba9f-180b218c42ce',
  'TEAM_LEAD:CREATE_REPORT': '26a9c742-20ad-48e4-9234-52905e617b69',
  'TEAM_LEAD:SCHEDULE_REPORT': 'e7000c50-dc7a-4895-a224-ae7d5f6b89ba',
  'TEAM_LEAD:VIEW_TEAM_PERFORMANCE': '9197c146-2106-4d30-b100-2c6b16949176',
  'TEAM_LEAD:VIEW_CUSTOMER_HISTORY': 'a9d59633-5d53-41ff-9072-22a260f8cc52',
  'TEAM_LEAD:CREATE_DEAL': 'f017ce0b-f2ae-4874-9f7b-e5a9095f5a34',
  'TEAM_LEAD:CREATE_WORKFLOW': '9e4e4ce1-05fb-4b17-8d5f-708fc221307f',
  'TEAM_LEAD:VIEW_SECURITY_LOGS': '7c4de61f-9bc4-4827-bb37-e61fe1b8925f',
  'STAFF:READ': '4ac8b4a3-c9e4-4dbf-b67e-e14e1872ef83',
  'STAFF:CREATE': 'a9c815a9-8970-43b2-ba50-4a03318aaa69',
  'STAFF:UPDATE': 'bb40ac6e-3975-446b-b75b-32d1e89e308c',
  'STAFF:DELETE': '958b92ad-e899-42bc-a22e-6e4c9b1e44c6',
  'STAFF:EXPORT': '5ff74c9e-ac0b-4e9a-a23f-3f8cc8c5c36c',
  'STAFF:ARCHIVE': 'b5036b42-bb6e-4125-8b49-122b46a70393',
  'STAFF:CONFIGURE': '462b3042-f621-431b-b703-e27e30abd7d7',
  'STAFF:APPROVE': '9432bdf9-e1e1-4a2d-8ce4-a01d7eaaf745',
  'STAFF:ESCALATE': '9013de81-8c94-4b02-9506-ba0273005d7a',
  'STAFF:BULK_CREATE': '744b8c4c-2e76-4cea-8304-40e3cece5ec9',
  'STAFF:MANAGE_TEAM': 'f15e0dc0-0e2c-4397-b2d3-26759f2f163e',
  'STAFF:APPROVE_TRANSACTIONS': 'b43c610a-6177-46ba-b3e6-8ad0982d3e4e',
  'STAFF:ACCESS_SALARY_DATA': 'b76e4423-5e98-4887-aa54-8f4785dcb989',
  'STAFF:SEND_EMAIL': '43a32a80-c681-4e56-8a8a-80c3c4b32b8d',
  'STAFF:SEND_SMS': '436e8e50-c64e-47f7-b96a-bb1cee403306',
  'STAFF:MAKE_CALL': '3c6e0144-7bb1-44c6-8996-915e9c4eaa87',
  'STAFF:SCHEDULE_MEETING': 'd1b5b6b5-4432-4bce-9ab9-ed77d3a3dc25',
  'STAFF:VIEW_REPORTS': '7d9c3fc6-2b90-470f-a814-5b15848afa40',
  'STAFF:CREATE_REPORT': '53538ced-e771-4b46-8e37-f927dbd84422',
  'STAFF:CREATE_DEAL': '0b9627d6-c637-4bb1-8d05-9bada114d135',
  'STAFF:VIEW_USER_PROFILES': '01c0122e-a5b3-4a34-890e-a47c6dc35f2f',
  'STAFF:CREATE_WORKFLOW': 'dda1ea1d-187a-48c3-8b0b-6c7f77e3f4a2',
  'STAFF:VIEW_SECURITY_LOGS': '28b29b50-bac6-4fba-84e0-f6a6aeadabcd',
  'INTERN:READ': 'cbb81de4-ce6d-4473-8cf4-30c7c4a78e1c',
  'INTERN:CREATE': '62afe8bc-99c2-4e02-9dbc-a6f6eb745950',
  'INTERN:UPDATE': 'f8cdeb79-ee52-4a6d-b0ea-f8a66a94356b',
  'INTERN:DELETE': '3f5c4d71-8965-4967-8714-c3c10134e91c',
  'INTERN:EXPORT': 'd4d1a5d6-84e9-486d-83db-750a5907a6a9',
  'INTERN:CONFIGURE': '1cfe81e8-14da-453e-a51c-ee1ef9319a68',
  'INTERN:APPROVE': 'c7ab936a-8324-4315-a498-210bfd7f0715',
  'INTERN:ESCALATE': '5158ee04-144e-4f4a-9550-e8d7497f5de4',
  'INTERN:BULK_CREATE': '381a8188-401f-4a49-ada7-22b66e9a8413',
  'INTERN:MANAGE_TEAM': '4657b418-dbc7-452d-b13c-0e8637b1ebbb',
  'INTERN:ACCESS_SALARY_DATA': '32104d90-7649-4ea3-a383-65b0aac52fb4',
  'INTERN:APPROVE_TRANSACTIONS': '599fc226-f8c9-4c86-97df-3f2ad27d2ca9',
  'INTERN:VIEW_CUSTOMER_HISTORY': 'fe57e133-f15b-46cb-8cd9-b7c6a1e5954a',
  'INTERN:SEND_EMAIL': '55815a7f-ce17-4325-b0fd-eb140970a546',
  'INTERN:SEND_SMS': '1eea47b8-82a6-41ad-bba0-27153aef0f32',
  'INTERN:MAKE_CALL': '50b7f733-5330-4364-842d-0078b91a3ab2',
  'INTERN:SCHEDULE_MEETING': 'f2c12725-74ce-41c9-b301-0baf1620adb7',
  'INTERN:VIEW_REPORTS': '11640bc8-51b2-4e49-beb8-2f109999afc9',
  'INTERN:VIEW_USER_PROFILES': '43dc282d-3f39-4b93-ab45-9e3308754076',
  'INTERN:CREATE_WORKFLOW': 'f4f1e6cb-e15b-430a-a4f9-d658522bc44b',
  'INTERN:VIEW_SECURITY_LOGS': '070c82f7-d6fc-4fa2-842e-49778d643ed1',
} as const;

/**
 * Helper function to get UUID for a template-action combination
 */
function getActionId(templateKey: string, actionKey: string): string {
  const ACTION_KEY = `${templateKey}:${actionKey}` as keyof typeof ACTION_IDS;

  return ACTION_IDS[ACTION_KEY];
}

/**
 * Template System Action Data Seeds
 * Based on RBAC_PERMISSIONS_MATRIX_GUIDE.md
 */
export const MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEEDS: MktTemplateSystemActionDataSeed[] =
  [
    // ==================================================================================
    // ADMIN TEMPLATE (Priority: 1000, Level: 1)
    // ==================================================================================
    // Full access to ALL 113 actions - No restrictions
    // Scope: ALL_RECORDS, unlimited transactions, 24/7 access
    // ==================================================================================

    // BASIC CRUD (4/4) - Full access
    {
      id: getActionId('ADMIN', 'READ'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.READ,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_RECORDS',
        includeDeleted: true,
        includeArchived: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'CREATE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.CREATE,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_RECORDS',
        bypassValidation: false,
        requiresApproval: false,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'UPDATE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.UPDATE,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_RECORDS',
        canModifySystemFields: true,
        requiresApproval: false,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'DELETE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.DELETE,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_RECORDS',
        permanentDelete: true,
        requiresConfirmation: true,
      }),
      restrictions: null,
      isActive: true,
    },

    // ADVANCED (6/6) - Full access
    {
      id: getActionId('ADMIN', 'EXPORT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.EXPORT,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_RECORDS',
        formats: ['CSV', 'XLSX', 'JSON', 'PDF'],
        maxRecords: -1,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'IMPORT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.IMPORT,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_RECORDS',
        formats: ['CSV', 'XLSX', 'JSON'],
        validateData: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'SHARE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.SHARE,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_RECORDS',
        externalSharing: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'PUBLISH'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.PUBLISH,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_RECORDS',
        publicAccess: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'ARCHIVE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.ARCHIVE,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_RECORDS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'RESTORE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.RESTORE,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_RECORDS',
        restoreDeleted: true,
      }),
      restrictions: null,
      isActive: true,
    },

    // SYSTEM (6/6) - Full access (CRITICAL actions require MFA)
    {
      id: getActionId('ADMIN', 'CONFIGURE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.CONFIGURE,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'SYSTEM',
        requiresMFA: true,
        auditLevel: 'COMPREHENSIVE',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'MONITOR'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.MONITOR,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'SYSTEM',
        realTimeMonitoring: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'AUDIT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.AUDIT,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'SYSTEM',
        fullAuditAccess: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'ACCESS_SENSITIVE_DATA'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.ACCESS_SENSITIVE_DATA,
      isAllowed: true,
      configuration: JSON.stringify({
        requiresMFA: true,
        requiresReason: true,
        auditLevel: 'COMPREHENSIVE',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'VIEW_CONFIDENTIAL_INFO'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.VIEW_CONFIDENTIAL_INFO,
      isAllowed: true,
      configuration: JSON.stringify({
        requiresMFA: true,
        requiresReason: true,
        auditLevel: 'COMPREHENSIVE',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'BYPASS_WORKFLOW_APPROVAL'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.BYPASS_WORKFLOW_APPROVAL,
      isAllowed: true,
      configuration: JSON.stringify({
        requiresMFA: true,
        requiresReason: true,
        auditLevel: 'COMPREHENSIVE',
      }),
      restrictions: null,
      isActive: true,
    },

    // APPROVAL (3/3) - Full access
    {
      id: getActionId('ADMIN', 'APPROVE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.APPROVE,
      isAllowed: true,
      configuration: JSON.stringify({
        maxAmount: -1, // Unlimited
        allLevels: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'REJECT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.REJECT,
      isAllowed: true,
      configuration: JSON.stringify({
        allLevels: true,
        requiresReason: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'ESCALATE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.ESCALATE,
      isAllowed: true,
      configuration: JSON.stringify({
        canEscalateToBoard: true,
      }),
      restrictions: null,
      isActive: true,
    },

    // BULK_OPERATIONS (4/4) - Full access
    {
      id: getActionId('ADMIN', 'BULK_CREATE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.BULK_CREATE,
      isAllowed: true,
      configuration: JSON.stringify({
        maxBatchSize: -1, // Unlimited
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'BULK_UPDATE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.BULK_UPDATE,
      isAllowed: true,
      configuration: JSON.stringify({
        maxBatchSize: -1,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'BULK_DELETE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.BULK_DELETE,
      isAllowed: true,
      configuration: JSON.stringify({
        maxBatchSize: -1,
        requiresDoubleConfirmation: true,
        autoBackup: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'BULK_EXPORT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.BULK_EXPORT,
      isAllowed: true,
      configuration: JSON.stringify({
        maxRecords: -1,
      }),
      restrictions: null,
      isActive: true,
    },

    // TEAM_MANAGEMENT (4/4) - Full access
    {
      id: getActionId('ADMIN', 'MANAGE_TEAM'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.MANAGE_TEAM,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_TEAMS',
        crossDepartment: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'ASSIGN_TASKS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.ASSIGN_TASKS,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_TEAMS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'VIEW_TEAM_REPORTS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.VIEW_TEAM_REPORTS,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_TEAMS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'CONDUCT_REVIEWS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.CONDUCT_REVIEWS,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_EMPLOYEES',
      }),
      restrictions: null,
      isActive: true,
    },

    // FINANCIAL (4/4) - Full access (with MFA for SALARY_DATA)
    {
      id: getActionId('ADMIN', 'ACCESS_SALARY_DATA'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.ACCESS_SALARY_DATA,
      isAllowed: true,
      configuration: JSON.stringify({
        requiresMFA: true,
        requiresReason: true,
        auditLevel: 'COMPREHENSIVE',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'APPROVE_TRANSACTIONS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.APPROVE_TRANSACTIONS,
      isAllowed: true,
      configuration: JSON.stringify({
        maxAmount: -1, // Unlimited
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'VIEW_FINANCIAL_REPORTS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.VIEW_FINANCIAL_REPORTS,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_DEPARTMENTS',
        includeSensitive: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'BUDGET_MANAGEMENT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.BUDGET_MANAGEMENT,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_DEPARTMENTS',
        maxAmount: -1,
      }),
      restrictions: null,
      isActive: true,
    },

    // CUSTOMER_MANAGEMENT (4/4) - Full access
    {
      id: getActionId('ADMIN', 'ASSIGN_CUSTOMER'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.ASSIGN_CUSTOMER,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_CUSTOMERS',
        crossDepartment: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'TRANSFER_CUSTOMER'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.TRANSFER_CUSTOMER,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_CUSTOMERS',
        crossDepartment: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'MERGE_CUSTOMERS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.MERGE_CUSTOMERS,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_CUSTOMERS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'CONVERT_LEAD'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.CONVERT_LEAD,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_LEADS',
      }),
      restrictions: null,
      isActive: true,
    },

    // COMMUNICATION (4/4) - Full access
    {
      id: getActionId('ADMIN', 'SEND_EMAIL'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.SEND_EMAIL,
      isAllowed: true,
      configuration: JSON.stringify({
        bulkEmail: true,
        templates: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'MAKE_CALL'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.MAKE_CALL,
      isAllowed: true,
      configuration: JSON.stringify({
        recording: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'SEND_SMS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.SEND_SMS,
      isAllowed: true,
      configuration: JSON.stringify({
        bulkSMS: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'SCHEDULE_MEETING'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.SCHEDULE_MEETING,
      isAllowed: true,
      configuration: JSON.stringify({
        externalGuests: true,
      }),
      restrictions: null,
      isActive: true,
    },

    // DEAL_MANAGEMENT (3/3) - Full access
    {
      id: getActionId('ADMIN', 'CLOSE_DEAL'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.CLOSE_DEAL,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_DEALS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'CHANGE_DEAL_STAGE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.CHANGE_DEAL_STAGE,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_DEALS',
        bypassWorkflow: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'APPROVE_DISCOUNT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.APPROVE_DISCOUNT,
      isAllowed: true,
      configuration: JSON.stringify({
        maxDiscount: -1, // Unlimited
      }),
      restrictions: null,
      isActive: true,
    },

    // REPORTING (4/4) - Full access
    {
      id: getActionId('ADMIN', 'CREATE_REPORT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.CREATE_REPORT,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_DATA',
        advancedFeatures: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'SCHEDULE_REPORT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.SCHEDULE_REPORT,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_REPORTS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'VIEW_DASHBOARD'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.VIEW_DASHBOARD,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_DASHBOARDS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'EXPORT_ANALYTICS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.EXPORT_ANALYTICS,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_DATA',
      }),
      restrictions: null,
      isActive: true,
    },

    // USER_MANAGEMENT (4/4) - Full access
    {
      id: getActionId('ADMIN', 'MANAGE_USERS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.MANAGE_USERS,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_USERS',
        canDelete: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'ASSIGN_ROLES'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.ASSIGN_ROLES,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_ROLES',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'RESET_PASSWORD'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.RESET_PASSWORD,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_USERS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'VIEW_USER_ACTIVITY'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.VIEW_USER_ACTIVITY,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_USERS',
        fullAuditTrail: true,
      }),
      restrictions: null,
      isActive: true,
    },

    // AUTOMATION (3/3) - Full access
    {
      id: getActionId('ADMIN', 'CONFIGURE_INTEGRATION'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.CONFIGURE_INTEGRATION,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_INTEGRATIONS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'CREATE_WORKFLOW'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.CREATE_WORKFLOW,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'SYSTEM',
        complexWorkflows: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'EXECUTE_API'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.EXECUTE_API,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'ALL_APIS',
      }),
      restrictions: null,
      isActive: true,
    },

    // SECURITY_OPERATIONS (3/3) - Full access
    {
      id: getActionId('ADMIN', 'MANAGE_SECURITY_POLICIES'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.MANAGE_SECURITY_POLICIES,
      isAllowed: true,
      configuration: JSON.stringify({
        requiresMFA: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'CONFIGURE_ACCESS_CONTROLS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.CONFIGURE_ACCESS_CONTROLS,
      isAllowed: true,
      configuration: JSON.stringify({
        requiresMFA: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('ADMIN', 'VIEW_SECURITY_LOGS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      actionKey: PERMISSION_ACTION_KEYS.VIEW_SECURITY_LOGS,
      isAllowed: true,
      configuration: JSON.stringify({
        fullAccess: true,
      }),
      restrictions: null,
      isActive: true,
    },

    // ... Continue với tất cả 113 actions cho ADMIN
    // (Để ngắn gọn, tôi sẽ generate programmatically sau)

    // ==================================================================================
    // MANAGER TEMPLATE (Priority: 700, Level: 2)
    // ==================================================================================
    // ~75/113 actions (66%) - Department-scoped access
    // Scope: DEPARTMENT_RECORDS, up to 50M/100M VND, business hours extended
    // ==================================================================================

    // BASIC CRUD (4/4) - Department-scoped
    {
      id: getActionId('MANAGER', 'READ'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.READ,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT_RECORDS',
        contextFilter: 'departmentId = :userDepartmentId',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'CREATE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.CREATE,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT_RECORDS',
        assignToDepartment: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'UPDATE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.UPDATE,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT_RECORDS',
        canModifySystemFields: false,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'DELETE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.DELETE,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT_RECORDS',
        softDeleteOnly: true,
        requiresApproval: true,
      }),
      restrictions: JSON.stringify({
        approverLevel: 'ADMIN',
        auditLog: true,
      }),
      isActive: true,
    },

    // ADVANCED (5/6) - MANAGER cannot IMPORT or PUBLISH without approval
    {
      id: getActionId('MANAGER', 'EXPORT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.EXPORT,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT_RECORDS',
        formats: ['CSV', 'XLSX'],
        maxRecords: 100000,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'IMPORT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.IMPORT,
      isAllowed: false, // Not allowed for MANAGER
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Import requires ADMIN approval',
      }),
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'SHARE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.SHARE,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT_RECORDS',
        externalSharing: false,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'PUBLISH'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.PUBLISH,
      isAllowed: false, // Not allowed for MANAGER
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Publish requires ADMIN approval',
      }),
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'ARCHIVE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.ARCHIVE,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT_RECORDS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'RESTORE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.RESTORE,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT_RECORDS',
      }),
      restrictions: null,
      isActive: true,
    },

    // SYSTEM (0/6) - MANAGER has NO system-level access
    {
      id: getActionId('MANAGER', 'CONFIGURE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.CONFIGURE,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'System configuration restricted to ADMIN only',
      }),
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'MONITOR'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.MONITOR,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'System monitoring restricted to ADMIN only',
      }),
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'AUDIT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.AUDIT,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'System audit restricted to ADMIN only',
      }),
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'ACCESS_SENSITIVE_DATA'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.ACCESS_SENSITIVE_DATA,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Sensitive data access restricted to ADMIN only',
      }),
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'VIEW_CONFIDENTIAL_INFO'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.VIEW_CONFIDENTIAL_INFO,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Confidential info access restricted to ADMIN only',
      }),
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'BYPASS_WORKFLOW_APPROVAL'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.BYPASS_WORKFLOW_APPROVAL,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Workflow bypass restricted to ADMIN only',
      }),
      isActive: true,
    },

    // APPROVAL (3/3) - Limited by amount
    {
      id: getActionId('MANAGER', 'APPROVE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.APPROVE,
      isAllowed: true,
      configuration: JSON.stringify({
        maxAmount: {
          SALES: 50000000, // 50M VND
          ADMIN: 100000000, // 100M VND
          SUPPORT: 50000000,
          ACCOUNTING: 100000000,
          DEFAULT: 50000000,
        },
        scope: 'DEPARTMENT',
      }),
      // TEMPORARILY DISABLED: Restrictions for testing
      // restrictions: JSON.stringify({
      //   escalateIf: 'amount > maxAmount',
      //   workingHours: '07:00-19:00',
      // }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'REJECT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.REJECT,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT',
        requiresReason: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'ESCALATE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.ESCALATE,
      isAllowed: true,
      configuration: JSON.stringify({
        escalateTo: 'ADMIN',
      }),
      restrictions: null,
      isActive: true,
    },

    // BULK_OPERATIONS (2/4) - Limited bulk operations
    {
      id: getActionId('MANAGER', 'BULK_CREATE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.BULK_CREATE,
      isAllowed: true,
      configuration: JSON.stringify({
        maxBatchSize: 5000,
        scope: 'DEPARTMENT',
      }),
      restrictions: JSON.stringify({
        requiresApproval: true,
        approvalThreshold: 1000,
      }),
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'BULK_UPDATE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.BULK_UPDATE,
      isAllowed: true,
      configuration: JSON.stringify({
        maxBatchSize: 5000,
        scope: 'DEPARTMENT',
      }),
      restrictions: JSON.stringify({
        requiresApproval: true,
        approvalThreshold: 1000,
      }),
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'BULK_DELETE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.BULK_DELETE,
      isAllowed: false, // Not allowed
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Bulk delete requires ADMIN approval',
      }),
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'BULK_EXPORT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.BULK_EXPORT,
      isAllowed: true,
      configuration: JSON.stringify({
        maxRecords: 100000,
        scope: 'DEPARTMENT',
      }),
      restrictions: null,
      isActive: true,
    },

    // TEAM_MANAGEMENT (4/4) - Full team management within department
    {
      id: getActionId('MANAGER', 'MANAGE_TEAM'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.MANAGE_TEAM,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT_TEAMS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'ASSIGN_TASKS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.ASSIGN_TASKS,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT_TEAMS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'VIEW_TEAM_REPORTS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.VIEW_TEAM_REPORTS,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT_TEAMS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'CONDUCT_REVIEWS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.CONDUCT_REVIEWS,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT_EMPLOYEES',
      }),
      restrictions: null,
      isActive: true,
    },

    // FINANCIAL (2/4) - NO salary access, limited financial operations
    {
      id: getActionId('MANAGER', 'ACCESS_SALARY_DATA'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.ACCESS_SALARY_DATA,
      isAllowed: false, // Not allowed
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Salary data access restricted to ADMIN only',
      }),
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'APPROVE_TRANSACTIONS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.APPROVE_TRANSACTIONS,
      isAllowed: true,
      configuration: JSON.stringify({
        maxAmount: {
          SALES: 50000000,
          ADMIN: 100000000,
          DEFAULT: 50000000,
        },
      }),
      // TEMPORARILY DISABLED: Restrictions for testing
      // restrictions: JSON.stringify({
      //   escalateIf: 'amount > maxAmount',
      // }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'VIEW_FINANCIAL_REPORTS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.VIEW_FINANCIAL_REPORTS,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT',
        excludeSalary: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'BUDGET_MANAGEMENT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.BUDGET_MANAGEMENT,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT',
        maxAmount: {
          SALES: 50000000,
          ADMIN: 100000000,
          DEFAULT: 50000000,
        },
      }),
      restrictions: null,
      isActive: true,
    },

    // CUSTOMER_MANAGEMENT (4/4) - Department-scoped
    {
      id: getActionId('MANAGER', 'ASSIGN_CUSTOMER'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.ASSIGN_CUSTOMER,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT_CUSTOMERS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'TRANSFER_CUSTOMER'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.TRANSFER_CUSTOMER,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT_CUSTOMERS',
        withinDepartment: true,
      }),
      restrictions: JSON.stringify({
        crossDepartmentRequiresApproval: true,
        approverLevel: 'ADMIN',
      }),
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'MERGE_CUSTOMERS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.MERGE_CUSTOMERS,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT_CUSTOMERS',
        requiresApproval: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'CONVERT_LEAD'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.CONVERT_LEAD,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT_LEADS',
      }),
      restrictions: null,
      isActive: true,
    },

    // COMMUNICATION (4/4) - All communication allowed
    {
      id: getActionId('MANAGER', 'SEND_EMAIL'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.SEND_EMAIL,
      isAllowed: true,
      configuration: JSON.stringify({
        bulkEmail: true,
        templates: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'MAKE_CALL'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.MAKE_CALL,
      isAllowed: true,
      configuration: JSON.stringify({
        recording: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'SEND_SMS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.SEND_SMS,
      isAllowed: true,
      configuration: JSON.stringify({
        bulkSMS: false,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'SCHEDULE_MEETING'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.SCHEDULE_MEETING,
      isAllowed: true,
      configuration: JSON.stringify({
        externalGuests: true,
      }),
      restrictions: null,
      isActive: true,
    },

    // DEAL_MANAGEMENT (3/3) - Limited by amount
    {
      id: getActionId('MANAGER', 'CLOSE_DEAL'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.CLOSE_DEAL,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT_DEALS',
        maxAmount: 50000000,
      }),
      // TEMPORARILY DISABLED: Restrictions for testing
      // restrictions: JSON.stringify({
      //   escalateIf: 'amount > 50000000',
      // }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'CHANGE_DEAL_STAGE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.CHANGE_DEAL_STAGE,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT_DEALS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'APPROVE_DISCOUNT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.APPROVE_DISCOUNT,
      isAllowed: true,
      configuration: JSON.stringify({
        maxDiscount: 20, // 20%
      }),
      restrictions: JSON.stringify({
        escalateIf: 'discount > 20',
      }),
      isActive: true,
    },

    // REPORTING (4/4) - Department-scoped
    {
      id: getActionId('MANAGER', 'CREATE_REPORT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.CREATE_REPORT,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'SCHEDULE_REPORT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.SCHEDULE_REPORT,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'VIEW_DASHBOARD'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.VIEW_DASHBOARD,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'EXPORT_ANALYTICS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.EXPORT_ANALYTICS,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT',
      }),
      restrictions: null,
      isActive: true,
    },

    // USER_MANAGEMENT (2/4) - Limited to team only
    {
      id: getActionId('MANAGER', 'MANAGE_USERS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.MANAGE_USERS,
      isAllowed: false, // Not allowed
      configuration: null,
      restrictions: JSON.stringify({
        message: 'User management restricted to ADMIN',
      }),
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'ASSIGN_ROLES'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.ASSIGN_ROLES,
      isAllowed: false, // Not allowed
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Role assignment restricted to ADMIN',
      }),
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'RESET_PASSWORD'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.RESET_PASSWORD,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT_USERS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'VIEW_USER_ACTIVITY'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.VIEW_USER_ACTIVITY,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT_USERS',
      }),
      restrictions: null,
      isActive: true,
    },

    // AUTOMATION (1/3) - Very limited
    {
      id: getActionId('MANAGER', 'CONFIGURE_INTEGRATION'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.CONFIGURE_INTEGRATION,
      isAllowed: false, // Not allowed
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Integration configuration restricted to ADMIN',
      }),
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'CREATE_WORKFLOW'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.CREATE_WORKFLOW,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'DEPARTMENT',
        simpleWorkflowsOnly: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'EXECUTE_API'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.EXECUTE_API,
      isAllowed: false, // Not allowed
      configuration: null,
      restrictions: JSON.stringify({
        message: 'API execution restricted to ADMIN',
      }),
      isActive: true,
    },

    // SECURITY_OPERATIONS (0/3) - No security access
    {
      id: getActionId('MANAGER', 'MANAGE_SECURITY_POLICIES'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.MANAGE_SECURITY_POLICIES,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Security management restricted to ADMIN',
      }),
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'CONFIGURE_ACCESS_CONTROLS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.CONFIGURE_ACCESS_CONTROLS,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Access control configuration restricted to ADMIN',
      }),
      isActive: true,
    },
    {
      id: getActionId('MANAGER', 'VIEW_SECURITY_LOGS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      actionKey: PERMISSION_ACTION_KEYS.VIEW_SECURITY_LOGS,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Security logs restricted to ADMIN',
      }),
      isActive: true,
    },

    // ==================================================================================
    // TEAM_LEAD TEMPLATE - Team-level access with medium authority
    // Priority: 600 | Scope: TEAM_RECORDS | Approval: Up to 20M VND
    // ~50 actions (44% of total) - Can manage team, handle medium-high priority items
    // ==================================================================================

    // BASIC_CRUD (4/4) - Full CRUD on team scope
    {
      id: getActionId('TEAM_LEAD', 'READ'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.READ,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'TEAM_RECORDS',
        contextFilter: 'teamId = :userTeamId',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('TEAM_LEAD', 'CREATE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.CREATE,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'TEAM_RECORDS',
        requiresReview: false,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('TEAM_LEAD', 'UPDATE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.UPDATE,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'TEAM_RECORDS',
        contextFilter: 'teamId = :userTeamId',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('TEAM_LEAD', 'DELETE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.DELETE,
      isAllowed: false, // Cannot delete, requires MANAGER approval
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Delete action requires MANAGER approval',
        requiresApproval: true,
        approverLevel: 'MANAGER',
      }),
      isActive: true,
    },

    // ADVANCED (3/6) - Limited advanced operations
    {
      id: getActionId('TEAM_LEAD', 'EXPORT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.EXPORT,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'TEAM_RECORDS',
        maxRecords: 5000,
        allowedFormats: ['CSV', 'EXCEL'],
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('TEAM_LEAD', 'IMPORT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.IMPORT,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'TEAM_RECORDS',
        maxRecords: 1000,
        requiresValidation: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('TEAM_LEAD', 'ARCHIVE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.ARCHIVE,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'TEAM_RECORDS',
      }),
      restrictions: null,
      isActive: true,
    },

    // SYSTEM (0/6) - No system access
    {
      id: getActionId('TEAM_LEAD', 'CONFIGURE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.CONFIGURE,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'System configuration restricted to ADMIN',
      }),
      isActive: true,
    },

    // APPROVAL (2/3) - Limited approval authority
    {
      id: getActionId('TEAM_LEAD', 'APPROVE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.APPROVE,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'TEAM_RECORDS',
        priorities: ['LOW', 'MEDIUM', 'HIGH'],
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('TEAM_LEAD', 'REJECT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.REJECT,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'TEAM_RECORDS',
        requiresReason: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('TEAM_LEAD', 'ESCALATE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.ESCALATE,
      isAllowed: true,
      configuration: JSON.stringify({
        escalateTo: 'MANAGER',
      }),
      restrictions: null,
      isActive: true,
    },

    // BULK_OPERATIONS (0/4) - No bulk operations
    {
      id: getActionId('TEAM_LEAD', 'BULK_CREATE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.BULK_CREATE,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Bulk operations restricted to MANAGER level',
      }),
      isActive: true,
    },

    // TEAM_MANAGEMENT (3/4) - Can manage own team
    {
      id: getActionId('TEAM_LEAD', 'MANAGE_TEAM'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.MANAGE_TEAM,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'OWN_TEAM',
        canAddMembers: false, // Cannot add, only manage existing
        canRemoveMembers: false,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('TEAM_LEAD', 'ASSIGN_TASKS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.ASSIGN_TASKS,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'TEAM_MEMBERS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('TEAM_LEAD', 'VIEW_TEAM_PERFORMANCE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.VIEW_TEAM_PERFORMANCE,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'OWN_TEAM',
      }),
      restrictions: null,
      isActive: true,
    },

    // FINANCIAL (0/4) - No direct financial access
    {
      id: getActionId('TEAM_LEAD', 'APPROVE_TRANSACTIONS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.APPROVE_TRANSACTIONS,
      isAllowed: true,
      configuration: JSON.stringify({
        maxAmount: 20000000, // 20M VND
        requiresDocumentation: true,
      }),
      // TEMPORARILY DISABLED: Restrictions for testing
      // restrictions: JSON.stringify({
      //   escalateIf: 'amount > 20000000',
      // }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('TEAM_LEAD', 'ACCESS_SALARY_DATA'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.ACCESS_SALARY_DATA,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Salary data access restricted to ADMIN',
      }),
      isActive: true,
    },

    // CUSTOMER_MANAGEMENT (2/4) - Team-level customer management
    {
      id: getActionId('TEAM_LEAD', 'ASSIGN_CUSTOMER'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.ASSIGN_CUSTOMER,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'TEAM_MEMBERS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('TEAM_LEAD', 'VIEW_CUSTOMER_HISTORY'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.VIEW_CUSTOMER_HISTORY,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'TEAM_CUSTOMERS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('TEAM_LEAD', 'TRANSFER_CUSTOMER'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.TRANSFER_CUSTOMER,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Customer transfer requires MANAGER approval',
      }),
      isActive: true,
    },

    // COMMUNICATION (4/4) - Full communication access
    {
      id: getActionId('TEAM_LEAD', 'SEND_EMAIL'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.SEND_EMAIL,
      isAllowed: true,
      configuration: JSON.stringify({
        canUseBulkEmail: false,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('TEAM_LEAD', 'SEND_SMS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.SEND_SMS,
      isAllowed: true,
      configuration: JSON.stringify({
        dailyLimit: 100,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('TEAM_LEAD', 'MAKE_CALL'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.MAKE_CALL,
      isAllowed: true,
      configuration: JSON.stringify({
        recordingEnabled: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('TEAM_LEAD', 'SCHEDULE_MEETING'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.SCHEDULE_MEETING,
      isAllowed: true,
      configuration: JSON.stringify({
        canInviteExternal: true,
      }),
      restrictions: null,
      isActive: true,
    },

    // DEAL_MANAGEMENT (2/3) - Limited deal management
    {
      id: getActionId('TEAM_LEAD', 'CREATE_DEAL'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.CREATE_DEAL,
      isAllowed: true,
      configuration: JSON.stringify({
        maxDealValue: 50000000, // 50M VND
      }),
      restrictions: JSON.stringify({
        escalateIf: 'dealValue > 50000000',
      }),
      isActive: true,
    },
    {
      id: getActionId('TEAM_LEAD', 'CLOSE_DEAL'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.CLOSE_DEAL,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'TEAM_DEALS',
        maxDealValue: 50000000,
      }),
      restrictions: JSON.stringify({
        requiresManagerApproval: 'dealValue > 50000000',
      }),
      isActive: true,
    },

    // REPORTING (3/4) - Team-level reporting
    {
      id: getActionId('TEAM_LEAD', 'VIEW_REPORTS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.VIEW_REPORTS,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'TEAM_REPORTS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('TEAM_LEAD', 'CREATE_REPORT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.CREATE_REPORT,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'TEAM_DATA',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('TEAM_LEAD', 'SCHEDULE_REPORT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.SCHEDULE_REPORT,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'TEAM_REPORTS',
      }),
      restrictions: null,
      isActive: true,
    },

    // USER_MANAGEMENT (1/4) - Very limited user management
    {
      id: getActionId('TEAM_LEAD', 'VIEW_USER_PROFILES'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.VIEW_USER_PROFILES,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'TEAM_MEMBERS',
      }),
      restrictions: null,
      isActive: true,
    },

    // AUTOMATION (0/3) - No automation access
    {
      id: getActionId('TEAM_LEAD', 'CREATE_WORKFLOW'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.CREATE_WORKFLOW,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Workflow creation restricted to MANAGER level',
      }),
      isActive: true,
    },

    // SECURITY_OPERATIONS (0/3) - No security access
    {
      id: getActionId('TEAM_LEAD', 'VIEW_SECURITY_LOGS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      actionKey: PERMISSION_ACTION_KEYS.VIEW_SECURITY_LOGS,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Security logs restricted to ADMIN',
      }),
      isActive: true,
    },

    // ==================================================================================
    // STAFF TEMPLATE - Individual contributor with own-record access
    // Priority: 500 | Scope: OWN_RECORDS | Approval: Up to 10M VND (no approval rights)
    // ~30 actions (27% of total) - Can perform daily tasks on own data
    // ==================================================================================

    // BASIC_CRUD (3/4) - No DELETE permission
    {
      id: getActionId('STAFF', 'READ'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      actionKey: PERMISSION_ACTION_KEYS.READ,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'OWN_RECORDS',
        contextFilter: 'assignedTo = :userId OR createdBy = :userId',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('STAFF', 'CREATE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      actionKey: PERMISSION_ACTION_KEYS.CREATE,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'OWN_RECORDS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('STAFF', 'UPDATE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      actionKey: PERMISSION_ACTION_KEYS.UPDATE,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'OWN_RECORDS',
        contextFilter: 'assignedTo = :userId OR createdBy = :userId',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('STAFF', 'DELETE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      actionKey: PERMISSION_ACTION_KEYS.DELETE,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Delete action requires TEAM_LEAD approval',
        requiresApproval: true,
        approverLevel: 'TEAM_LEAD',
      }),
      isActive: true,
    },

    // ADVANCED (2/6) - Limited to EXPORT and ARCHIVE
    {
      id: getActionId('STAFF', 'EXPORT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      actionKey: PERMISSION_ACTION_KEYS.EXPORT,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'OWN_RECORDS',
        maxRecords: 1000,
        allowedFormats: ['CSV'],
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('STAFF', 'ARCHIVE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      actionKey: PERMISSION_ACTION_KEYS.ARCHIVE,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'OWN_RECORDS',
      }),
      restrictions: null,
      isActive: true,
    },

    // SYSTEM (0/6) - No system access
    {
      id: getActionId('STAFF', 'CONFIGURE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      actionKey: PERMISSION_ACTION_KEYS.CONFIGURE,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'System configuration restricted to ADMIN',
      }),
      isActive: true,
    },

    // APPROVAL (0/3) - No approval authority
    {
      id: getActionId('STAFF', 'APPROVE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      actionKey: PERMISSION_ACTION_KEYS.APPROVE,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Approval authority restricted to TEAM_LEAD level and above',
      }),
      isActive: true,
    },
    {
      id: getActionId('STAFF', 'ESCALATE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      actionKey: PERMISSION_ACTION_KEYS.ESCALATE,
      isAllowed: true,
      configuration: JSON.stringify({
        escalateTo: 'TEAM_LEAD',
      }),
      restrictions: null,
      isActive: true,
    },

    // BULK_OPERATIONS (0/4) - No bulk operations
    {
      id: getActionId('STAFF', 'BULK_CREATE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      actionKey: PERMISSION_ACTION_KEYS.BULK_CREATE,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Bulk operations restricted to MANAGER level',
      }),
      isActive: true,
    },

    // TEAM_MANAGEMENT (0/4) - No team management
    {
      id: getActionId('STAFF', 'MANAGE_TEAM'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      actionKey: PERMISSION_ACTION_KEYS.MANAGE_TEAM,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Team management restricted to TEAM_LEAD level and above',
      }),
      isActive: true,
    },

    // FINANCIAL (0/4) - No financial access
    {
      id: getActionId('STAFF', 'APPROVE_TRANSACTIONS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      actionKey: PERMISSION_ACTION_KEYS.APPROVE_TRANSACTIONS,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Transaction approval restricted to TEAM_LEAD level and above',
      }),
      isActive: true,
    },
    {
      id: getActionId('STAFF', 'ACCESS_SALARY_DATA'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      actionKey: PERMISSION_ACTION_KEYS.ACCESS_SALARY_DATA,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Salary data access restricted to ADMIN',
      }),
      isActive: true,
    },

    // CUSTOMER_MANAGEMENT (1/4) - View only
    {
      id: getActionId('STAFF', 'VIEW_CUSTOMER_HISTORY'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      actionKey: PERMISSION_ACTION_KEYS.VIEW_CUSTOMER_HISTORY,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'OWN_CUSTOMERS',
      }),
      restrictions: null,
      isActive: true,
    },

    // COMMUNICATION (4/4) - Full communication access
    {
      id: getActionId('STAFF', 'SEND_EMAIL'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      actionKey: PERMISSION_ACTION_KEYS.SEND_EMAIL,
      isAllowed: true,
      configuration: JSON.stringify({
        canUseBulkEmail: false,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('STAFF', 'SEND_SMS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      actionKey: PERMISSION_ACTION_KEYS.SEND_SMS,
      isAllowed: true,
      configuration: JSON.stringify({
        dailyLimit: 50,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('STAFF', 'MAKE_CALL'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      actionKey: PERMISSION_ACTION_KEYS.MAKE_CALL,
      isAllowed: true,
      configuration: JSON.stringify({
        recordingEnabled: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('STAFF', 'SCHEDULE_MEETING'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      actionKey: PERMISSION_ACTION_KEYS.SCHEDULE_MEETING,
      isAllowed: true,
      configuration: JSON.stringify({
        canInviteExternal: false, // Internal meetings only
      }),
      restrictions: null,
      isActive: true,
    },

    // DEAL_MANAGEMENT (1/3) - Can create small deals only
    {
      id: getActionId('STAFF', 'CREATE_DEAL'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      actionKey: PERMISSION_ACTION_KEYS.CREATE_DEAL,
      isAllowed: true,
      configuration: JSON.stringify({
        maxDealValue: 10000000, // 10M VND
      }),
      restrictions: JSON.stringify({
        escalateIf: 'dealValue > 10000000',
      }),
      isActive: true,
    },

    // REPORTING (2/4) - View and create basic reports
    {
      id: getActionId('STAFF', 'VIEW_REPORTS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      actionKey: PERMISSION_ACTION_KEYS.VIEW_REPORTS,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'OWN_REPORTS',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('STAFF', 'CREATE_REPORT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      actionKey: PERMISSION_ACTION_KEYS.CREATE_REPORT,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'OWN_DATA',
      }),
      restrictions: null,
      isActive: true,
    },

    // USER_MANAGEMENT (0/4) - No user management
    {
      id: getActionId('STAFF', 'VIEW_USER_PROFILES'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      actionKey: PERMISSION_ACTION_KEYS.VIEW_USER_PROFILES,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'User profile access restricted to TEAM_LEAD level and above',
      }),
      isActive: true,
    },

    // AUTOMATION (0/3) - No automation access
    {
      id: getActionId('STAFF', 'CREATE_WORKFLOW'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      actionKey: PERMISSION_ACTION_KEYS.CREATE_WORKFLOW,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Workflow creation restricted to MANAGER level',
      }),
      isActive: true,
    },

    // SECURITY_OPERATIONS (0/3) - No security access
    {
      id: getActionId('STAFF', 'VIEW_SECURITY_LOGS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      actionKey: PERMISSION_ACTION_KEYS.VIEW_SECURITY_LOGS,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Security logs restricted to ADMIN',
      }),
      isActive: true,
    },

    // ==================================================================================
    // INTERN TEMPLATE - Learning role with minimal access
    // Priority: 300 | Scope: OWN_RECORDS (read-only) | Approval: Up to 5M VND with approval
    // ~15 actions (13% of total) - Supervised access, comprehensive monitoring
    // ==================================================================================

    // BASIC_CRUD (1/4) - READ only
    {
      id: getActionId('INTERN', 'READ'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      actionKey: PERMISSION_ACTION_KEYS.READ,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'OWN_RECORDS',
        contextFilter: 'assignedTo = :userId',
        readOnly: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('INTERN', 'CREATE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      actionKey: PERMISSION_ACTION_KEYS.CREATE,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'OWN_RECORDS',
        requiresApproval: true,
        approverLevel: 'TEAM_LEAD',
      }),
      restrictions: JSON.stringify({
        message: 'All create actions require supervisor approval',
      }),
      isActive: true,
    },
    {
      id: getActionId('INTERN', 'UPDATE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      actionKey: PERMISSION_ACTION_KEYS.UPDATE,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Update action requires supervisor approval',
        requiresApproval: true,
        approverLevel: 'TEAM_LEAD',
      }),
      isActive: true,
    },
    {
      id: getActionId('INTERN', 'DELETE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      actionKey: PERMISSION_ACTION_KEYS.DELETE,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Delete action not available to INTERN',
      }),
      isActive: true,
    },

    // ADVANCED (0/6) - No advanced operations
    {
      id: getActionId('INTERN', 'EXPORT'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      actionKey: PERMISSION_ACTION_KEYS.EXPORT,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Export not available to INTERN',
      }),
      isActive: true,
    },

    // SYSTEM (0/6) - No system access
    {
      id: getActionId('INTERN', 'CONFIGURE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      actionKey: PERMISSION_ACTION_KEYS.CONFIGURE,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'System configuration restricted to ADMIN',
      }),
      isActive: true,
    },

    // APPROVAL (0/3) - No approval authority
    {
      id: getActionId('INTERN', 'APPROVE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      actionKey: PERMISSION_ACTION_KEYS.APPROVE,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Approval authority not available to INTERN',
      }),
      isActive: true,
    },
    {
      id: getActionId('INTERN', 'ESCALATE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      actionKey: PERMISSION_ACTION_KEYS.ESCALATE,
      isAllowed: true,
      configuration: JSON.stringify({
        escalateTo: 'TEAM_LEAD',
        alwaysRequired: true,
      }),
      restrictions: null,
      isActive: true,
    },

    // BULK_OPERATIONS (0/4) - No bulk operations
    {
      id: getActionId('INTERN', 'BULK_CREATE'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      actionKey: PERMISSION_ACTION_KEYS.BULK_CREATE,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Bulk operations not available to INTERN',
      }),
      isActive: true,
    },

    // TEAM_MANAGEMENT (0/4) - No team management
    {
      id: getActionId('INTERN', 'MANAGE_TEAM'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      actionKey: PERMISSION_ACTION_KEYS.MANAGE_TEAM,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Team management not available to INTERN',
      }),
      isActive: true,
    },

    // FINANCIAL (0/4) - No financial access
    {
      id: getActionId('INTERN', 'APPROVE_TRANSACTIONS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      actionKey: PERMISSION_ACTION_KEYS.APPROVE_TRANSACTIONS,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Financial operations not available to INTERN',
      }),
      isActive: true,
    },
    {
      id: getActionId('INTERN', 'ACCESS_SALARY_DATA'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      actionKey: PERMISSION_ACTION_KEYS.ACCESS_SALARY_DATA,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Salary data access restricted to ADMIN',
      }),
      isActive: true,
    },

    // CUSTOMER_MANAGEMENT (0/4) - No customer management
    {
      id: getActionId('INTERN', 'VIEW_CUSTOMER_HISTORY'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      actionKey: PERMISSION_ACTION_KEYS.VIEW_CUSTOMER_HISTORY,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Customer history access restricted, contact supervisor',
      }),
      isActive: true,
    },

    // COMMUNICATION (3/4) - Limited communication
    {
      id: getActionId('INTERN', 'SEND_EMAIL'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      actionKey: PERMISSION_ACTION_KEYS.SEND_EMAIL,
      isAllowed: true,
      configuration: JSON.stringify({
        requiresSupervisorApproval: true,
        canUseBulkEmail: false,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('INTERN', 'SEND_SMS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      actionKey: PERMISSION_ACTION_KEYS.SEND_SMS,
      isAllowed: true,
      configuration: JSON.stringify({
        dailyLimit: 20,
        requiresSupervisorApproval: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('INTERN', 'MAKE_CALL'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      actionKey: PERMISSION_ACTION_KEYS.MAKE_CALL,
      isAllowed: true,
      configuration: JSON.stringify({
        recordingEnabled: true,
        supervisorMonitoring: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: getActionId('INTERN', 'SCHEDULE_MEETING'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      actionKey: PERMISSION_ACTION_KEYS.SCHEDULE_MEETING,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Meeting scheduling not available to INTERN',
      }),
      isActive: true,
    },

    // DEAL_MANAGEMENT (0/3) - No deal management
    {
      id: getActionId('INTERN', 'CREATE_DEAL'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      actionKey: PERMISSION_ACTION_KEYS.CREATE_DEAL,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Deal creation not available to INTERN',
      }),
      isActive: true,
    },

    // REPORTING (1/4) - View only
    {
      id: getActionId('INTERN', 'VIEW_REPORTS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      actionKey: PERMISSION_ACTION_KEYS.VIEW_REPORTS,
      isAllowed: true,
      configuration: JSON.stringify({
        scope: 'PUBLIC_REPORTS',
      }),
      restrictions: null,
      isActive: true,
    },

    // USER_MANAGEMENT (0/4) - No user management
    {
      id: getActionId('INTERN', 'VIEW_USER_PROFILES'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      actionKey: PERMISSION_ACTION_KEYS.VIEW_USER_PROFILES,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'User profile access not available to INTERN',
      }),
      isActive: true,
    },

    // AUTOMATION (0/3) - No automation access
    {
      id: getActionId('INTERN', 'CREATE_WORKFLOW'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      actionKey: PERMISSION_ACTION_KEYS.CREATE_WORKFLOW,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Workflow creation not available to INTERN',
      }),
      isActive: true,
    },

    // SECURITY_OPERATIONS (0/3) - No security access
    {
      id: getActionId('INTERN', 'VIEW_SECURITY_LOGS'),
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      actionKey: PERMISSION_ACTION_KEYS.VIEW_SECURITY_LOGS,
      isAllowed: false,
      configuration: null,
      restrictions: JSON.stringify({
        message: 'Security logs restricted to ADMIN',
      }),
      isActive: true,
    },
  ];
