/**
 * Customer Note Seed Data Constants
 *
 * Seed data for customer notes with various note types
 * Types: GENERAL, CALL, MEETING, ISSUE, FOLLOWUP, OTHER
 */

import { MKT_CUSTOMER_DATA_SEEDS_IDS } from 'src/mkt-core/customer/constants/mkt-customer.constant';
import {
  MKT_CUSTOMER_NOTE_TYPE,
  MktCustomerNoteType,
} from 'src/mkt-core/customer/constants/mkt-customer-note.constants';

export const MKT_CUSTOMER_NOTE_DATA_SEEDS_IDS = {
  // Diamond customer notes
  DIAMOND_WELCOME: '3e25001e-f42f-40f0-a567-072686884474',
  DIAMOND_MEETING: '4116f7df-87ed-4a3c-a7bf-81be27d4eb74',
  DIAMOND_FOLLOWUP: '6769d764-5c54-436a-94ae-35ba830f8df4',

  // Gold customer notes
  GOLD_CALL: 'e7ca4624-dc0c-46f2-b189-db55eb3c76d6',
  GOLD_ISSUE: 'f369b678-0469-4982-8cc1-ac8702b0780e',
  GOLD_FOLLOWUP: 'd0b901f6-4a2b-48a4-bd25-0bb6ad26e8d5',

  // Silver customer notes
  SILVER_GENERAL: '93ac979a-74ea-4a7c-b6e8-d48343c32443',
  SILVER_CALL: '83bdc042-651e-479b-80c6-2d106e2de6f8',

  // Bronze customer notes
  BRONZE_WELCOME: 'ea54aa83-dba7-4088-b976-8e9422b47b0c',
  BRONZE_MEETING: '76f27eec-af5f-4cd7-ab6e-785a360fb14a',

  // Churned customer notes
  CHURNED_ISSUE: '03082a77-9f0b-4c19-8bc3-0427c95df05b',
  CHURNED_FOLLOWUP: 'c5691745-6b90-4bc9-9bd4-400676043337',
} as const;

type MktCustomerNoteDataSeed = {
  id: string;
  content: string;
  noteType: MktCustomerNoteType;
  customerId: string;
  position: number;
  createdBySource: string;
  createdByWorkspaceMemberId: string | null;
  createdByName: string;
};

export const MKT_CUSTOMER_NOTE_DATA_SEED_COLUMNS: (keyof MktCustomerNoteDataSeed)[] =
  [
    'id',
    'content',
    'noteType',
    'customerId',
    'position',
    'createdBySource',
    'createdByWorkspaceMemberId',
    'createdByName',
  ];

export const MKT_CUSTOMER_NOTE_DATA_SEEDS: MktCustomerNoteDataSeed[] = [
  // ============ DIAMOND CUSTOMER NOTES ============
  {
    id: MKT_CUSTOMER_NOTE_DATA_SEEDS_IDS.DIAMOND_WELCOME,
    content:
      '**Chào mừng khách hàng VIP**\n\nKhách hàng đã đăng ký gói Enterprise với 25 licenses. Ưu tiên hỗ trợ 24/7.\n\n- Đã gửi email chào mừng\n- Đã tạo ticket hỗ trợ riêng\n- Đã assign dedicated support team',
    noteType: MKT_CUSTOMER_NOTE_TYPE.GENERAL,
    customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.DIAMOND_CUSTOMER,
    position: 1,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_CUSTOMER_NOTE_DATA_SEEDS_IDS.DIAMOND_MEETING,
    content:
      '**Cuộc họp review hàng quý Q4/2024**\n\nTham dự: Nguyễn Văn An (CEO), Sales Team\n\n**Nội dung thảo luận:**\n1. Review hiệu suất sử dụng license\n2. Nhu cầu mở rộng thêm 10 licenses trong Q1/2025\n3. Đề xuất upgrade lên gói Premium Support\n\n**Action items:**\n- [ ] Chuẩn bị báo giá mở rộng\n- [ ] Lên lịch demo tính năng mới',
    noteType: MKT_CUSTOMER_NOTE_TYPE.MEETING,
    customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.DIAMOND_CUSTOMER,
    position: 2,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'Tim Apple',
  },
  {
    id: MKT_CUSTOMER_NOTE_DATA_SEEDS_IDS.DIAMOND_FOLLOWUP,
    content:
      '**Follow-up sau cuộc họp Q4**\n\nĐã gửi báo giá mở rộng license cho khách hàng. Khách hàng đang review nội bộ, dự kiến phản hồi trong tuần tới.\n\nReminder: Gọi lại vào ngày 15/01/2025',
    noteType: MKT_CUSTOMER_NOTE_TYPE.FOLLOWUP,
    customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.DIAMOND_CUSTOMER,
    position: 3,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'Jony Ive',
  },

  // ============ GOLD CUSTOMER NOTES ============
  {
    id: MKT_CUSTOMER_NOTE_DATA_SEEDS_IDS.GOLD_CALL,
    content:
      '**Cuộc gọi hỗ trợ kỹ thuật**\n\nKhách hàng gọi hỏi về việc tích hợp API với hệ thống ERP hiện tại.\n\n**Giải pháp đề xuất:**\n- Sử dụng REST API với OAuth2\n- Cung cấp tài liệu API docs\n- Hẹn lịch demo tích hợp\n\n*Thời lượng cuộc gọi: 25 phút*',
    noteType: MKT_CUSTOMER_NOTE_TYPE.CALL,
    customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.GOLD_CUSTOMER,
    position: 1,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'Phil Schiller',
  },
  {
    id: MKT_CUSTOMER_NOTE_DATA_SEEDS_IDS.GOLD_ISSUE,
    content:
      '**Báo cáo vấn đề: Sync dữ liệu chậm**\n\n**Mô tả:** Khách hàng báo cáo việc đồng bộ dữ liệu từ Shopee mất 5-10 phút thay vì 1-2 phút như thường lệ.\n\n**Trạng thái:** Đang điều tra\n**Ticket ID:** SUP-2024-001234\n\n**Nguyên nhân dự kiến:** Server peak time vào buổi sáng',
    noteType: MKT_CUSTOMER_NOTE_TYPE.ISSUE,
    customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.GOLD_CUSTOMER,
    position: 2,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'Jane Doe',
  },
  {
    id: MKT_CUSTOMER_NOTE_DATA_SEEDS_IDS.GOLD_FOLLOWUP,
    content:
      '**Follow-up vấn đề sync**\n\nĐã giải quyết vấn đề sync chậm. Nguyên nhân do server capacity. Đã upgrade server, hiện sync time về 1-2 phút.\n\nKhách hàng hài lòng với giải pháp.',
    noteType: MKT_CUSTOMER_NOTE_TYPE.FOLLOWUP,
    customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.GOLD_CUSTOMER,
    position: 3,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'Jane Doe',
  },

  // ============ SILVER CUSTOMER NOTES ============
  {
    id: MKT_CUSTOMER_NOTE_DATA_SEEDS_IDS.SILVER_GENERAL,
    content:
      '**Ghi chú chung**\n\nKhách hàng là freelancer, sử dụng sản phẩm cho công việc cá nhân. Nhu cầu chính:\n- Quản lý dự án\n- Theo dõi thời gian làm việc\n- Xuất báo cáo cho khách hàng\n\nTiềm năng upgrade khi mở rộng team.',
    noteType: MKT_CUSTOMER_NOTE_TYPE.GENERAL,
    customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.SILVER_CUSTOMER,
    position: 1,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_CUSTOMER_NOTE_DATA_SEEDS_IDS.SILVER_CALL,
    content:
      '**Cuộc gọi tư vấn upgrade**\n\nKhách hàng quan tâm đến việc upgrade lên gói Team khi có thêm collaborators. Đã giải thích:\n- Khác biệt giữa gói Individual và Team\n- Pricing và billing cycle\n- Migration process\n\nKhách hàng sẽ cân nhắc và liên hệ lại khi cần.',
    noteType: MKT_CUSTOMER_NOTE_TYPE.CALL,
    customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.SILVER_CUSTOMER,
    position: 2,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'Jony Ive',
  },

  // ============ BRONZE CUSTOMER NOTES ============
  {
    id: MKT_CUSTOMER_NOTE_DATA_SEEDS_IDS.BRONZE_WELCOME,
    content:
      '**Welcome onboarding - Startup ABC**\n\nStartup mới, đang trong giai đoạn trial. Đã hướng dẫn:\n- Setup workspace\n- Invite team members\n- Import dữ liệu từ Excel\n\nHẹn follow-up sau 7 ngày để check feedback.',
    noteType: MKT_CUSTOMER_NOTE_TYPE.GENERAL,
    customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.BRONZE_CUSTOMER,
    position: 1,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_CUSTOMER_NOTE_DATA_SEEDS_IDS.BRONZE_MEETING,
    content:
      '**Demo session cho Startup ABC**\n\n**Nội dung demo:**\n1. Dashboard overview\n2. Quản lý khách hàng\n3. Workflow automation\n4. Báo cáo và analytics\n\n**Feedback:**\n- Khách hàng ấn tượng với tính năng automation\n- Quan tâm đến giá gói Startup sau trial\n- Hỏi về khả năng custom workflow',
    noteType: MKT_CUSTOMER_NOTE_TYPE.MEETING,
    customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.BRONZE_CUSTOMER,
    position: 2,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'Phil Schiller',
  },

  // ============ CHURNED CUSTOMER NOTES ============
  {
    id: MKT_CUSTOMER_NOTE_DATA_SEEDS_IDS.CHURNED_ISSUE,
    content:
      '**Báo cáo: Khách hàng không gia hạn**\n\n**Lý do chính:**\n1. Ngân sách bị cắt giảm\n2. Chuyển sang sử dụng giải pháp in-house\n3. Giảm nhân sự nên không cần nhiều license\n\n**Feedback thu thập:**\n- Sản phẩm tốt, giá hợp lý\n- Nếu có cơ hội sẽ quay lại sử dụng\n\n*Đã đánh dấu để win-back campaign trong tương lai*',
    noteType: MKT_CUSTOMER_NOTE_TYPE.ISSUE,
    customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.CHURNED_CUSTOMER,
    position: 1,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'Tim Apple',
  },
  {
    id: MKT_CUSTOMER_NOTE_DATA_SEEDS_IDS.CHURNED_FOLLOWUP,
    content:
      '**Win-back attempt - Q3/2024**\n\nĐã gửi email win-back với ưu đãi 30% cho 3 tháng đầu. Khách hàng phản hồi:\n\n> "Cảm ơn ưu đãi. Hiện tại công ty vẫn đang sử dụng giải pháp nội bộ. Sẽ liên hệ lại khi có nhu cầu."\n\nĐã schedule reminder 6 tháng sau để follow-up tiếp.',
    noteType: MKT_CUSTOMER_NOTE_TYPE.FOLLOWUP,
    customerId: MKT_CUSTOMER_DATA_SEEDS_IDS.CHURNED_CUSTOMER,
    position: 2,
    createdBySource: 'MANUAL',
    createdByWorkspaceMemberId: null,
    createdByName: 'Jony Ive',
  },
];
