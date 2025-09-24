-- Core multi-tenant foundation - Nền tảng đa tenant cốt lõi
CREATE TABLE workspaces
(
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất workspace
    name                VARCHAR(100) NOT NULL,                      -- Tên hiển thị của workspace (ví dụ: "MKT Software Co.")
    subdomain           VARCHAR(50) UNIQUE,                         -- Tên miền phụ để truy cập (ví dụ: "mkt" cho mkt.domain.com)
    workspace_type      VARCHAR(20)      DEFAULT 'MKT_COMPANY',     -- Loại workspace: MKT_COMPANY (công ty chính), RESELLER (đại lý), AFFILIATE (tiếp thị liên kết)
    parent_workspace_id UUID REFERENCES workspaces (id),           -- ID workspace cha (cho cấu trúc phân cấp)
    is_active           BOOLEAN          DEFAULT TRUE,               -- Trạng thái hoạt động: TRUE=đang hoạt động, FALSE=tạm ngưng
    created_at          TIMESTAMP        DEFAULT NOW(),              -- Thời gian tạo workspace
    updated_at          TIMESTAMP        DEFAULT NOW()               -- Thời gian cập nhật gần nhất
);

-- Role-based access control - Kiểm soát truy cập dựa trên vai trò
CREATE TABLE roles
(
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất vai trò
    workspace_id   UUID REFERENCES workspaces (id),           -- ID workspace sở hữu vai trò này
    name           VARCHAR(50) NOT NULL,                      -- Tên vai trò (ví dụ: "Admin", "Sales Manager", "Support Agent")
    description    TEXT,                                       -- Mô tả chi tiết về vai trò và trách nhiệm
    is_system_role BOOLEAN          DEFAULT FALSE,             -- Vai trò hệ thống (TRUE) hay tùy chỉnh (FALSE)
    created_at     TIMESTAMP        DEFAULT NOW()              -- Thời gian tạo vai trò
);

-- Granular permissions - Quyền chi tiết từng module
CREATE TABLE permissions
(
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất quyền
    workspace_id    UUID REFERENCES workspaces (id),           -- ID workspace sở hữu quyền này
    permission_name VARCHAR(100) NOT NULL,                      -- Tên quyền (ví dụ: "customer.read.all")
    module          VARCHAR(50)  NOT NULL,                      -- Module áp dụng: LICENSE (giấy phép), CUSTOMER (khách hàng), ORDER (đơn hàng), etc.
    action          VARCHAR(20)  NOT NULL,                      -- Hành động: CREATE (tạo), READ (đọc), UPDATE (sửa), DELETE (xóa), APPROVE (phê duyệt)
    resource_scope  VARCHAR(50),                                -- Phạm vi tài nguyên: ALL (tất cả), ASSIGNED (được phân công), OWN (của mình), TEAM (nhóm)
    description     TEXT,                                       -- Mô tả chi tiết về quyền này
    created_at      TIMESTAMP        DEFAULT NOW()              -- Thời gian tạo quyền
);

-- Role-permission mapping - Ánh xạ vai trò và quyền
CREATE TABLE role_permissions
(
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất ánh xạ
    role_id       UUID REFERENCES roles (id) ON DELETE CASCADE,       -- ID vai trò được cấp quyền
    permission_id UUID REFERENCES permissions (id) ON DELETE CASCADE,  -- ID quyền được cấp
    granted       BOOLEAN          DEFAULT TRUE,                       -- Trạng thái cấp quyền: TRUE=được phép, FALSE=bị từ chối
    conditions    JSONB,                                               -- Điều kiện bổ sung cho quyền (ví dụ: chỉ trong giờ hành chính)
    created_at    TIMESTAMP        DEFAULT NOW(),                      -- Thời gian tạo ánh xạ
    UNIQUE (role_id, permission_id)                                    -- Mỗi vai trò chỉ có 1 ánh xạ với 1 quyền
);

-- Organizational structure - Cấu trúc tổ chức công ty
CREATE TABLE departments
(
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất phòng ban
    workspace_id UUID REFERENCES workspaces (id),           -- ID workspace sở hữu phòng ban này
    name         VARCHAR(100) NOT NULL,                      -- Tên phòng ban (ví dụ: "Phòng Kinh doanh", "Phòng Kỹ thuật")
    level        VARCHAR(20),                                -- Cấp độ: TEAM (nhóm), DEPARTMENT (phòng ban), COMPANY (công ty)
    parent_id    UUID REFERENCES departments (id),          -- ID phòng ban cha (cho cấu trúc phân cấp)
    leader_id    UUID,                                       -- ID người lãnh đạo phòng ban (tham chiếu users.id)
    created_at   TIMESTAMP        DEFAULT NOW()              -- Thời gian tạo phòng ban
);

-- User accounts - Tài khoản người dùng
CREATE TABLE users
(
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất người dùng
    workspace_id       UUID REFERENCES workspaces (id),           -- ID workspace mà user thuộc về
    email              VARCHAR(255) UNIQUE NOT NULL,              -- Email đăng nhập (duy nhất trên hệ thống)
    password_hash      VARCHAR(255)        NOT NULL,              -- Mật khẩu đã mã hóa (hash)
    role_id            UUID REFERENCES roles (id),               -- ID vai trò của user trong hệ thống
    full_name          VARCHAR(100),                              -- Họ và tên đầy đủ
    phone              VARCHAR(20),                               -- Số điện thoại liên lạc
    avatar_url         VARCHAR(500),                              -- URL ảnh đại diện
    status             VARCHAR(20)      DEFAULT 'ACTIVE',        -- Trạng thái: ACTIVE (hoạt động), INACTIVE (ngưng hoạt động), PROBATION (thử việc), SUSPENDED (tạm ngưng)
    probation_end      TIMESTAMP,                                 -- Ngày kết thúc thời gian thử việc
    department_id      UUID REFERENCES departments (id),         -- ID phòng ban mà user thuộc về

    -- 2FA settings - Cài đặt xác thực 2 bước
    two_factor_enabled BOOLEAN          DEFAULT FALSE,            -- Có bật 2FA hay không
    two_factor_secret  VARCHAR(32),                               -- Secret key cho 2FA
    backup_codes       JSONB,                                     -- Mã backup dự phòng cho 2FA

    -- Metadata - Thông tin bổ sung
    last_login_at      TIMESTAMP,                                 -- Thời gian đăng nhập gần nhất
    created_at         TIMESTAMP        DEFAULT NOW(),            -- Thời gian tạo tài khoản
    updated_at         TIMESTAMP        DEFAULT NOW()             -- Thời gian cập nhật gần nhất
);

-- Individual user permissions (overrides) - Quyền cá nhân người dùng (ghi đè)
CREATE TABLE user_permissions
(
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    user_id       UUID REFERENCES users (id) ON DELETE CASCADE,     -- ID người dùng được cấp quyền
    permission_id UUID REFERENCES permissions (id) ON DELETE CASCADE, -- ID quyền được cấp riêng
    granted       BOOLEAN NOT NULL,                                   -- Trạng thái: TRUE=được cấp, FALSE=bị từ chối
    granted_by    UUID REFERENCES users (id),                       -- Người cấp quyền
    expires_at    TIMESTAMP,                                          -- Thời điểm hết hạn quyền (nếu có)
    reason        VARCHAR(255),                                       -- Lý do cấp quyền đặc biệt
    created_at    TIMESTAMP        DEFAULT NOW()                      -- Thời gian tạo
);

-- Support-Sales assignment relationships - Mối quan hệ phân công giữa hỗ trợ và kinh doanh
CREATE TABLE support_sales_assignments
(
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id    UUID REFERENCES workspaces (id),           -- ID workspace
    support_user_id UUID REFERENCES users (id),               -- ID nhân viên hỗ trợ
    sales_user_id   UUID REFERENCES users (id),               -- ID nhân viên kinh doanh được hỗ trợ
    assigned_at     TIMESTAMP        DEFAULT NOW(),            -- Thời điểm phân công
    assigned_by     UUID REFERENCES users (id),               -- Người thực hiện phân công
    is_active       BOOLEAN          DEFAULT TRUE,             -- Có đang hoạt động hay không
    notes           TEXT                                        -- Ghi chú về mối quan hệ này
);


-- System-wide configuration - Cấu hình hệ thống toàn cục
CREATE TABLE system_configs
(
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id    UUID REFERENCES workspaces (id),           -- ID workspace sở hữu cấu hình
    config_category VARCHAR(50),                               -- Danh mục cấu hình: EMAIL, PAYMENT (thanh toán), INTEGRATION (tích hợp), BUSINESS_RULES (quy tắc kinh doanh)
    config_key      VARCHAR(100) NOT NULL,                    -- Khóa cấu hình (ví dụ: smtp_host, payment_gateway)
    config_value    TEXT,                                      -- Giá trị cấu hình
    data_type       VARCHAR(20)      DEFAULT 'STRING',        -- Kiểu dữ liệu: STRING (chuỗi), NUMBER (số), BOOLEAN (true/false), JSON
    description     TEXT,                                      -- Mô tả cấu hình này dùng để làm gì
    is_encrypted    BOOLEAN          DEFAULT FALSE,            -- Có được mã hóa hay không (cho thông tin nhạy cảm)
    created_at      TIMESTAMP        DEFAULT NOW(),            -- Thời gian tạo cấu hình
    updated_at      TIMESTAMP        DEFAULT NOW(),            -- Thời gian cập nhật gần nhất
    UNIQUE (workspace_id, config_category, config_key)       -- Mỗi workspace chỉ có 1 giá trị cho mỗi khóa cấu hình
);

-- Email templates for automation - Mẫu email cho tự động hóa
CREATE TABLE email_templates
(
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id  UUID REFERENCES workspaces (id),           -- ID workspace sở hửu mẫu email
    template_name VARCHAR(100) NOT NULL,                      -- Tên mẫu email
    template_type VARCHAR(50),                                -- Loại mẫu: WELCOME (chào mừng), RENEWAL_REMINDER (nhắc nhở gia hạn), INVOICE (hóa đơn), LICENSE_DELIVERED (giao giấy phép)
    subject       VARCHAR(255) NOT NULL,                    -- Tiêu đề email
    html_content  TEXT,                                      -- Nội dung email dạng HTML
    text_content  TEXT,                                      -- Nội dung email dạng text thuần
    variables     JSONB,                                     -- Các biến có sẵn trong mẫu (ví dụ: {customer_name}, {order_id})
    is_active     BOOLEAN          DEFAULT TRUE,             -- Mẫu có đang sử dụng hay không
    created_by    UUID REFERENCES users (id),               -- Người tạo mẫu
    created_at    TIMESTAMP        DEFAULT NOW(),            -- Thời gian tạo
    updated_at    TIMESTAMP        DEFAULT NOW()             -- Thời gian cập nhật gần nhất
);

-- Payment method configuration - Cấu hình phương thức thanh toán
CREATE TABLE payment_methods
(
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id              UUID REFERENCES workspaces (id),           -- ID workspace sở hữu phương thức thanh toán
    method_name               VARCHAR(50) NOT NULL,                      -- Tên phương thức: BANK_TRANSFER (chuyển khoản ngân hàng), MOMO, ZALOPAY, PAYPAL
    method_type               VARCHAR(20),                               -- Loại: MANUAL (thủ công), GATEWAY (cổng thanh toán), CRYPTO (tiền điện tử)
    gateway_config            JSONB,                                     -- Cấu hình cổng: API keys, endpoints, etc. (JSON)
    is_active                 BOOLEAN          DEFAULT TRUE,             -- Phương thức có đang hoạt động hay không
    processing_fee_percentage DECIMAL(5, 2)    DEFAULT 0,                -- Phần trăm phí xử lý giao dịch
    min_amount                DECIMAL(15, 2),                            -- Số tiền tối thiểu cho phép
    max_amount                DECIMAL(15, 2),                            -- Số tiền tối đa cho phép
    supported_currencies      JSONB            DEFAULT '["VND"]',       -- Các đơn vị tiền tệ được hỗ trợ
    created_at                TIMESTAMP        DEFAULT NOW()             -- Thời gian tạo cấu hình
);

-- External system integrations - Tích hợp hệ thống bên ngoài
CREATE TABLE integrations
(
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id     UUID REFERENCES workspaces (id),           -- ID workspace sở hửu tích hợp
    integration_name VARCHAR(100) NOT NULL,                      -- Tên tích hợp
    integration_type VARCHAR(50),                               -- Loại tích hợp: S_INVOICE (hóa đơn điện tử), CRM, ACCOUNTING (kế toán), EMAIL_MARKETING
    status           VARCHAR(20)      DEFAULT 'INACTIVE',       -- Trạng thái: ACTIVE (hoạt động), INACTIVE (tắc), ERROR (lỗi), SETUP (đang cài đặt)
    config           JSONB,                                     -- Cấu hình cụ thể cho tích hợp (JSON)
    api_credentials  JSONB,                                     -- Thông tin xác thực API đã mã hóa
    webhook_url      VARCHAR(500),                              -- URL webhook nhận thông báo
    last_sync_at     TIMESTAMP,                                  -- Lần đồng bộ gần nhất
    sync_frequency   VARCHAR(20),                               -- Tần suất đồng bộ: REAL_TIME (thời gian thực), HOURLY (hàng giờ), DAILY (hàng ngày)
    error_count      INTEGER          DEFAULT 0,                -- Số lần gặp lỗi
    created_at       TIMESTAMP        DEFAULT NOW(),            -- Thời gian tạo
    updated_at       TIMESTAMP        DEFAULT NOW()             -- Thời gian cập nhật gần nhất
);

-- Software products - Sản phẩm phần mềm
CREATE TABLE products
(
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất sản phẩm
    workspace_id            UUID REFERENCES workspaces (id),           -- ID workspace sở hữu sản phẩm
    product_code            VARCHAR(50) UNIQUE NOT NULL,               -- Mã sản phẩm (ví dụ: MKT_CARE_PRO, MKT_POST_BASIC)
    product_name            VARCHAR(100)       NOT NULL,               -- Tên hiển thị sản phẩm
    product_category        VARCHAR(50),                               -- Danh mục: CARE (chăm sóc khách hàng), POST (đăng bài), VIRAL (viral marketing)
    base_price              DECIMAL(15, 2)     NOT NULL,               -- Giá cơ bản của sản phẩm
    currency                VARCHAR(3)       DEFAULT 'VND',           -- Đơn vị tiền tệ (mặc định VND)
    license_duration_months INTEGER          DEFAULT 12,               -- Thời hạn giấy phép tính theo tháng (mặc định 12 tháng)
    feature_flags           JSONB,                                     -- Các tính năng có sẵn trong sản phẩm (JSON)
    usage_limits            JSONB,                                     -- Giới hạn sử dụng và quota (JSON)
    is_active               BOOLEAN          DEFAULT TRUE,             -- Sản phẩm còn đang bán hay không
    created_at              TIMESTAMP        DEFAULT NOW(),            -- Thời gian tầo sản phẩm
    updated_at              TIMESTAMP        DEFAULT NOW()             -- Thời gian cập nhật gần nhất
);

-- Pricing tiers for different customer segments - Bậng giá theo phân khúc khách hàng
CREATE TABLE product_pricing_tiers
(
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    product_id          UUID REFERENCES products (id),             -- ID sản phẩm áp dụng bậng giá
    tier_name           VARCHAR(50),                               -- Tên hạng: INDIVIDUAL (cá nhân), SME (doanh nghiệp nhỏ), ENTERPRISE (doanh nghiệp lớn)
    price_per_unit      DECIMAL(15, 2),                            -- Giá mỗi đơn vị
    discount_percentage DECIMAL(5, 2)    DEFAULT 0,                -- Phần trăm giảm giá
    min_quantity        INTEGER          DEFAULT 1,                -- Số lượng tối thiểu để áp dụng giá
    max_quantity        INTEGER,                                   -- Số lượng tối đa cho phép
    is_active           BOOLEAN          DEFAULT TRUE,             -- Bậng giá có đang hoạt động hay không
    created_at          TIMESTAMP        DEFAULT NOW()             -- Thời gian tạo bậng giá
);

-- Product name mappings for invoices/S-Invoice - Ánh xạ tên sản phẩm cho hóa đơn
CREATE TABLE product_name_mappings
(
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id    UUID REFERENCES workspaces (id),           -- ID workspace sở hữu ánh xạ
    product_id      UUID REFERENCES products (id),             -- ID sản phẩm được ánh xạ
    internal_name   VARCHAR(100),                              -- Tên kỹ thuật nội bộ
    invoice_name_vi VARCHAR(200),                              -- Tên hiển thị trên hóa đơn tiếng Việt
    invoice_name_en VARCHAR(200),                              -- Tên hiển thị trên hóa đơn tiếng Anh
    s_invoice_name  VARCHAR(200),                              -- Tên tuân thủ chuẩn hóa đơn điện tử
    tax_category    VARCHAR(50),                               -- Danh mục thuế
    description_vi  TEXT,                                      -- Mô tả chi tiết tiếng Việt
    description_en  TEXT,                                      -- Mô tả chi tiết tiếng Anh
    created_at      TIMESTAMP        DEFAULT NOW()             -- Thời gian tạo ánh xạ
);

-- License inventory management - Quản lý kho giấy phép
CREATE TABLE license_inventory
(
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id       UUID REFERENCES workspaces (id),           -- ID workspace quản lý kho
    product_id         UUID REFERENCES products (id),             -- ID sản phẩm
    batch_code         VARCHAR(50),                               -- Mã lô giấy phép
    total_licenses     INTEGER NOT NULL,                          -- Tổng số giấy phép trong lô
    available_licenses INTEGER NOT NULL,                          -- Số giấy phép còn sẵn sàng
    used_licenses      INTEGER          DEFAULT 0,                -- Số giấy phép đã sử dụng
    reserved_licenses  INTEGER          DEFAULT 0,                -- Số giấy phép đang được đặt trước
    batch_expires_at   TIMESTAMP,                                  -- Thời điểm lô giấy phép hết hạn
    created_at         TIMESTAMP        DEFAULT NOW(),            -- Thời gian tạo lô
    updated_at         TIMESTAMP        DEFAULT NOW()             -- Thời gian cập nhật gần nhất
);

-- Main license table - Bảng giấy phép chính
CREATE TABLE licenses
(
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất giấy phép
    license_key              VARCHAR(100) UNIQUE NOT NULL,               -- Khóa giấy phép duy nhất (serial key)
    workspace_id             UUID REFERENCES workspaces (id),           -- ID workspace quản lý giấy phép
    order_id                 UUID,                                      -- ID đơn hàng tạo ra giấy phép này (tham chiếu orders.id)
    customer_id              UUID,                                      -- ID khách hàng sở hữu giấy phép (tham chiếu customers.id)
    product_id               UUID REFERENCES products (id),             -- ID sản phẩm mà giấy phép này kích hoạt

    -- License details - Chi tiết giấy phép
    status                   VARCHAR(20)      DEFAULT 'INACTIVE',       -- Trạng thái: INACTIVE (chưa kích hoạt), ACTIVE (đang hoạt động), EXPIRED (hết hạn), SUSPENDED (tạm ngưng), TRIAL (dùng thử)
    license_type             VARCHAR(20)      DEFAULT 'STANDARD',       -- Loại giấy phép: TRIAL (dùng thẻ), STANDARD (chuẩn), ENTERPRISE (doanh nghiệp)

    -- Time management - Quản lý thời gian
    activated_at             TIMESTAMP,                                  -- Thời điểm kích hoạt giấy phép
    expires_at               TIMESTAMP,                                  -- Thời điểm hết hạn giấy phép
    trial_expires_at         TIMESTAMP,                                  -- Thời điểm hết hạn giai đoạn trial
    auto_renewal             BOOLEAN          DEFAULT FALSE,             -- Có tự động gia hạn hay không

    -- Assignment - Phân công
    sales_id                 UUID REFERENCES users (id),               -- ID nhân viên kinh doanh phụ trách
    support_id               UUID REFERENCES users (id),               -- ID nhân viên hỗ trợ phụ trách

    -- Usage tracking - Theo dõi sử dụng
    device_limit             INTEGER          DEFAULT 1,                -- Giới hạn số thiết bị được sử dụng
    concurrent_session_limit INTEGER          DEFAULT 1,                -- Giới hạn số phiên đồng thời
    usage_quota              INTEGER,                                   -- Hạn ngạch sử dụng hàng tháng
    usage_current            INTEGER          DEFAULT 0,                -- Mức sử dụng hiện tại
    last_login_at            TIMESTAMP,                                  -- Lần đăng nhập gần nhất
    last_usage_sync          TIMESTAMP,                                  -- Lần đồng bộ dữ liệu sử dụng gần nhất

    -- Technical details - Chi tiết kỹ thuật
    device_info              JSONB,                                     -- Thông tin thiết bị đã đăng ký (JSON)
    feature_flags            JSONB,                                     -- Các tính năng được bật cho giấy phép này
    restriction_rules        JSONB,                                     -- Các quy tắc hạn chế sử dụng

    -- Business info - Thông tin kinh doanh
    suspension_reason        TEXT,                                      -- Lý do tạm ngưng giấy phép (nếu có)
    notes                    TEXT,                                      -- Ghi chú nội bộ về giấy phép

    created_at               TIMESTAMP        DEFAULT NOW(),            -- Thời gian tạo giấy phép
    updated_at               TIMESTAMP        DEFAULT NOW()             -- Thời gian cập nhật gần nhất
);

-- License inventory allocation tracking - Theo dõi phân bổ giấy phép từ kho
CREATE TABLE license_allocations
(
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    inventory_id UUID REFERENCES license_inventory (id),     -- ID kho giấy phép nguồn
    license_id   UUID REFERENCES licenses (id),             -- ID giấy phép được phân bổ
    allocated_at TIMESTAMP        DEFAULT NOW(),            -- Thời điểm phân bổ
    allocated_by UUID REFERENCES users (id)                 -- Người thực hiện phân bổ
);

-- License document attachments - Tài liệu đính kèm giấy phép
CREATE TABLE license_documents
(
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    license_id    UUID REFERENCES licenses (id),             -- ID giấy phép liên quan
    document_type VARCHAR(50),                                -- Loại tài liệu: CONTRACT (hợp đồng), INVOICE (hóa đơn), ACTIVATION_GUIDE (hướng dẫn kích hoạt), MANUAL (hướng dẫn sử dụng)
    file_name     VARCHAR(255),                              -- Tên file tài liệu
    file_url      VARCHAR(500),                              -- Đường dẫn URL đến file
    file_size     BIGINT,                                    -- Kích thước file (bytes)
    mime_type     VARCHAR(100),                              -- Kiểu MIME của file
    uploaded_at   TIMESTAMP        DEFAULT NOW(),            -- Thời gian upload
    uploaded_by   UUID REFERENCES users (id)                 -- Người upload tài liệu
);

-- License renewal tracking - Theo dõi gia hạn giấy phép
CREATE TABLE license_renewals
(
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id      UUID REFERENCES workspaces (id),           -- ID workspace
    license_id        UUID REFERENCES licenses (id),             -- ID giấy phép được gia hạn
    original_order_id UUID,                                      -- ID đơn hàng gốc (tham chiếu orders.id)
    renewal_order_id  UUID,                                      -- ID đơn hàng gia hạn (tham chiếu orders.id)

    -- Renewal details - Chi tiết gia hạn
    old_expiry_date   TIMESTAMP,                                  -- Ngày hết hạn cũ
    new_expiry_date   TIMESTAMP,                                  -- Ngày hết hạn mới
    renewal_type      VARCHAR(20),                               -- Loại gia hạn: MANUAL (thủ công), AUTO (tự động), UPGRADE (nâng cấp), DOWNGRADE (hạ cấp)
    renewal_months    INTEGER,                                    -- Số tháng gia hạn

    -- Processing info - Thông tin xử lý
    processed_by      UUID REFERENCES users (id),               -- Người xử lý gia hạn
    processed_at      TIMESTAMP,                                  -- Thời điểm xử lý

    created_at        TIMESTAMP        DEFAULT NOW()             -- Thời gian tạo bản ghi
);

-- Trial license management - Quản lý giấy phép dùng thử
CREATE TABLE trial_licenses
(
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id         UUID REFERENCES workspaces (id),           -- ID workspace
    trial_license_id     VARCHAR(50) UNIQUE NOT NULL,               -- Mã giấy phép dùng thử duy nhất
    customer_id          UUID,                                      -- ID khách hàng (tham chiếu customers.id)
    product_id           UUID REFERENCES products (id),             -- ID sản phẩm dùng thẻ

    -- Trial configuration - Cấu hình dùng thẻ
    trial_duration_days  INTEGER          DEFAULT 30,               -- Thời gian dùng thẻ (ngày)
    started_at           TIMESTAMP        DEFAULT NOW(),            -- Thời điểm bắt đầu dùng thẻ
    expires_at           TIMESTAMP,                                  -- Thời điểm hết hạn dùng thẻ
    status               VARCHAR(20)      DEFAULT 'ACTIVE',         -- Trạng thái: ACTIVE (đang dùng), EXPIRED (hết hạn), CONVERTED (chuyển thành), CANCELLED (hủy)

    -- Conversion tracking - Theo dõi chuyển đổi
    conversion_order_id  UUID,                                      -- ID đơn hàng chuyển đổi (tham chiếu orders.id)
    converted_at         TIMESTAMP,                                  -- Thời điểm chuyển đổi
    conversion_reason    TEXT,                                      -- Lý do chuyển đổi

    -- Usage limits during trial - Giới hạn sử dụng trong thời gian dùng thẻ
    usage_limits         JSONB,                                     -- Giới hạn sử dụng (JSON)
    feature_restrictions JSONB,                                     -- Giới hạn tính năng (JSON)

    created_at           TIMESTAMP        DEFAULT NOW()             -- Thời gian tạo
);


-- External license source integration - Tích hợp nguồn giấy phép bên ngoài
CREATE TABLE license_sync_sources
(
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id    UUID REFERENCES workspaces (id),           -- ID workspace
    source_name     VARCHAR(100) NOT NULL,                     -- Tên hệ thống tạo giấy phép bên ngoài
    source_type     VARCHAR(50),                               -- Loại nguồn: API, DATABASE (cơ sở dữ liệu), FILE_IMPORT (nhập file)
    api_endpoint    VARCHAR(500),                              -- Điểm cuối API
    api_credentials JSONB,                                     -- Thông tin xác thực API (JSON)
    sync_frequency  VARCHAR(20)      DEFAULT 'HOURLY',         -- Tần suất đồng bộ: REAL_TIME (thời gian thực), HOURLY (hàng giờ), DAILY (hàng ngày)
    last_sync_at    TIMESTAMP,                                  -- Lần đồng bộ cuối
    next_sync_at    TIMESTAMP,                                  -- Lần đồng bộ tiếp theo
    status          VARCHAR(20)      DEFAULT 'ACTIVE',         -- Trạng thái: ACTIVE (hoạt động), INACTIVE (tắc), ERROR (lỗi)
    error_message   TEXT,                                      -- Thông báo lỗi (nếu có)
    sync_statistics JSONB,                                     -- Thống kê thành công/thất bại (JSON)
    created_at      TIMESTAMP        DEFAULT NOW()             -- Thời gian tạo
);

-- License sync conflict resolution - Giải quyết xung đột đồng bộ giấy phép
CREATE TABLE license_sync_conflicts
(
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    license_id          UUID REFERENCES licenses (id),             -- ID giấy phép có xung đột
    sync_source_id      UUID REFERENCES license_sync_sources (id), -- ID nguồn đồng bộ
    conflict_type       VARCHAR(50),                               -- Loại xung đột: DATA_MISMATCH (dữ liệu không khớp), DUPLICATE_KEY (trùng khóa), MISSING_REMOTE (thiếu ở remote)
    local_data          JSONB,                                     -- Dữ liệu ở local (JSON)
    remote_data         JSONB,                                     -- Dữ liệu ở remote (JSON)
    resolution_strategy VARCHAR(50),                               -- Chiến lược giải quyết: MANUAL (thủ công), AUTO_LOCAL (tự động ưu tiên local), AUTO_REMOTE (tự động ưu tiên remote)
    resolution_status   VARCHAR(20)      DEFAULT 'PENDING',        -- Trạng thái giải quyết: PENDING (chờ), RESOLVED (đã giải quyết), IGNORED (bỏ qua)
    resolved_at         TIMESTAMP,                                  -- Thời điểm giải quyết
    resolved_by         UUID REFERENCES users (id),               -- Người giải quyết
    resolution_notes    TEXT,                                      -- Ghi chú về cách giải quyết
    created_at          TIMESTAMP        DEFAULT NOW()             -- Thời gian phát hiện xung đột
);

-- License usage tracking for analytics - Theo dõi sử dụng giấy phép cho phân tích
CREATE TABLE license_usage_tracking
(
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    license_id               UUID REFERENCES licenses (id),             -- ID giấy phép được sử dụng
    session_id               VARCHAR(100),                              -- ID phiên làm việc
    user_identifier          VARCHAR(100),                              -- Mã định danh người dùng của khách hàng

    -- Session details - Chi tiết phiên
    login_timestamp          TIMESTAMP NOT NULL,                       -- Thời điểm đăng nhập
    logout_timestamp         TIMESTAMP,                                 -- Thời điểm đăng xuất
    session_duration_minutes INTEGER,                                    -- Thời gian phiên (phút)

    -- Device and location - Thiết bị và vị trí
    device_fingerprint       VARCHAR(255),                              -- Dấu vân tay thiết bị
    ip_address               INET,                                      -- Địa chỉ IP
    user_agent               TEXT,                                      -- Thông tin trình duyệt/ứng dụng
    location_data            JSONB,                                     -- Dữ liệu vị trí: quốc gia, thành phố, etc. (JSON)

    -- Usage details - Chi tiết sử dụng
    features_used            JSONB,                                     -- Các tính năng đã sử dụng (JSON)
    actions_performed        INTEGER          DEFAULT 0,                -- Số hành động thực hiện
    data_processed           BIGINT           DEFAULT 0,                -- Lượng dữ liệu xử lý (bytes hoặc bản ghi)

    created_at               TIMESTAMP        DEFAULT NOW()             -- Thời gian tạo bản ghi
);

-- Main customer entity - Thông tin khách hàng chính
CREATE TABLE customers
(
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất khách hàng
    customer_id        VARCHAR(50) UNIQUE  NOT NULL,               -- Mã khách hàng kinh doanh (ví dụ: CUS-2025-001234)
    workspace_id       UUID REFERENCES workspaces (id),           -- ID workspace quản lý khách hàng này

    -- Basic information - Thông tin cơ bản
    type               VARCHAR(20)      DEFAULT 'INDIVIDUAL',      -- Loại khách hàng: INDIVIDUAL (cá nhân), BUSINESS (doanh nghiệp)
    email              VARCHAR(255) UNIQUE NOT NULL,              -- Email chính của khách hàng (duy nhất)
    phone              VARCHAR(20),                               -- Số điện thoại liên lạc chính

    -- Business information - Thông tin doanh nghiệp
    company_name       VARCHAR(200),                              -- Tên công ty/doanh nghiệp (nếu là BUSINESS)
    tax_code           VARCHAR(20),                               -- Mã số thuế (MST) Việt Nam
    industry           VARCHAR(100),                              -- Lĩnh vực kinh doanh chính
    company_size       VARCHAR(20),                               -- Quy mô công ty: 1-10, 11-50, 51-200, 200+ nhân viên
    website            VARCHAR(255),                              -- Website công ty

    -- Address information - Thông tin địa chỉ
    address            TEXT,                                      -- Địa chỉ chi tiết
    city               VARCHAR(100),                              -- Thành phố/Thị xã
    province           VARCHAR(100),                              -- Tỉnh/Thành phố trực thuộc trung ương
    country            VARCHAR(2)       DEFAULT 'VN',             -- Mã quốc gia (ISO 2 chữ số)
    postal_code        VARCHAR(20),                               -- Mã bưu chính

    -- Business classification - Phân loại kinh doanh
    status             VARCHAR(20)      DEFAULT 'ACTIVE',         -- Trạng thái: ACTIVE (hoạt động), INACTIVE (ngưng hoạt động), BLOCKED (bị chặn), PROSPECT (tiềm năng)
    tier               VARCHAR(20)      DEFAULT 'INDIVIDUAL',     -- Hạng khách hàng: INDIVIDUAL (cá nhân), SMALL (nhỏ), MEDIUM (vừa), ENTERPRISE (lớn)
    lifecycle_stage    VARCHAR(20)      DEFAULT 'PROSPECTIVE',    -- Giai đoạn: PROSPECTIVE (tiềm năng), TRIAL (dùng thử), ACTIVE (hoạt động), LOYAL (trung thành), CHURNED (rời bỏ)

    -- Assignment - Phân công
    sales_id           UUID REFERENCES users (id),               -- ID nhân viên kinh doanh phụ trách
    support_id         UUID REFERENCES users (id),               -- ID nhân viên hỗ trợ phụ trách
    affiliate_id       UUID,                                     -- ID đối tác affiliate giới thiệu (tham chiếu affiliates.id)

    -- Business metrics - Chỉ số kinh doanh
    total_order_value  DECIMAL(15, 2)   DEFAULT 0,               -- Tổng giá trị đơn hàng từ trước đến nay
    license_count      INTEGER          DEFAULT 0,               -- Tổng số giấy phép đã mua
    last_order_date    TIMESTAMP,                                 -- Ngày đặt hàng gần nhất
    first_order_date   TIMESTAMP,                                 -- Ngày đặt hàng đầu tiên

    -- Analytics - Phân tích
    acquisition_source VARCHAR(100),                              -- Nguồn tiếp cận: Website, Referral (giới thiệu), Campaign (chiến dịch)
    acquisition_cost   DECIMAL(15, 2),                            -- Chi phí tiếp cận khách hàng (CAC)
    lifetime_value     DECIMAL(15, 2)   DEFAULT 0,               -- Giá trị trọn đời khách hàng (LTV)

    -- Metadata - Thông tin bổ sung
    tags               JSONB,                                     -- Các thẻ đánh dấu (JSON array)
    custom_fields      JSONB,                                     -- Các trường tùy chỉnh thêm
    notes              TEXT,                                      -- Ghi chú nội bộ về khách hàng

    created_at         TIMESTAMP        DEFAULT NOW(),            -- Thời gian tạo bản ghi
    updated_at         TIMESTAMP        DEFAULT NOW()             -- Thời gian cập nhật gần nhất
);

-- Customer contact persons (for businesses) - Người liên hệ của khách hàng (cho doanh nghiệp)
CREATE TABLE customer_contacts
(
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    customer_id       UUID REFERENCES customers (id) ON DELETE CASCADE, -- ID khách hàng
    contact_type      VARCHAR(20)      DEFAULT 'PRIMARY',               -- Loại liên hệ: PRIMARY (chính), BILLING (thanh toán), TECHNICAL (kỹ thuật), LEGAL (pháp lý)
    full_name         VARCHAR(100) NOT NULL,                           -- Họ tên đầy đủ
    email             VARCHAR(255),                                    -- Email liên hệ
    phone             VARCHAR(20),                                     -- Số điện thoại
    position          VARCHAR(100),                                    -- Chức vụ
    department        VARCHAR(100),                                    -- Phòng ban
    is_decision_maker BOOLEAN          DEFAULT FALSE,                   -- Có phải người quyết định hay không
    is_primary        BOOLEAN          DEFAULT FALSE,                   -- Có phải liên hệ chính hay không
    notes             TEXT,                                            -- Ghi chú
    created_at        TIMESTAMP        DEFAULT NOW()                   -- Thời gian tạo
);

-- Customer tagging system - Hệ thống đánh thẻ khách hàng
CREATE TABLE customer_tags
(
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    customer_id  UUID REFERENCES customers (id) ON DELETE CASCADE, -- ID khách hàng
    tag_name     VARCHAR(50) NOT NULL,                             -- Tên thẻ
    tag_type     VARCHAR(20)      DEFAULT 'MANUAL',                -- Kiểu thẻ: MANUAL (thủ công), AUTO_BEHAVIOR (tự động theo hành vi), AUTO_SYSTEM (tự động hệ thống)
    tag_category VARCHAR(50),                                     -- Danh mục: BEHAVIOR (hành vi), INDUSTRY (ngành nghề), PREFERENCE (sở thích), RISK (rủi ro)
    applied_by   UUID REFERENCES users (id),                     -- Người gán thẻ
    applied_at   TIMESTAMP        DEFAULT NOW()                   -- Thời điểm gán thẻ
);

-- Customer interaction tracking (CRM) - Theo dõi tương tác với khách hàng (CRM)
CREATE TABLE customer_interactions
(
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id     UUID REFERENCES workspaces (id),           -- ID workspace
    customer_id      UUID REFERENCES customers (id),            -- ID khách hàng
    interaction_type VARCHAR(50),                               -- Loại tương tác: EMAIL, CALL (gọi điện), MEETING (họ p), DEMO (demo sản phẩm), SUPPORT_TICKET (ticket hỗ trợ)
    direction        VARCHAR(10),                               -- Hướng: INBOUND (khách gọi vào), OUTBOUND (ta gọi ra)

    -- Interaction details - Chi tiết tương tác
    subject          VARCHAR(255),                              -- Chủ đề tương tác
    description      TEXT,                                      -- Mô tả chi tiết
    outcome          VARCHAR(100),                              -- Kết quả tương tác
    sentiment        VARCHAR(20),                               -- Cảm xúc: POSITIVE (tích cực), NEUTRAL (trung tính), NEGATIVE (tiêu cực)

    -- Scheduling - Lịch trình
    interaction_date TIMESTAMP NOT NULL,                       -- Ngày giờ tương tác
    duration_minutes INTEGER,                                   -- Thời gian tương tác (phút)
    next_follow_up   TIMESTAMP,                                 -- Thời điểm theo dõi tiếp theo

    -- Assignment - Phân công
    performed_by     UUID REFERENCES users (id),               -- Người thực hiện tương tác
    assigned_to      UUID REFERENCES users (id),               -- Người được giao việc

    -- Metadata - Thông tin bổ sung
    channel          VARCHAR(50),                               -- Kênh liên lạc: Phone (điện thoại), Email, In-person (trực tiếp), Video call (gọi video)
    attachments      JSONB,                                     -- Tệp đính kèm (JSON)
    notes            TEXT,                                      -- Ghi chú bổ sung

    created_at       TIMESTAMP        DEFAULT NOW()             -- Thời gian tạo bản ghi
);


-- Customer lifecycle journey tracking - Theo dõi hành trình vòng đời khách hàng
CREATE TABLE customer_journey_stages
(
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id       UUID REFERENCES workspaces (id),           -- ID workspace
    customer_id        UUID REFERENCES customers (id),            -- ID khách hàng

    -- Stage information - Thông tin giai đoạn
    stage              VARCHAR(50) NOT NULL,                      -- Giai đoạn: LEAD (khách tiềm năng), QUALIFIED (khách đủ điều kiện), TRIAL (dùng thẻ), CUSTOMER (khách hàng), LOYAL (trung thành), CHURNED (rời bỏ)
    sub_stage          VARCHAR(50),                               -- Giai đoạn phụ: Hot Lead (khách hot), Cold Lead (khách lạnh), Trial Extended (gia hạn thẻ), etc.

    -- Timing - Thời gian
    entered_at         TIMESTAMP   NOT NULL,                     -- Thời điểm vào giai đoạn
    exited_at          TIMESTAMP,                                 -- Thời điểm ra khỏi giai đoạn
    duration_days      INTEGER,                                   -- Số ngày ở giai đoạn này

    -- Conversion details - Chi tiết chuyển đổi
    conversion_trigger VARCHAR(100),                              -- Sự kiện kích hoạt chuyển đổi: Purchase (mua hàng), Trial signup (đăng ký thẻ), Referral (giới thiệu)
    conversion_source  VARCHAR(100),                              -- Nguồn chuyển đổi: Campaign (chiến dịch), Sales call (gọi bán hàng), Website
    conversion_value   DECIMAL(15, 2),                            -- Giá trị chuyển đổi

    -- Assignment - Phân công
    assigned_sales_id  UUID REFERENCES users (id),               -- ID nhân viên kinh doanh được phân công
    stage_owner_id     UUID REFERENCES users (id),               -- ID chủ sở hữu giai đoạn

    notes              TEXT,                                      -- Ghi chú
    created_at         TIMESTAMP        DEFAULT NOW()             -- Thời gian tạo
);

-- Customer scoring for analytics - Chấm điểm khách hàng cho phân tích
CREATE TABLE customer_scoring
(
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    customer_id        UUID REFERENCES customers (id),            -- ID khách hàng

    -- Score types - Các loại điểm
    score_type         VARCHAR(50)   NOT NULL,                    -- Loại điểm: CHURN_RISK (rủi ro rời bỏ), ENGAGEMENT (tương tác), LTV_POTENTIAL (tiềm năng giá trị trọn đời), LEAD_QUALITY (chất lượng khách tiềm năng)
    score_value        DECIMAL(5, 2) NOT NULL,                    -- Điểm số: 0.00 đến 100.00
    score_grade        VARCHAR(2),                                -- Xếp hạng: A+, A, B, C, D

    -- Calculation details - Chi tiết tính toán
    score_factors      JSONB,                                     -- Các yếu tố đóng góp vào điểm (JSON)
    calculation_method VARCHAR(50),                               -- Phương pháp tính: RULE_BASED (dựa trên quy tắc), ML_MODEL (mô hình học máy), MANUAL (thủ công)
    model_version      VARCHAR(20),                               -- Phiên bản mô hình

    -- Validity - Tính hợp lệ
    calculated_at      TIMESTAMP     NOT NULL,                   -- Thời điểm tính toán
    expires_at         TIMESTAMP,                                 -- Thời điểm hết hiệu lực
    is_current         BOOLEAN          DEFAULT TRUE,             -- Có phải điểm hiện tại hay không

    -- Metadata - Thông tin bổ sung
    confidence_level   DECIMAL(3, 2),                             -- Mức độ tin cậy: 0.00 đến 1.00
    notes              TEXT,                                      -- Ghi chú

    created_at         TIMESTAMP        DEFAULT NOW()             -- Thời gian tạo
);

-- Customer auto-assignment rules - Quy tắc tự động phân công khách hàng
CREATE TABLE assignment_rules
(
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất quy tắc
    workspace_id        UUID REFERENCES workspaces (id),           -- ID workspace sở hữu quy tắc
    rule_name           VARCHAR(100) NOT NULL,                      -- Tên quy tắc
    rule_type           VARCHAR(50),                                -- Loại quy tắc: GEOGRAPHIC (địa lý), WORKLOAD (khối lượng công việc), PRODUCT_EXPERTISE (chuyên môn sản phẩm), CUSTOMER_SIZE (quy mô khách hàng)
    entity_type         VARCHAR(20)      DEFAULT 'CUSTOMER',        -- Loại thực thể: CUSTOMER (khách hàng), LICENSE (giấy phép), ORDER (đơn hàng)

    -- Rule configuration - Cấu hình quy tắc
    conditions          JSONB        NOT NULL,                      -- Điều kiện áp dụng: quy tắc địa lý, sở thích sản phẩm, v.v. (JSON)
    target_role         VARCHAR(50),                                -- Vai trò mục tiêu: SALES (kinh doanh), SUPPORT (hỗ trợ), ACCOUNT_MANAGER (quản lý khách hàng)
    assignment_strategy VARCHAR(50),                                -- Chiến lược phân công: ROUND_ROBIN (xoay vòng), LEAST_LOADED (ít việc nhất), EXPERTISE_MATCH (khớp chuyên môn)

    -- Rule priority and status - Ưu tiên và trạng thái quy tắc
    priority            INTEGER          DEFAULT 100,               -- Độ ưu tiên (số nhỏ hơn ưu tiên cao hơn)
    is_active           BOOLEAN          DEFAULT TRUE,              -- Quy tắc có đang hoạt động hay không

    -- Assignment pool - Nhóm phân công
    eligible_users      JSONB,                                      -- Mảng các ID người dùng đủ điều kiện

    created_at          TIMESTAMP        DEFAULT NOW(),             -- Thời gian tạo
    updated_at          TIMESTAMP        DEFAULT NOW()              -- Thời gian cập nhật gần nhất
);

-- Assignment queue for processing - Hàng đợi xử lý phân công
CREATE TABLE assignment_queues
(
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id       UUID REFERENCES workspaces (id),           -- ID workspace
    entity_type        VARCHAR(50) NOT NULL,                      -- Loại thực thể: CUSTOMER (khách hàng), LICENSE (giấy phép), ORDER (đơn hàng)
    entity_id          UUID        NOT NULL,                      -- ID của thực thể cần phân công

    -- Assignment details - Chi tiết phân công
    assignment_rule_id UUID REFERENCES assignment_rules (id),   -- ID quy tắc phân công được áp dụng
    requested_role     VARCHAR(50),                               -- Vai trò yêu cầu: SALES (kinh doanh), SUPPORT (hỗ trợ)
    current_assignee   UUID REFERENCES users (id),              -- Người được phân công hiện tại

    -- Processing - Xử lý
    assigned_to        UUID REFERENCES users (id),              -- Người được phân công cuối cùng
    assigned_at        TIMESTAMP,                                 -- Thời điểm phân công
    status             VARCHAR(20)      DEFAULT 'PENDING',      -- Trạng thái: PENDING (chờ), ASSIGNED (đã gán), ESCALATED (leo thang), FAILED (thất bại)

    -- Escalation - Leo thang
    escalation_level   INTEGER          DEFAULT 0,              -- Cấp độ leo thang
    escalated_at       TIMESTAMP,                                 -- Thời điểm leo thang
    escalation_reason  TEXT,                                      -- Lý do leo thang

    -- Metadata - Thông tin bổ sung
    priority           INTEGER          DEFAULT 100,              -- Độ ưu tiên
    retry_count        INTEGER          DEFAULT 0,              -- Số lần thử lại

    created_at         TIMESTAMP        DEFAULT NOW()             -- Thời gian tạo
);

-- Customer behavior analytics - Phân tích hành vi khách hàng
CREATE TABLE customer_behavior_events
(
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    customer_id UUID REFERENCES customers (id),            -- ID khách hàng
    event_type  VARCHAR(50) NOT NULL,                      -- Loại sự kiện: PAGE_VIEW (xem trang), FEATURE_USAGE (sử dụng tính năng), DOWNLOAD (tải xuống), SUPPORT_REQUEST (yêu cầu hỗ trợ)
    event_name  VARCHAR(100),                              -- Tên sự kiện

    -- Event details - Chi tiết sự kiện
    event_data  JSONB,                                     -- Dữ liệu sự kiện (JSON)
    session_id  VARCHAR(100),                              -- ID phiên làm việc
    timestamp   TIMESTAMP   NOT NULL,                      -- Dấu thời gian của sự kiện

    -- Source tracking - Theo dõi nguồn
    source      VARCHAR(50),                               -- Nguồn: WEB, MOBILE, API, EMAIL
    ip_address  INET,                                      -- Địa chỉ IP
    user_agent  TEXT,                                      -- Thông tin trình duyệt/ứng dụng

    created_at  TIMESTAMP        DEFAULT NOW()             -- Thời gian tạo bản ghi
);

-- Customer segmentation - Phân khúc khách hàng
CREATE TABLE customer_segments
(
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id       UUID REFERENCES workspaces (id),           -- ID workspace
    segment_name       VARCHAR(100) NOT NULL,                     -- Tên phân khúc
    segment_type       VARCHAR(50),                               -- Loại phân khúc: BEHAVIORAL (hành vi), DEMOGRAPHIC (nhân khẩu học), VALUE_BASED (dựa trên giá trị), LIFECYCLE (vòng đời)

    -- Segment definition - Định nghĩa phân khúc
    criteria           JSONB        NOT NULL,                     -- Các quy tắc phân khúc (JSON)
    description        TEXT,                                      -- Mô tả phân khúc

    -- Metadata - Thông tin bổ sung
    customer_count     INTEGER          DEFAULT 0,              -- Số lượng khách hàng trong phân khúc
    last_calculated_at TIMESTAMP,                                 -- Lần tính toán cuối cùng
    is_active          BOOLEAN          DEFAULT TRUE,              -- Phân khúc có đang hoạt động hay không

    created_by         UUID REFERENCES users (id),              -- Người tạo phân khúc
    created_at         TIMESTAMP        DEFAULT NOW()             -- Thời gian tạo
);


-- Main order entity - Thông tin đơn hàng chính
CREATE TABLE orders
(
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất đơn hàng
    order_number        VARCHAR(50) UNIQUE NOT NULL,                -- Số đơn hàng (ví dụ: ORD-2025-001234)
    workspace_id        UUID REFERENCES workspaces (id),           -- ID workspace quản lý đơn hàng

    -- Order relationships - Liên kết đơn hàng
    customer_id         UUID REFERENCES customers (id),            -- ID khách hàng đặt hàng
    reseller_id         UUID,                                     -- ID đại lý bán hàng (tham chiếu resellers.id)
    affiliate_id        UUID,                                     -- ID đối tác affiliate giới thiệu (tham chiếu affiliates.id)
    trial_license_id    UUID REFERENCES trial_licenses (id),      -- ID giấy phép trial được chuyển đổi (nếu có)

    -- Order details - Chi tiết đơn hàng
    order_type          VARCHAR(20)      DEFAULT 'NEW_LICENSE',   -- Loại đơn: NEW_LICENSE (giấy phép mới), RENEWAL (gia hạn), UPGRADE (nâng cấp), TRIAL (dùng thẻ)
    status              VARCHAR(20)      DEFAULT 'DRAFT',         -- Trạng thái: DRAFT (bản nháp), CONFIRMED (xác nhận), PAID (đã thanh toán), PROCESSING (xử lý), COMPLETED (hoàn thành), CANCELLED (hủy), LOCKED (khóa)

    -- Pricing - Thông tin giá
    subtotal            DECIMAL(15, 2)     NOT NULL,             -- Tổng tiền trước thuế và chiết khấu
    discount_amount     DECIMAL(15, 2)   DEFAULT 0,              -- Số tiền chiết khấu
    discount_percentage DECIMAL(5, 2)    DEFAULT 0,              -- Phần trăm chiết khấu
    tax_amount          DECIMAL(15, 2)   DEFAULT 0,              -- Số tiền thuế VAT
    total_amount        DECIMAL(15, 2)     NOT NULL,             -- Tổng tiền cuối cùng khách hàng phải trả
    currency            VARCHAR(3)       DEFAULT 'VND',          -- Đơn vị tiền tệ

    -- Business rules - Quy tắc kinh doanh
    payment_deadline    TIMESTAMP,                                -- Hạn chốt thanh toán
    auto_lock_at        TIMESTAMP,                                -- Thời điểm tự động khóa nếu không thanh toán (thường 7 ngày)

    -- Assignment - Phân công
    sales_id            UUID REFERENCES users (id),             -- ID nhân viên kinh doanh phụ trách
    approved_by         UUID REFERENCES users (id),             -- ID người phê duyệt đơn hàng
    approved_at         TIMESTAMP,                                -- Thời điểm phê duyệt

    -- Metadata - Thông tin bổ sung
    notes               TEXT,                                     -- Ghi chú hiển thị cho khách hàng
    internal_notes      TEXT,                                     -- Ghi chú nội bộ (không hiển thị cho khách hàng)
    custom_fields       JSONB,                                    -- Các trường tùy chỉnh bổ sung

    created_at          TIMESTAMP        DEFAULT NOW(),          -- Thời gian tạo đơn hàng
    updated_at          TIMESTAMP        DEFAULT NOW()           -- Thời gian cập nhật gần nhất
);

-- Order line items - Các mục trong đơn hàng
CREATE TABLE order_items
(
    id                      UUID PRIMARY KEY        DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    order_id                UUID REFERENCES orders (id) ON DELETE CASCADE,   -- ID đơn hàng cha
    product_id              UUID REFERENCES products (id),                     -- ID sản phẩm

    -- Item details - Chi tiết mục
    product_name            VARCHAR(200),                                      -- Tên sản phẩm (lưu lại tại thời điểm đặt hàng)
    product_code            VARCHAR(50),                                       -- Mã sản phẩm
    license_duration_months INTEGER,                                           -- Thời hạn giấy phép (tháng)

    -- Pricing - Giá
    quantity                INTEGER        NOT NULL DEFAULT 1,                 -- Số lượng
    unit_price              DECIMAL(15, 2) NOT NULL,                           -- Đơn giá
    discount_percentage     DECIMAL(5, 2)           DEFAULT 0,                 -- Phần trăm chiết khấu
    line_total              DECIMAL(15, 2) NOT NULL,                           -- Tổng tiền của mục này

    -- License generation - Tạo giấy phép
    licenses_generated      INTEGER                 DEFAULT 0,                 -- Số lượng giấy phép đã tạo
    license_batch_id        VARCHAR(50),                                       -- ID lô giấy phép

    created_at              TIMESTAMP               DEFAULT NOW()              -- Thời gian tạo
);

-- Invoice management - Quản lý hóa đơn
CREATE TABLE invoices
(
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    invoice_number   VARCHAR(50) UNIQUE NOT NULL,                -- Số hóa đơn (ví dụ: INV-2025-001234)
    workspace_id     UUID REFERENCES workspaces (id),          -- ID workspace
    order_id         UUID REFERENCES orders (id),                -- ID đơn hàng liên quan
    customer_id      UUID REFERENCES customers (id),             -- ID khách hàng

    -- Invoice details - Chi tiết hóa đơn
    invoice_type     VARCHAR(20)      DEFAULT 'STANDARD',        -- Loại hóa đơn: STANDARD (chuẩn), RENEWAL (gia hạn), CREDIT_NOTE (ghi có), DEBIT_NOTE (ghi nợ)
    status           VARCHAR(20)      DEFAULT 'DRAFT',           -- Trạng thái: DRAFT (nháp), SENT (đã gửi), PAID (đã thanh toán), OVERDUE (quá hạn), CANCELLED (đã hủy)

    -- Financial details - Chi tiết tài chính
    subtotal         DECIMAL(15, 2)     NOT NULL,                -- Tổng tiền trước thuế
    vat_percentage   DECIMAL(5, 2)    DEFAULT 10,                -- Phần trăm VAT
    vat_amount       DECIMAL(15, 2)     NOT NULL,                -- Số tiền VAT
    total_amount     DECIMAL(15, 2)     NOT NULL,                -- Tổng tiền phải trả
    currency         VARCHAR(3)       DEFAULT 'VND',             -- Đơn vị tiền tệ

    -- Dates - Ngày tháng
    issue_date       DATE               NOT NULL,                -- Ngày phát hành
    due_date         DATE               NOT NULL,                -- Ngày hết hạn thanh toán
    sent_at          TIMESTAMP,                                  -- Thời điểm gửi hóa đơn
    paid_at          TIMESTAMP,                                  -- Thời điểm thanh toán

    -- S-Invoice integration - Tích hợp hóa đơn điện tử
    s_invoice_code   VARCHAR(50) UNIQUE,                         -- Mã hóa đơn điện tử
    s_invoice_status VARCHAR(20),                                -- Trạng thái HĐĐT: PENDING (chờ), SUBMITTED (đã gửi), SIGNED (đã ký), REJECTED (từ chối)
    s_invoice_url    VARCHAR(500),                               -- URL xem hóa đơn điện tử

    -- Metadata - Thông tin bổ sung
    payment_terms    TEXT,                                       -- Điều khoản thanh toán
    notes            TEXT,                                       -- Ghi chú

    created_at       TIMESTAMP        DEFAULT NOW(),             -- Thời gian tạo
    updated_at       TIMESTAMP        DEFAULT NOW()              -- Thời gian cập nhật gần nhất
);

-- Payment processing - Xử lý thanh toán
CREATE TABLE payments
(
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất thanh toán
    payment_number         VARCHAR(50) UNIQUE NOT NULL,                -- Số giao dịch thanh toán (ví dụ: PAY-2025-001234)
    workspace_id           UUID REFERENCES workspaces (id),           -- ID workspace quản lý giao dịch
    order_id               UUID REFERENCES orders (id),               -- ID đơn hàng được thanh toán
    invoice_id             UUID REFERENCES invoices (id),             -- ID hóa đơn liên quan
    customer_id            UUID REFERENCES customers (id),            -- ID khách hàng thanh toán

    -- Payment method - Phương thức thanh toán
    payment_method_id      UUID REFERENCES payment_methods (id),      -- ID phương thức thanh toán được sử dụng
    payment_type           VARCHAR(50),                                -- Loại thanh toán: FULL (toàn bộ), PARTIAL (một phần), INSTALLMENT (trả góp)

    -- Amount details - Chi tiết số tiền
    amount                 DECIMAL(15, 2)     NOT NULL,               -- Số tiền thanh toán gốc
    processing_fee         DECIMAL(15, 2)   DEFAULT 0,                -- Phí xử lý giao dịch
    net_amount             DECIMAL(15, 2)     NOT NULL,               -- Số tiền thực nhận (sau khi trừ phí)
    currency               VARCHAR(3)       DEFAULT 'VND',            -- Đơn vị tiền tệ

    -- Payment status - Trạng thái thanh toán
    status                 VARCHAR(20)      DEFAULT 'PENDING',        -- Trạng thái: PENDING (chờ xử lý), PROCESSING (đang xử lý), COMPLETED (thành công), FAILED (thất bại), REFUNDED (hoàn tiền)

    -- Gateway details - Chi tiết cổng thanh toán
    gateway_transaction_id VARCHAR(200),                               -- ID giao dịch tại cổng thanh toán (VNPay, MoMo, etc.)
    gateway_response       JSONB,                                      -- Phản hồi chi tiết từ cổng thanh toán (JSON)
    gateway_fee            DECIMAL(15, 2)   DEFAULT 0,                -- Phí cổng thanh toán tính

    -- Timing - Thời gian xử lý
    initiated_at           TIMESTAMP        DEFAULT NOW(),            -- Thời điểm bắt đầu giao dịch
    paid_at                TIMESTAMP,                                  -- Thời điểm hoàn tất thanh toán
    confirmed_at           TIMESTAMP,                                  -- Thời điểm xác nhận giao dịch

    -- Reconciliation - Đối soát
    reconciled             BOOLEAN          DEFAULT FALSE,            -- Đã được đối soát với ngân hàng chưa
    reconciled_at          TIMESTAMP,                                  -- Thời điểm đối soát
    reconciled_by          UUID REFERENCES users (id),               -- Người thực hiện đối soát

    -- Metadata - Thông tin bổ sung
    reference_number       VARCHAR(100),                               -- Số tham chiếu từ ngân hàng hoặc khách hàng cung cấp
    notes                  TEXT,                                       -- Ghi chú về giao dịch

    created_at             TIMESTAMP        DEFAULT NOW()             -- Thời gian tạo bản ghi
);

-- S-Invoice system configuration - Cấu hình hệ thống hóa đơn điện tử
CREATE TABLE s_invoice_configurations
(
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id       UUID REFERENCES workspaces (id),           -- ID workspace

    -- Company information - Thông tin công ty
    company_tax_code   VARCHAR(20)  NOT NULL,                     -- Mã số thuế công ty
    company_name       VARCHAR(200) NOT NULL,                     -- Tên công ty
    company_address    TEXT         NOT NULL,                     -- Địa chỉ công ty
    company_phone      VARCHAR(20),                               -- Số điện thoại công ty
    company_email      VARCHAR(255),                              -- Email công ty

    -- S-Invoice API credentials - Thông tin xác thực API HĐĐT
    api_username       VARCHAR(100),                              -- Tên người dùng API
    api_password_hash  VARCHAR(255),                              -- Mật khẩu API đã mã hóa
    api_endpoint       VARCHAR(500),                              -- Điểm cuối API
    certificate_serial VARCHAR(100),                              -- Số serial chứng thư số
    template_code      VARCHAR(50),                               -- Mã mẫu hóa đơn

    -- Configuration - Cấu hình
    auto_submit        BOOLEAN          DEFAULT TRUE,             -- Tự động gửi hóa đơn
    auto_sign          BOOLEAN          DEFAULT TRUE,             -- Tự động ký hóa đơn

    -- Status - Trạng thái
    is_active          BOOLEAN          DEFAULT TRUE,             -- Có đang hoạt động hay không
    last_test_at       TIMESTAMP,                                 -- Lần kiểm tra kết nối cuối
    test_status        VARCHAR(20),                               -- Trạng thái kiểm tra: SUCCESS (thành công), FAILED (thất bại)

    created_at         TIMESTAMP        DEFAULT NOW(),             -- Thời gian tạo
    updated_at         TIMESTAMP        DEFAULT NOW()              -- Thời gian cập nhật gần nhất
);

-- S-Invoice submission tracking - Theo dõi việc gửi hóa đơn điện tử
CREATE TABLE s_invoice_submissions
(
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    invoice_id          UUID REFERENCES invoices (id),             -- ID hóa đơn liên quan
    s_invoice_config_id UUID REFERENCES s_invoice_configurations (id), -- ID cấu hình HĐĐT

    -- Submission details - Chi tiết gửi
    submission_type     VARCHAR(20)      DEFAULT 'CREATE',         -- Loại gửi: CREATE (tạo mới), CANCEL (hủy), ADJUST (điều chỉnh)
    submission_data     JSONB NOT NULL,                            -- Dữ liệu yêu cầu đầy đủ (JSON)
    response_data       JSONB,                                     -- Dữ liệu phản hồi từ API HĐĐT (JSON)

    -- Status tracking - Theo dõi trạng thái
    submission_status   VARCHAR(50)      DEFAULT 'PENDING',        -- Trạng thái gửi: PENDING (chờ), SUCCESS (thành công), FAILED (thất bại), RETRY (thử lại)
    error_code          VARCHAR(20),                               -- Mã lỗi
    error_message       TEXT,                                      -- Thông báo lỗi

    -- Processing - Xử lý
    retry_count         INTEGER          DEFAULT 0,                -- Số lần thử lại
    max_retries         INTEGER          DEFAULT 3,                -- Số lần thử lại tối đa
    next_retry_at       TIMESTAMP,                                 -- Thời điểm thử lại tiếp theo

    -- Timing - Thời gian
    submitted_at        TIMESTAMP        DEFAULT NOW(),            -- Thời điểm gửi
    processed_at        TIMESTAMP,                                 -- Thời điểm xử lý xong

    created_at          TIMESTAMP        DEFAULT NOW()             -- Thời gian tạo
);

-- Revenue stream tracking - Theo dõi dòng doanh thu
CREATE TABLE revenue_streams
(
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id       UUID REFERENCES workspaces (id),           -- ID workspace

    -- Revenue source - Nguồn doanh thu
    stream_type        VARCHAR(50)    NOT NULL,                   -- Loại dòng: DIRECT_SALES (bán hàng trực tiếp), RESELLER_FEES (phí đại lý), AFFILIATE_COMMISSION (hoa hồng affiliate)
    source_entity_type VARCHAR(50),                               -- Loại thực thể nguồn: ORDER (đơn hàng), RESELLER_FEE (phí đại lý), COMMISSION (hoa hồng)
    source_entity_id   UUID,                                      -- ID thực thể nguồn

    -- Financial details - Chi tiết tài chính
    amount             DECIMAL(15, 2) NOT NULL,                   -- Số tiền
    currency           VARCHAR(3)       DEFAULT 'VND',           -- Đơn vị tiền tệ
    recognition_date   DATE           NOT NULL,                   -- Ngày ghi nhận doanh thu
    accounting_period  VARCHAR(7)     NOT NULL,                   -- Kỳ kế toán (định dạng YYYY-MM)

    -- Classification - Phân loại
    revenue_category   VARCHAR(50),                               -- Danh mục doanh thu: SOFTWARE_LICENSE (giấy phép phần mềm), SUBSCRIPTION (thuê bao), COMMISSION (hoa hồng), FEE (phí)
    product_line       VARCHAR(50),                               -- Dòng sản phẩm: MKT_CARE, MKT_POST, MKT_VIRAL

    -- Tracking - Theo dõi
    is_recognized      BOOLEAN          DEFAULT FALSE,           -- Đã được ghi nhận hay chưa
    recognized_at      TIMESTAMP,                                 -- Thời điểm ghi nhận
    recognized_by      UUID REFERENCES users (id),              -- Người ghi nhận

    -- Metadata - Thông tin bổ sung
    description        TEXT,                                      -- Mô tả
    notes              TEXT,                                      -- Ghi chú

    created_at         TIMESTAMP        DEFAULT NOW()            -- Thời gian tạo
);

-- Financial reconciliation - Đối soát tài chính
CREATE TABLE financial_reconciliation
(
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id         UUID REFERENCES workspaces (id),           -- ID workspace

    -- Reconciliation period - Kỳ đối soát
    reconciliation_type  VARCHAR(50),                               -- Loại đối soát: BANK (ngân hàng), GATEWAY (cổng thanh toán), TAX_AUTHORITY (cơ quan thuế)
    period_start         DATE NOT NULL,                             -- Ngày bắt đầu kỳ
    period_end           DATE NOT NULL,                             -- Ngày kết thúc kỳ

    -- Amounts - Số tiền
    system_amount        DECIMAL(15, 2),                            -- Số tiền trên hệ thống
    external_amount      DECIMAL(15, 2),                            -- Số tiền từ nguồn bên ngoài
    difference_amount    DECIMAL(15, 2),                            -- Số tiền chênh lệch

    -- Status - Trạng thái
    status               VARCHAR(20)      DEFAULT 'PENDING',        -- Trạng thái: PENDING (chờ), MATCHED (khớp), DISCREPANCY (chênh lệch), RESOLVED (đã giải quyết)

    -- Resolution - Giải quyết
    resolved_by          UUID REFERENCES users (id),              -- Người giải quyết
    resolved_at          TIMESTAMP,                                 -- Thời điểm giải quyết
    resolution_notes     TEXT,                                      -- Ghi chú giải quyết

    -- Attachments - Tệp đính kèm
    supporting_documents JSONB,                                     -- Tài liệu chứng minh (JSON)

    created_at           TIMESTAMP        DEFAULT NOW()             -- Thời gian tạo
);

-- Reseller entities - Thông tin đại lý
CREATE TABLE resellers
(
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id           UUID REFERENCES workspaces (id),          -- Workspace MKT cha
    reseller_workspace_id  UUID REFERENCES workspaces (id),          -- Workspace riêng của đại lý

    -- Business information - Thông tin kinh doanh
    name                   VARCHAR(200)  NOT NULL,                   -- Tên đại lý
    business_name          VARCHAR(200),                             -- Tên doanh nghiệp
    tax_code               VARCHAR(20) UNIQUE,                       -- Mã số thuế
    business_license       VARCHAR(50),                              -- Giấy phép kinh doanh

    -- Contact information - Thông tin liên hệ
    email                  VARCHAR(255)  NOT NULL,                   -- Email
    phone                  VARCHAR(20),                              -- Số điện thoại
    address                TEXT,                                     -- Địa chỉ
    city                   VARCHAR(100),                             -- Thành phố
    province               VARCHAR(100),                             -- Tỉnh
    country                VARCHAR(2)       DEFAULT 'VN',            -- Quốc gia

    -- Reseller tier and performance - Hạng và hiệu suất đại lý
    tier                   VARCHAR(20)      DEFAULT 'BRONZE',        -- Hạng: BRONZE (đồng), SILVER (bạc), GOLD (vàng), DIAMOND (kim cương)
    tier_effective_date    DATE,                                     -- Ngày hiệu lực của hạng
    previous_tier          VARCHAR(20),                              -- Hạng trước đó

    -- Commission structure - Cấu trúc hoa hồng/phí
    commission_rate        DECIMAL(5, 2) NOT NULL,                   -- Tỷ lệ chiết khấu họ nhận được
    fee_rate               DECIMAL(5, 2) NOT NULL,                   -- Tỷ lệ phí hệ thống họ phải trả

    -- Commitment tracking - Theo dõi cam kết
    annual_commitment      DECIMAL(15, 2),                           -- Cam kết doanh số năm
    commitment_year        INTEGER,                                  -- Năm cam kết
    current_year_sales     DECIMAL(15, 2)   DEFAULT 0,               -- Doanh số năm hiện tại
    achievement_percentage DECIMAL(5, 2)    DEFAULT 0,               -- Tỷ lệ hoàn thành cam kết

    -- Status - Trạng thái
    status                 VARCHAR(20)      DEFAULT 'ACTIVE',        -- Trạng thái: ACTIVE (hoạt động), INACTIVE (ngưng), SUSPENDED (tạm ngưng), TERMINATED (chấm dứt)
    contract_start_date    DATE,                                     -- Ngày bắt đầu hợp đồng
    contract_end_date      DATE,                                     -- Ngày kết thúc hợp đồng

    -- Performance tracking - Theo dõi hiệu suất
    total_customers        INTEGER          DEFAULT 0,               -- Tổng số khách hàng
    total_orders           INTEGER          DEFAULT 0,               -- Tổng số đơn hàng
    total_revenue          DECIMAL(15, 2)   DEFAULT 0,               -- Tổng doanh thu

    created_at             TIMESTAMP        DEFAULT NOW(),           -- Thời gian tạo
    updated_at             TIMESTAMP        DEFAULT NOW()            -- Thời gian cập nhật gần nhất
);

-- Reseller domain and subdomain management - Quản lý tên miền và tên miền phụ của đại lý
CREATE TABLE reseller_domains
(
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    reseller_id            UUID REFERENCES resellers (id),           -- ID đại lý

    -- Domain configuration - Cấu hình tên miền
    domain_type            VARCHAR(20)      DEFAULT 'SUBDOMAIN',     -- Loại tên miền: SUBDOMAIN (tên miền phụ), CUSTOM_DOMAIN (tên miền riêng)
    domain_name            VARCHAR(255) NOT NULL,                   -- Tên miền: abc.mktsoft.vn hoặc custom.com
    is_primary             BOOLEAN          DEFAULT TRUE,            -- Có phải tên miền chính hay không

    -- SSL and verification - SSL và xác minh
    ssl_certificate_id     VARCHAR(100),                            -- ID chứng chỉ SSL
    ssl_status             VARCHAR(20)      DEFAULT 'PENDING',     -- Trạng thái SSL: PENDING (chờ), ACTIVE (hoạt động), EXPIRED (hết hạn), FAILED (thất bại)
    ssl_expires_at         TIMESTAMP,                               -- Ngày hết hạn SSL

    -- DNS verification - Xác minh DNS
    dns_verification_token VARCHAR(100),                            -- Token xác minh DNS
    verification_status    VARCHAR(20)      DEFAULT 'PENDING',     -- Trạng thái xác minh: PENDING (chờ), VERIFIED (đã xác minh), FAILED (thất bại)
    verification_attempts  INTEGER          DEFAULT 0,               -- Số lần thử xác minh

    -- Status - Trạng thái
    is_active              BOOLEAN          DEFAULT TRUE,            -- Có đang hoạt động hay không

    created_at             TIMESTAMP        DEFAULT NOW(),           -- Thời gian tạo
    verified_at            TIMESTAMP                                -- Thời điểm xác minh
);

-- White-label branding configuration - Cấu hình thương hiệu trắng (white-label)
CREATE TABLE reseller_branding
(
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    reseller_id         UUID REFERENCES resellers (id),           -- ID đại lý

    -- Visual branding - Thương hiệu hình ảnh
    logo_url            VARCHAR(500),                             -- URL logo
    logo_dark_url       VARCHAR(500),                             -- URL logo cho chế độ tối
    favicon_url         VARCHAR(500),                             -- URL favicon

    -- Color scheme - Bảng màu
    primary_color       VARCHAR(7),                               -- Màu chính (mã hex #7C3AED)
    secondary_color     VARCHAR(7),                               -- Màu phụ
    accent_color        VARCHAR(7),                               -- Màu nhấn
    background_color    VARCHAR(7),                               -- Màu nền
    text_color          VARCHAR(7),                               -- Màu chữ

    -- Company information - Thông tin công ty
    display_name        VARCHAR(200),                             -- Tên hiển thị
    tagline             VARCHAR(500),                             -- Khẩu hiệu
    description         TEXT,                                     -- Mô tả

    -- Contact information displayed - Thông tin liên hệ hiển thị
    support_email       VARCHAR(255),                             -- Email hỗ trợ
    support_phone       VARCHAR(50),                              -- SĐT hỗ trợ
    sales_email         VARCHAR(255),                             -- Email kinh doanh
    sales_phone         VARCHAR(50),                              -- SĐT kinh doanh

    -- Legal pages - Các trang pháp lý
    terms_url           VARCHAR(500),                             -- URL điều khoản dịch vụ
    privacy_url         VARCHAR(500),                             -- URL chính sách bảo mật
    refund_policy_url   VARCHAR(500),                             -- URL chính sách hoàn tiền

    -- Custom styling - Tùy chỉnh giao diện
    custom_css          TEXT,                                     -- CSS tùy chỉnh
    header_html         TEXT,                                     -- HTML phần đầu trang
    footer_html         TEXT,                                     -- HTML phần chân trang

    -- Localization - Địa phương hóa
    default_language    VARCHAR(5)       DEFAULT 'vi',            -- Ngôn ngữ mặc định
    supported_languages JSONB            DEFAULT '["vi","en"]',   -- Các ngôn ngữ được hỗ trợ (JSON)

    -- Status - Trạng thái
    is_active           BOOLEAN          DEFAULT TRUE,            -- Có đang hoạt động hay không

    created_at          TIMESTAMP        DEFAULT NOW(),           -- Thời gian tạo
    updated_at          TIMESTAMP        DEFAULT NOW()            -- Thời gian cập nhật gần nhất
);

-- Reseller commitment tracking - Theo dõi cam kết của đại lý
CREATE TABLE reseller_commitments
(
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    reseller_id            UUID REFERENCES resellers (id),           -- ID đại lý

    -- Commitment period - Kỳ cam kết
    commitment_year        INTEGER        NOT NULL,                   -- Năm cam kết
    commitment_period      VARCHAR(20)      DEFAULT 'ANNUAL',        -- Kỳ cam kết: ANNUAL (hàng năm), QUARTERLY (hàng quý)

    -- Financial commitments - Cam kết tài chính
    committed_amount       DECIMAL(15, 2) NOT NULL,                  -- Số tiền cam kết
    currency               VARCHAR(3)       DEFAULT 'VND',           -- Đơn vị tiền tệ

    -- Performance tracking - Theo dõi hiệu suất
    actual_amount          DECIMAL(15, 2)   DEFAULT 0,               -- Số tiền thực tế đạt được
    achievement_percentage DECIMAL(5, 2)    DEFAULT 0,               -- Tỷ lệ hoàn thành cam kết

    -- Tier progression - Tiến trình hạng
    tier_at_commitment     VARCHAR(20),                              -- Hạng tại thời điểm cam kết
    current_tier           VARCHAR(20),                              -- Hạng hiện tại
    tier_change_date       TIMESTAMP,                                -- Ngày thay đổi hạng
    tier_upgrade_eligible  BOOLEAN          DEFAULT FALSE,           -- Đủ điều kiện nâng hạng

    -- Status tracking - Theo dõi trạng thái
    status                 VARCHAR(20)      DEFAULT 'ACTIVE',        -- Trạng thái: ACTIVE (hoạt động), ACHIEVED (đạt), FAILED (thất bại), RENEGOTIATED (đàm phán lại), WAIVED (miễn)
    commitment_date        DATE,                                     -- Ngày cam kết
    review_date            DATE,                                     -- Ngày xem xét

    -- Performance milestones - Các cột mốc hiệu suất
    milestones             JSONB,                                    -- Mục tiêu hàng quý, tiền thưởng, v.v. (JSON)
    milestone_achievements JSONB,                                    -- Thành tích cột mốc (JSON)

    -- Notes and adjustments - Ghi chú và điều chỉnh
    notes                  TEXT,                                     -- Ghi chú
    adjustments            JSONB,                                    -- Điều chỉnh thủ công, miễn trừ, v.v. (JSON)

    created_at             TIMESTAMP        DEFAULT NOW(),           -- Thời gian tạo
    updated_at             TIMESTAMP        DEFAULT NOW()            -- Thời gian cập nhật gần nhất
);

-- Reseller fee calculation and collection - Tính và thu phí đại lý
CREATE TABLE reseller_fees
(
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    reseller_id       UUID REFERENCES resellers (id),           -- ID đại lý
    order_id          UUID REFERENCES orders (id),              -- ID đơn hàng liên quan

    -- Fee calculation - Tính phí
    order_amount      DECIMAL(15, 2) NOT NULL,                  -- Số tiền đơn hàng
    fee_percentage    DECIMAL(5, 2)  NOT NULL,                  -- Tỷ lệ phí
    fee_amount        DECIMAL(15, 2) NOT NULL,                  -- Số tiền phí
    currency          VARCHAR(3)       DEFAULT 'VND',           -- Đơn vị tiền tệ

    -- Billing period - Kỳ thanh toán
    billing_period    VARCHAR(7)     NOT NULL,                  -- Kỳ thanh toán (định dạng YYYY-MM)
    due_date          DATE,                                     -- Hạn thanh toán

    -- Payment status - Trạng thái thanh toán
    status            VARCHAR(20)      DEFAULT 'PENDING',       -- Trạng thái: PENDING (chờ), BILLED (đã xuất hóa đơn), PAID (đã trả), OVERDUE (quá hạn), WAIVED (miễn)
    billed_at         TIMESTAMP,                                -- Thời điểm xuất hóa đơn
    paid_at           TIMESTAMP,                                -- Thời điểm thanh toán
    payment_reference VARCHAR(100),                             -- Mã tham chiếu thanh toán

    -- Adjustments - Điều chỉnh
    adjustment_amount DECIMAL(15, 2)   DEFAULT 0,               -- Số tiền điều chỉnh
    adjustment_reason TEXT,                                     -- Lý do điều chỉnh
    waived_amount     DECIMAL(15, 2)   DEFAULT 0,               -- Số tiền được miễn
    waived_reason     TEXT,                                     -- Lý do miễn
    waived_by         UUID REFERENCES users (id),               -- Người miễn

    created_at        TIMESTAMP        DEFAULT NOW()            -- Thời gian tạo
);

-- Reseller performance analytics - Phân tích hiệu suất đại lý
CREATE TABLE reseller_performance
(
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    reseller_id           UUID REFERENCES resellers (id),           -- ID đại lý

    -- Performance period - Kỳ hiệu suất
    period_type           VARCHAR(20),                              -- Loại kỳ: DAILY (hàng ngày), WEEKLY (hàng tuần), MONTHLY (hàng tháng), QUARTERLY (hàng quý), YEARLY (hàng năm)
    period_start          DATE NOT NULL,                            -- Ngày bắt đầu kỳ
    period_end            DATE NOT NULL,                            -- Ngày kết thúc kỳ

    -- Sales metrics - Chỉ số bán hàng
    total_orders          INTEGER          DEFAULT 0,               -- Tổng số đơn hàng
    total_customers       INTEGER          DEFAULT 0,               -- Tổng số khách hàng
    new_customers         INTEGER          DEFAULT 0,               -- Khách hàng mới
    returning_customers   INTEGER          DEFAULT 0,               -- Khách hàng quay lại

    -- Financial metrics - Chỉ số tài chính
    total_revenue         DECIMAL(15, 2)   DEFAULT 0,               -- Tổng doanh thu
    commission_earned     DECIMAL(15, 2)   DEFAULT 0,               -- Hoa hồng kiếm được
    fees_paid             DECIMAL(15, 2)   DEFAULT 0,               -- Phí đã trả
    net_earnings          DECIMAL(15, 2)   DEFAULT 0,               -- Thu nhập ròng

    -- Product performance - Hiệu suất sản phẩm
    product_sales         JSONB,                                    -- Doanh số theo danh mục sản phẩm (JSON)
    top_products          JSONB,                                    -- Sản phẩm bán chạy nhất (JSON)

    -- Customer metrics - Chỉ số khách hàng
    customer_satisfaction DECIMAL(3, 2),                            -- Mức độ hài lòng của khách hàng (đánh giá trung bình)
    support_tickets       INTEGER          DEFAULT 0,               -- Số ticket hỗ trợ
    renewal_rate          DECIMAL(5, 2),                            -- Tỷ lệ gia hạn
    churn_rate            DECIMAL(5, 2),                            -- Tỷ lệ rời bỏ

    -- Comparative metrics - Chỉ số so sánh
    rank_in_tier          INTEGER,                                  -- Xếp hạng trong bậc
    rank_overall          INTEGER,                                  -- Xếp hạng tổng thể
    growth_rate           DECIMAL(5, 2),                            -- Tỷ lệ tăng trưởng

    -- Calculated at - Thời điểm tính toán
    calculated_at         TIMESTAMP        DEFAULT NOW(),           -- Thời điểm tính toán

    created_at            TIMESTAMP        DEFAULT NOW()            -- Thời gian tạo
);

-- Reseller customer assignments - Phân công khách hàng cho đại lý
CREATE TABLE reseller_customers
(
    id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    reseller_id                  UUID REFERENCES resellers (id),           -- ID đại lý
    customer_id                  UUID REFERENCES customers (id),           -- ID khách hàng

    -- Assignment details - Chi tiết phân công
    assigned_at                  TIMESTAMP        DEFAULT NOW(),           -- Thời điểm phân công
    assigned_by                  UUID REFERENCES users (id),              -- Người phân công
    assignment_method            VARCHAR(50),                              -- Phương thức phân công: DIRECT_SALE (bán trực tiếp), REFERRAL (giới thiệu), TRANSFER (chuyển giao)

    -- Relationship status - Trạng thái mối quan hệ
    status                       VARCHAR(20)      DEFAULT 'ACTIVE',        -- Trạng thái: ACTIVE (hoạt động), INACTIVE (ngưng), TRANSFERRED (đã chuyển giao)

    -- Performance tracking - Theo dõi hiệu suất
    total_orders                 INTEGER          DEFAULT 0,               -- Tổng số đơn hàng
    total_revenue                DECIMAL(15, 2)   DEFAULT 0,               -- Tổng doanh thu
    first_order_date             TIMESTAMP,                                -- Ngày đặt hàng đầu tiên
    last_order_date              TIMESTAMP,                                -- Ngày đặt hàng cuối cùng

    -- Transfer tracking - Theo dõi chuyển giao
    transferred_from_reseller_id UUID REFERENCES resellers (id),           -- ID đại lý chuyển đi
    transferred_to_reseller_id   UUID REFERENCES resellers (id),           -- ID đại lý nhận
    transfer_date                TIMESTAMP,                                -- Ngày chuyển giao
    transfer_reason              TEXT,                                     -- Lý do chuyển giao

    notes                        TEXT,                                     -- Ghi chú
    created_at                   TIMESTAMP        DEFAULT NOW()             -- Thời gian tạo
);

-- Reseller user management (users within reseller workspace) - Quản lý người dùng đại lý (trong workspace của đại lý)
CREATE TABLE reseller_users
(
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    reseller_id          UUID REFERENCES resellers (id),           -- ID đại lý
    user_id              UUID REFERENCES users (id),               -- ID người dùng

    -- Role within reseller organization - Vai trò trong tổ chức đại lý
    reseller_role        VARCHAR(50),                              -- Vai trò: ADMIN, SALES (kinh doanh), SUPPORT (hỗ trợ), VIEWER (người xem)
    permissions          JSONB,                                    -- Quyền hạn (JSON)

    -- Status - Trạng thái
    status               VARCHAR(20)      DEFAULT 'ACTIVE',        -- Trạng thái: ACTIVE (hoạt động), INACTIVE (ngưng), SUSPENDED (tạm ngưng)

    -- Access control - Kiểm soát truy cập
    can_create_orders    BOOLEAN          DEFAULT TRUE,            -- Có thể tạo đơn hàng
    can_view_analytics   BOOLEAN          DEFAULT FALSE,           -- Có thể xem phân tích
    can_manage_customers BOOLEAN          DEFAULT TRUE,            -- Có thể quản lý khách hàng
    can_access_billing   BOOLEAN          DEFAULT FALSE,           -- Có thể truy cập thanh toán

    -- Assignment - Phân công
    assigned_by          UUID REFERENCES users (id),              -- Người phân công
    assigned_at          TIMESTAMP        DEFAULT NOW(),           -- Thời điểm phân công

    created_at           TIMESTAMP        DEFAULT NOW()            -- Thời gian tạo
);

-- Main affiliate entity - Thông tin đối tác affiliate chính
CREATE TABLE affiliates
(
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất affiliate
    workspace_id            UUID REFERENCES workspaces (id),           -- ID workspace quản lý affiliate
    affiliate_code          VARCHAR(50) UNIQUE NOT NULL,               -- Mã affiliate (ví dụ: AFF_CUST_001234, AFF_STAFF_001234)

    -- Affiliate type and source - Loại và nguồn gốc affiliate
    type                    VARCHAR(20)        NOT NULL,               -- Loại: CUSTOMER (khách hàng), STAFF (nhân viên), EXTERNAL (bên ngoài)
    source_type             VARCHAR(50),                               -- Nguồn tạo: AUTO_CUSTOMER (tự động từ khách), AUTO_STAFF (tự động từ nhân viên), MANUAL_REGISTRATION (đăng ký thủ công)

    -- Related entities - Liên kết với thực thể khác
    related_customer_id     UUID REFERENCES customers (id),            -- ID khách hàng liên quan (nếu type = CUSTOMER)
    related_user_id         UUID REFERENCES users (id),                -- ID nhân viên liên quan (nếu type = STAFF)

    -- Basic information - Thông tin cơ bản
    name                    VARCHAR(200)       NOT NULL,               -- Tên đầy đủ của affiliate
    email                   VARCHAR(255)       NOT NULL,               -- Email liên lạc
    phone                   VARCHAR(20),                               -- Số điện thoại
    company_name            VARCHAR(200),                              -- Tên công ty (nếu có)
    tax_code                VARCHAR(20),                               -- Mã số thuế (cho việc báo cáo thuế)

    -- Performance tier - Hạng thành tích
    tier                    VARCHAR(20)      DEFAULT 'BRONZE',         -- Hạng hiện tại: BRONZE (đồng), SILVER (bạc), GOLD (vàng), PLATINUM (bạch kim)
    tier_effective_date     DATE,                                      -- Ngày hiệu lực của hạng hiện tại
    previous_tier           VARCHAR(20),                               -- Hạng trước đó

    -- Commission structure - Cấu trúc hoa hồng
    commission_rate         DECIMAL(5, 2)      NOT NULL,               -- Tỉ lệ hoa hồng (5%, 7%, 10%, 12%)
    commission_type         VARCHAR(20)      DEFAULT 'PERCENTAGE',     -- Kiểu hoa hồng: PERCENTAGE (theo %), FIXED_AMOUNT (số tiền cố định)
    custom_rates            JSONB,                                     -- Tỉ lệ hoa hồng riêng cho từng sản phẩm (JSON)

    -- Payment information - Thông tin thanh toán
    payment_method          VARCHAR(50),                               -- Phương thức nhận hoa hồng: BANK_TRANSFER (chuyển khoản), PAYPAL, MOMO, MANUAL (thủ công)
    payment_details         JSONB,                                     -- Chi tiết thanh toán: số tài khoản, email PayPal, etc. (JSON)
    tax_withholding_rate    DECIMAL(5, 2)    DEFAULT 0,                -- Tỉ lệ thuế khau trừ

    -- Performance tracking - Theo dõi hiệu suất
    total_referrals         INTEGER          DEFAULT 0,                -- Tổng số lượt giới thiệu
    successful_conversions  INTEGER          DEFAULT 0,                -- Số lượt chuyển đổi thành công
    total_commission_earned DECIMAL(15, 2)   DEFAULT 0,                -- Tổng hoa hồng đã kiếm được
    total_commission_paid   DECIMAL(15, 2)   DEFAULT 0,                -- Tổng hoa hồng đã được trả
    conversion_rate         DECIMAL(5, 2)    DEFAULT 0,                -- Tỉ lệ chuyển đổi (%)

    -- Status - Trạng thái
    status                  VARCHAR(20)      DEFAULT 'ACTIVE',         -- Trạng thái: ACTIVE (hoạt động), INACTIVE (ngưng hoạt động), SUSPENDED (tạm ngưng), TERMINATED (chấm dứt)
    activation_date         DATE,                                      -- Ngày kích hoạt tài khoản affiliate
    suspension_reason       TEXT,                                      -- Lý do tạm ngưng (nếu có)

    -- Auto-activation settings - Cài đặt kích hoạt tự động
    auto_activated          BOOLEAN          DEFAULT FALSE,            -- Đã được kích hoạt tự động hay chưa
    activation_trigger      VARCHAR(100),                              -- Sự kiện kích hoạt: FIRST_PURCHASE (mua hàng đầu tiên), STAFF_ONBOARD (nhân viên mới), MANUAL (thủ công)
    activation_order_id     UUID REFERENCES orders (id),               -- ID đơn hàng kích hoạt (nếu có)

    created_at              TIMESTAMP        DEFAULT NOW(),            -- Thời gian tạo affiliate
    updated_at              TIMESTAMP        DEFAULT NOW()             -- Thời gian cập nhật gần nhất
);

-- Affiliate tracking links and campaigns - Link theo dõi và chiến dịch affiliate
CREATE TABLE affiliate_links
(
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    affiliate_id      UUID REFERENCES affiliates (id),           -- ID affiliate

    -- Campaign information - Thông tin chiến dịch
    campaign_name     VARCHAR(100),                              -- Tên chiến dịch
    campaign_type     VARCHAR(50),                               -- Loại chiến dịch: GENERAL (chung), PRODUCT_SPECIFIC (sản phẩm cụ thể), SEASONAL (theo mùa), CUSTOM (tùy chỉnh)
    tracking_code     VARCHAR(100) UNIQUE NOT NULL,              -- Mã theo dõi duy nhất

    -- Link configuration - Cấu hình link
    target_url        VARCHAR(500)        NOT NULL,              -- URL đích
    redirect_url      VARCHAR(500),                              -- URL chuyển hướng (trang đích tùy chỉnh)

    -- UTM parameters - Tham số UTM
    utm_source        VARCHAR(100),                              -- Nguồn
    utm_medium        VARCHAR(100),                              -- Phương tiện
    utm_campaign      VARCHAR(100),                              -- Chiến dịch
    utm_term          VARCHAR(100),                              -- Từ khóa
    utm_content       VARCHAR(100),                              -- Nội dung

    -- Link settings - Cài đặt link
    is_active         BOOLEAN          DEFAULT TRUE,             -- Link có hoạt động hay không
    click_limit       INTEGER,                                   -- Giới hạn số lần nhấp
    conversion_limit  INTEGER,                                   -- Giới hạn số lần chuyển đổi

    -- Validity - Hiệu lực
    valid_from        TIMESTAMP        DEFAULT NOW(),            -- Có hiệu lực từ
    valid_until       TIMESTAMP,                                 -- Có hiệu lực đến

    -- Performance tracking - Theo dõi hiệu suất
    total_clicks      INTEGER          DEFAULT 0,                -- Tổng số lần nhấp
    unique_clicks     INTEGER          DEFAULT 0,                -- Số lần nhấp duy nhất
    total_conversions INTEGER          DEFAULT 0,                -- Tổng số chuyển đổi
    conversion_value  DECIMAL(15, 2)   DEFAULT 0,                -- Giá trị chuyển đổi

    -- Metadata - Thông tin bổ sung
    description       TEXT,                                      -- Mô tả
    notes             TEXT,                                      -- Ghi chú

    created_at        TIMESTAMP        DEFAULT NOW()             -- Thời gian tạo
);

-- Click tracking for affiliate links - Theo dõi lượt nhấp cho link affiliate
CREATE TABLE affiliate_clicks
(
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    affiliate_link_id   UUID REFERENCES affiliate_links (id),      -- ID link affiliate
    affiliate_id        UUID REFERENCES affiliates (id),           -- ID affiliate

    -- Click details - Chi tiết lượt nhấp
    clicked_at          TIMESTAMP        DEFAULT NOW(),            -- Thời điểm nhấp
    session_id          VARCHAR(100),                              -- ID phiên

    -- User information - Thông tin người dùng
    ip_address          INET,                                      -- Địa chỉ IP
    user_agent          TEXT,                                      -- Thông tin trình duyệt
    referrer_url        VARCHAR(500),                              -- URL giới thiệu

    -- Geographic information - Thông tin địa lý
    country_code        VARCHAR(2),                                -- Mã quốc gia
    region              VARCHAR(100),                              -- Vùng/miền
    city                VARCHAR(100),                              -- Thành phố

    -- Device information - Thông tin thiết bị
    device_type         VARCHAR(20),                               -- Loại thiết bị: DESKTOP, MOBILE, TABLET
    browser             VARCHAR(50),                               -- Trình duyệt
    operating_system    VARCHAR(50),                               -- Hệ điều hành

    -- Conversion tracking - Theo dõi chuyển đổi
    converted           BOOLEAN          DEFAULT FALSE,            -- Đã chuyển đổi hay chưa
    conversion_order_id UUID REFERENCES orders (id),               -- ID đơn hàng chuyển đổi
    conversion_value    DECIMAL(15, 2),                            -- Giá trị chuyển đổi
    conversion_date     TIMESTAMP,                                 -- Ngày chuyển đổi

    -- Attribution - Phân bổ
    attribution_model   VARCHAR(50)      DEFAULT 'LAST_CLICK',     -- Mô hình phân bổ: FIRST_CLICK (lần nhấp đầu), LAST_CLICK (lần nhấp cuối), LINEAR (tuyến tính)
    attribution_weight  DECIMAL(3, 2)    DEFAULT 1.00,             -- Trọng số phân bổ

    created_at          TIMESTAMP        DEFAULT NOW()             -- Thời gian tạo
);

-- Commission calculation and tracking - Tính và theo dõi hoa hồng
CREATE TABLE affiliate_commissions
(
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    affiliate_id         UUID REFERENCES affiliates (id),           -- ID affiliate
    order_id             UUID REFERENCES orders (id),               -- ID đơn hàng
    click_id             UUID REFERENCES affiliate_clicks (id),     -- ID lượt nhấp

    -- Commission calculation - Tính hoa hồng
    order_amount         DECIMAL(15, 2) NOT NULL,                   -- Số tiền đơn hàng
    commission_rate      DECIMAL(5, 2)  NOT NULL,                   -- Tỷ lệ hoa hồng
    commission_amount    DECIMAL(15, 2) NOT NULL,                   -- Số tiền hoa hồng
    currency             VARCHAR(3)       DEFAULT 'VND',           -- Đơn vị tiền tệ

    -- Commission type and tier - Loại hoa hồng và hạng
    commission_type      VARCHAR(20),                               -- Loại hoa hồng: STANDARD (chuẩn), BONUS (thưởng), TIER_UPGRADE (nâng hạng)
    tier_at_calculation  VARCHAR(20),                               -- Hạng tại thời điểm tính

    -- Tax handling - Xử lý thuế
    tax_withholding_rate DECIMAL(5, 2)    DEFAULT 0,               -- Tỷ lệ thuế khấu trừ
    tax_withheld         DECIMAL(15, 2)   DEFAULT 0,               -- Số tiền thuế đã khấu trừ
    net_commission       DECIMAL(15, 2) NOT NULL,                   -- Hoa hồng thực nhận

    -- Status tracking - Theo dõi trạng thái
    status               VARCHAR(20)      DEFAULT 'PENDING',       -- Trạng thái: PENDING (chờ), APPROVED (đã duyệt), PAID (đã trả), DISPUTED (tranh chấp), CANCELLED (đã hủy)

    -- Approval workflow - Quy trình duyệt
    approved_by          UUID REFERENCES users (id),              -- Người duyệt
    approved_at          TIMESTAMP,                                 -- Thời điểm duyệt
    approval_notes       TEXT,                                      -- Ghi chú duyệt

    -- Payment tracking - Theo dõi thanh toán
    payment_batch_id     VARCHAR(50),                               -- ID lô thanh toán
    paid_at              TIMESTAMP,                                 -- Thời điểm thanh toán
    payment_reference    VARCHAR(100),                              -- Mã tham chiếu thanh toán
    payment_method       VARCHAR(50),                               -- Phương thức thanh toán

    -- Attribution and validation - Phân bổ và xác thực
    attribution_model    VARCHAR(50),                               -- Mô hình phân bổ
    validation_status    VARCHAR(20),                               -- Trạng thái xác thực: VALID (hợp lệ), FRAUD_SUSPECTED (nghi ngờ gian lận), INVALID (không hợp lệ)
    validation_notes     TEXT,                                      -- Ghi chú xác thực

    -- Timing - Thời gian
    earned_at            TIMESTAMP        DEFAULT NOW(),           -- Thời điểm kiếm được
    due_date             DATE,                                      -- Hạn thanh toán

    created_at           TIMESTAMP        DEFAULT NOW()            -- Thời gian tạo
);

-- Affiliate tier progression tracking - Theo dõi tiến trình hạng affiliate
CREATE TABLE affiliate_tier_progression
(
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    affiliate_id              UUID REFERENCES affiliates (id),           -- ID affiliate

    -- Tier change details - Chi tiết thay đổi hạng
    previous_tier             VARCHAR(20),                               -- Hạng trước đó
    new_tier                  VARCHAR(20),                               -- Hạng mới
    effective_date            DATE NOT NULL,                             -- Ngày hiệu lực

    -- Progression trigger - Tác nhân tiến trình
    progression_trigger       VARCHAR(100),                              -- Tác nhân: REVENUE_THRESHOLD (ngưỡng doanh thu), REFERRAL_COUNT (số lượt giới thiệu), MANUAL (thủ công)
    progression_criteria      JSONB,                                     -- Tiêu chí đã đạt được (JSON)

    -- Performance metrics at progression - Chỉ số hiệu suất tại thời điểm tiến trình
    total_revenue             DECIMAL(15, 2),                            -- Tổng doanh thu
    total_referrals           INTEGER,                                   -- Tổng số lượt giới thiệu
    conversion_rate           DECIMAL(5, 2),                             -- Tỷ lệ chuyển đổi
    performance_period_months INTEGER,                                   -- Kỳ hiệu suất (tháng)

    -- Benefits and changes - Lợi ích và thay đổi
    old_commission_rate       DECIMAL(5, 2),                             -- Tỷ lệ hoa hồng cũ
    new_commission_rate       DECIMAL(5, 2),                             -- Tỷ lệ hoa hồng mới
    tier_benefits             JSONB,                                     -- Lợi ích bổ sung nhận được (JSON)

    -- Processing - Xử lý
    processed_by              UUID REFERENCES users (id),              -- Người xử lý
    processed_at              TIMESTAMP,                                 -- Thời điểm xử lý
    notes                     TEXT,                                      -- Ghi chú

    created_at                TIMESTAMP        DEFAULT NOW()             -- Thời gian tạo
);

-- Affiliate auto-activation rules - Quy tắc tự động kích hoạt affiliate
CREATE TABLE affiliate_auto_rules
(
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id         UUID REFERENCES workspaces (id),           -- ID workspace

    -- Rule configuration - Cấu hình quy tắc
    rule_name            VARCHAR(100)  NOT NULL,                    -- Tên quy tắc
    rule_type            VARCHAR(50)   NOT NULL,                    -- Loại quy tắc: CUSTOMER_PURCHASE (khách hàng mua), STAFF_ONBOARD (nhân viên mới), REVENUE_THRESHOLD (ngưỡng doanh thu)
    entity_type          VARCHAR(20),                               -- Loại thực thể: CUSTOMER, USER

    -- Activation triggers - Tác nhân kích hoạt
    trigger_conditions   JSONB         NOT NULL,                    -- Điều kiện kích hoạt: số tiền mua, vai trò người dùng, v.v. (JSON)

    -- Affiliate configuration - Cấu hình affiliate
    initial_tier         VARCHAR(20)      DEFAULT 'BRONZE',       -- Hạng ban đầu
    commission_rate      DECIMAL(5, 2) NOT NULL,                    -- Tỷ lệ hoa hồng
    affiliate_type       VARCHAR(20),                               -- Loại affiliate: CUSTOMER, STAFF

    -- Rule settings - Cài đặt quy tắc
    is_active            BOOLEAN          DEFAULT TRUE,             -- Quy tắc có hoạt động hay không
    priority             INTEGER          DEFAULT 100,              -- Độ ưu tiên

    -- Validation rules - Quy tắc xác thực
    eligibility_criteria JSONB,                                     -- Tiêu chí đủ điều kiện bổ sung (JSON)
    exclusion_criteria   JSONB,                                     -- Tiêu chí loại trừ khỏi kích hoạt tự động (JSON)

    -- Tracking - Theo dõi
    activation_count     INTEGER          DEFAULT 0,                -- Số lần kích hoạt
    last_activated_at    TIMESTAMP,                                 -- Lần kích hoạt cuối

    created_by           UUID REFERENCES users (id),              -- Người tạo
    created_at           TIMESTAMP        DEFAULT NOW(),            -- Thời gian tạo
    updated_at           TIMESTAMP        DEFAULT NOW()             -- Thời gian cập nhật gần nhất
);

-- Affiliate payout batches - Lô thanh toán affiliate
CREATE TABLE affiliate_payouts
(
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id            UUID REFERENCES workspaces (id),           -- ID workspace

    -- Payout batch information - Thông tin lô thanh toán
    batch_id                VARCHAR(50) UNIQUE NOT NULL,               -- ID lô
    payout_period_start     DATE               NOT NULL,               -- Ngày bắt đầu kỳ thanh toán
    payout_period_end       DATE               NOT NULL,               -- Ngày kết thúc kỳ thanh toán

    -- Financial details - Chi tiết tài chính
    total_commission_amount DECIMAL(15, 2)     NOT NULL,               -- Tổng số tiền hoa hồng
    total_tax_withheld      DECIMAL(15, 2)   DEFAULT 0,                -- Tổng thuế đã khấu trừ
    total_payout_amount     DECIMAL(15, 2)     NOT NULL,               -- Tổng số tiền thanh toán
    currency                VARCHAR(3)       DEFAULT 'VND',            -- Đơn vị tiền tệ

    -- Processing details - Chi tiết xử lý
    affiliate_count         INTEGER            NOT NULL,               -- Số lượng affiliate
    commission_count        INTEGER            NOT NULL,               -- Số lượng hoa hồng

    -- Status - Trạng thái
    status                  VARCHAR(20)      DEFAULT 'PENDING',        -- Trạng thái: PENDING (chờ), PROCESSING (đang xử lý), COMPLETED (hoàn thành), FAILED (thất bại)

    -- Payment method summary - Tóm tắt phương thức thanh toán
    payment_methods         JSONB,                                     -- Số lượng theo phương thức thanh toán (JSON)

    -- Processing - Xử lý
    processed_by            UUID REFERENCES users (id),              -- Người xử lý
    processed_at            TIMESTAMP,                                 -- Thời điểm xử lý
    completion_rate         DECIMAL(5, 2),                             -- Tỷ lệ thanh toán thành công

    -- Metadata - Thông tin bổ sung
    notes                   TEXT,                                      -- Ghi chú
    error_summary           TEXT,                                      -- Tóm tắt lỗi

    created_at              TIMESTAMP        DEFAULT NOW()             -- Thời gian tạo
);

-- Sales team structure - Cấu trúc đội ngũ kinh doanh
CREATE TABLE sales_teams
(
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id        UUID REFERENCES workspaces (id),           -- ID workspace
    team_name           VARCHAR(100) NOT NULL,                     -- Tên đội/nhóm
    team_type           VARCHAR(50),                               -- Loại đội: SME_FOCUSED (tập trung SME), ENTERPRISE_FOCUSED (tập trung doanh nghiệp lớn), INDIVIDUAL_FOCUSED (tập trung cá nhân)

    -- Team hierarchy - Cấu trúc phân cấp
    parent_team_id      UUID REFERENCES sales_teams (id),        -- ID đội cha
    team_level          VARCHAR(20),                               -- Cấp độ: TEAM (nhóm), DEPARTMENT (phòng), DIVISION (ban)

    -- Leadership - Lãnh đạo
    team_leader_id      UUID REFERENCES users (id),              -- ID trưởng nhóm
    team_manager_id     UUID REFERENCES users (id),              -- ID quản lý

    -- Team configuration - Cấu hình đội
    territory           JSONB,                                     -- Lãnh thổ (địa lý hoặc phân khúc khách hàng) (JSON)
    product_focus       JSONB,                                     -- Sản phẩm đội tập trung (JSON)
    customer_tier_focus JSONB,                                     -- Phân khúc khách hàng đội tập trung (INDIVIDUAL, SME, ENTERPRISE) (JSON)

    -- Performance tracking - Theo dõi hiệu suất
    member_count        INTEGER          DEFAULT 0,               -- Số lượng thành viên
    target_revenue      DECIMAL(15, 2),                           -- Doanh thu mục tiêu
    current_revenue     DECIMAL(15, 2)   DEFAULT 0,               -- Doanh thu hiện tại
    target_customers    INTEGER,                                  -- Khách hàng mục tiêu
    current_customers   INTEGER          DEFAULT 0,               -- Khách hàng hiện tại

    -- Status - Trạng thái
    is_active           BOOLEAN          DEFAULT TRUE,            -- Có đang hoạt động hay không

    created_at          TIMESTAMP        DEFAULT NOW(),           -- Thời gian tạo
    updated_at          TIMESTAMP        DEFAULT NOW()            -- Thời gian cập nhật gần nhất
);

-- Sales KPI definitions and tracking - Định nghĩa và theo dõi KPI kinh doanh
CREATE TABLE sales_kpis
(
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id           UUID REFERENCES workspaces (id),           -- ID workspace
    user_id                UUID REFERENCES users (id),              -- ID người dùng
    team_id                UUID REFERENCES sales_teams (id),        -- ID đội

    -- KPI definition - Định nghĩa KPI
    kpi_name               VARCHAR(100)   NOT NULL,                 -- Tên KPI
    kpi_type               VARCHAR(50),                               -- Loại KPI: REVENUE (doanh thu), CUSTOMER_COUNT (số lượng khách hàng), CONVERSION_RATE (tỷ lệ chuyển đổi), CALLS (cuộc gọi), DEMOS (demo)
    kpi_category           VARCHAR(50),                               -- Danh mục KPI: SALES (bán hàng), ACTIVITY (hoạt động), QUALITY (chất lượng)

    -- Target and measurement - Mục tiêu và đo lường
    target_value           DECIMAL(15, 2) NOT NULL,                 -- Giá trị mục tiêu
    current_value          DECIMAL(15, 2)   DEFAULT 0,             -- Giá trị hiện tại
    unit                   VARCHAR(20),                               -- Đơn vị: VND, COUNT (số lượng), PERCENTAGE (%)

    -- Time period - Kỳ thời gian
    period_type            VARCHAR(20),                               -- Loại kỳ: DAILY (hàng ngày), WEEKLY (hàng tuần), MONTHLY (hàng tháng), QUARTERLY (hàng quý), YEARLY (hàng năm)
    period_start           DATE           NOT NULL,                 -- Ngày bắt đầu kỳ
    period_end             DATE           NOT NULL,                 -- Ngày kết thúc kỳ

    -- Achievement tracking - Theo dõi thành tích
    achievement_percentage DECIMAL(5, 2)    DEFAULT 0,             -- Tỷ lệ hoàn thành
    status                 VARCHAR(20)      DEFAULT 'IN_PROGRESS', -- Trạng thái: IN_PROGRESS (đang tiến hành), ACHIEVED (đạt), FAILED (thất bại), SUSPENDED (tạm ngưng)

    -- Weighting and importance - Trọng số và tầm quan trọng
    weight                 DECIMAL(3, 2)    DEFAULT 1.00,          -- Trọng số để tính hiệu suất tổng thể
    is_mandatory           BOOLEAN          DEFAULT FALSE,         -- Có bắt buộc hay không

    -- Auto-update configuration - Cấu hình tự động cập nhật
    auto_update            BOOLEAN          DEFAULT TRUE,          -- Tự động cập nhật
    update_frequency       VARCHAR(20)      DEFAULT 'DAILY',       -- Tần suất cập nhật
    last_updated_at        TIMESTAMP,                               -- Lần cập nhật cuối

    created_at             TIMESTAMP        DEFAULT NOW(),         -- Thời gian tạo
    updated_at             TIMESTAMP        DEFAULT NOW()          -- Thời gian cập nhật gần nhất
);

-- Sales performance tracking - Theo dõi hiệu suất kinh doanh
CREATE TABLE sales_performance
(
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    user_id                  UUID REFERENCES users (id),              -- ID người dùng
    team_id                  UUID REFERENCES sales_teams (id),        -- ID đội

    -- Performance period - Kỳ hiệu suất
    period_type              VARCHAR(20),                               -- Loại kỳ: DAILY (hàng ngày), WEEKLY (hàng tuần), MONTHLY (hàng tháng), QUARTERLY (hàng quý)
    period_start             DATE NOT NULL,                             -- Ngày bắt đầu kỳ
    period_end               DATE NOT NULL,                             -- Ngày kết thúc kỳ

    -- Sales metrics - Chỉ số bán hàng
    revenue_generated        DECIMAL(15, 2)   DEFAULT 0,              -- Doanh thu tạo ra
    orders_created           INTEGER          DEFAULT 0,              -- Số đơn hàng đã tạo
    orders_closed            INTEGER          DEFAULT 0,              -- Số đơn hàng đã chốt
    customers_acquired       INTEGER          DEFAULT 0,              -- Số khách hàng mới
    customers_lost           INTEGER          DEFAULT 0,              -- Số khách hàng mất

    -- Activity metrics - Chỉ số hoạt động
    calls_made               INTEGER          DEFAULT 0,              -- Số cuộc gọi đã thực hiện
    emails_sent              INTEGER          DEFAULT 0,              -- Số email đã gửi
    meetings_held            INTEGER          DEFAULT 0,              -- Số cuộc họp đã tổ chức
    demos_conducted          INTEGER          DEFAULT 0,              -- Số buổi demo đã thực hiện
    proposals_sent           INTEGER          DEFAULT 0,              -- Số đề xuất đã gửi

    -- Conversion metrics - Chỉ số chuyển đổi
    lead_conversion_rate     DECIMAL(5, 2)    DEFAULT 0,              -- Tỷ lệ chuyển đổi khách tiềm năng
    demo_conversion_rate     DECIMAL(5, 2)    DEFAULT 0,              -- Tỷ lệ chuyển đổi sau demo
    proposal_conversion_rate DECIMAL(5, 2)    DEFAULT 0,              -- Tỷ lệ chuyển đổi sau đề xuất

    -- Quality metrics - Chỉ số chất lượng
    average_deal_size        DECIMAL(15, 2)   DEFAULT 0,              -- Quy mô giao dịch trung bình
    sales_cycle_days         DECIMAL(5, 1)    DEFAULT 0,              -- Chu kỳ bán hàng (ngày)
    customer_satisfaction    DECIMAL(3, 2)    DEFAULT 0,              -- Mức độ hài lòng của khách hàng

    -- Ranking and comparison - Xếp hạng và so sánh
    team_rank                INTEGER,                                 -- Xếp hạng trong đội
    department_rank          INTEGER,                                 -- Xếp hạng trong phòng
    company_rank             INTEGER,                                 -- Xếp hạng trong công ty

    -- Achievement scores - Điểm thành tích
    kpi_achievement_score    DECIMAL(5, 2)    DEFAULT 0,              -- Điểm hoàn thành KPI tổng thể
    performance_grade        VARCHAR(2),                                -- Xếp loại hiệu suất: A+, A, B, C, D, F

    -- Calculated metrics - Chỉ số được tính toán
    calculated_at            TIMESTAMP        DEFAULT NOW(),            -- Thời điểm tính toán

    created_at               TIMESTAMP        DEFAULT NOW()             -- Thời gian tạo
);

-- Sales probation tracking - Theo dõi thử việc kinh doanh
CREATE TABLE sales_probation
(
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    user_id                UUID REFERENCES users (id),              -- ID người dùng

    -- Probation period - Kỳ thử việc
    probation_type         VARCHAR(20),                               -- Loại thử việc: NEW_HIRE (tuyển mới), PERFORMANCE_IMPROVEMENT (cải thiện hiệu suất)
    start_date             DATE NOT NULL,                             -- Ngày bắt đầu
    end_date               DATE NOT NULL,                             -- Ngày kết thúc
    extension_count        INTEGER          DEFAULT 0,              -- Số lần gia hạn

    -- Performance requirements - Yêu cầu hiệu suất
    required_kpis          JSONB,                                     -- Các KPI phải đạt (JSON)
    evaluation_criteria    JSONB,                                     -- Tiêu chí đánh giá cụ thể (JSON)

    -- Progress tracking - Theo dõi tiến độ
    current_performance    JSONB,                                     -- Hiệu suất hiện tại so với yêu cầu (JSON)
    milestone_achievements JSONB,                                     -- Thành tích các cột mốc (hàng tháng/tuần) (JSON)

    -- Evaluation schedule - Lịch đánh giá
    review_frequency       VARCHAR(20)      DEFAULT 'MONTHLY',        -- Tần suất xem xét: WEEKLY (hàng tuần), MONTHLY (hàng tháng)
    next_review_date       DATE,                                      -- Ngày xem xét tiếp theo
    last_review_date       DATE,                                      -- Ngày xem xét cuối cùng

    -- Status and outcome - Trạng thái và kết quả
    status                 VARCHAR(20)      DEFAULT 'ACTIVE',         -- Trạng thái: ACTIVE (đang diễn ra), EXTENDED (gia hạn), COMPLETED (hoàn thành), FAILED (thất bại)
    outcome                VARCHAR(20),                               -- Kết quả: CONFIRMED (xác nhận), TERMINATED (chấm dứt), EXTENDED (gia hạn)
    outcome_date           DATE,                                      -- Ngày có kết quả
    outcome_reason         TEXT,                                      -- Lý do kết quả

    -- Support and coaching - Hỗ trợ và huấn luyện
    assigned_mentor_id     UUID REFERENCES users (id),              -- ID người hướng dẫn
    coaching_plan          JSONB,                                     -- Kế hoạch huấn luyện (JSON)
    support_provided       JSONB,                                     -- Hỗ trợ đã cung cấp (JSON)

    -- Documentation - Tài liệu
    manager_notes          TEXT,                                      -- Ghi chú của quản lý
    hr_notes               TEXT,                                      -- Ghi chú của nhân sự

    -- Processing - Xử lý
    created_by             UUID REFERENCES users (id),              -- Người tạo
    reviewed_by            UUID REFERENCES users (id),              -- Người xem xét

    created_at             TIMESTAMP        DEFAULT NOW(),            -- Thời gian tạo
    updated_at             TIMESTAMP        DEFAULT NOW()             -- Thời gian cập nhật gần nhất
);

-- Real-time analytics metrics storage - Lưu trữ chỉ số phân tích thời gian thực
CREATE TABLE analytics_metrics
(
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id       UUID REFERENCES workspaces (id),           -- ID workspace

    -- Metric definition - Định nghĩa chỉ số
    metric_name        VARCHAR(100)   NOT NULL,                    -- Tên chỉ số
    metric_category    VARCHAR(50),                               -- Danh mục: SALES, CUSTOMER, LICENSE, FINANCIAL, RESELLER, AFFILIATE
    metric_type        VARCHAR(20),                               -- Loại: COUNTER (bộ đếm), GAUGE (đồng hồ đo), HISTOGRAM (biểu đồ), RATE (tỷ lệ)

    -- Metric value and dimensions - Giá trị và chiều dữ liệu
    value              DECIMAL(15, 4) NOT NULL,                   -- Giá trị
    unit               VARCHAR(20),                               -- Đơn vị: COUNT, VND, PERCENTAGE, SECONDS
    dimensions         JSONB,                                     -- Các chiều phân tích (sản phẩm, khu vực, đội, v.v.) (JSON)

    -- Time information - Thông tin thời gian
    timestamp          TIMESTAMP      NOT NULL,                   -- Dấu thời gian
    period             VARCHAR(20),                               -- Kỳ: REAL_TIME, HOURLY, DAILY, WEEKLY, MONTHLY
    aggregation_level  VARCHAR(20),                               -- Mức độ tổng hợp: RAW (thô), HOURLY_AGG, DAILY_AGG, MONTHLY_AGG

    -- Data source - Nguồn dữ liệu
    source_entity_type VARCHAR(50),                               -- Loại thực thể nguồn: ORDER, CUSTOMER, LICENSE, COMMISSION
    source_entity_id   UUID,                                      -- ID thực thể nguồn

    -- Metadata - Thông tin bổ sung
    tags               JSONB,                                     -- Thẻ (JSON)
    context            JSONB,                                     -- Dữ liệu ngữ cảnh bổ sung (JSON)

    created_at         TIMESTAMP        DEFAULT NOW()             -- Thời gian tạo
);

-- Custom dashboard configurations - Cấu hình dashboard tùy chỉnh
CREATE TABLE dashboard_widgets
(
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id     UUID REFERENCES workspaces (id),           -- ID workspace
    user_id          UUID REFERENCES users (id),              -- ID người dùng

    -- Widget configuration - Cấu hình widget
    widget_type      VARCHAR(50)  NOT NULL,                     -- Loại widget: CHART (biểu đồ), TABLE (bảng), KPI_CARD, METRIC_CARD, HEATMAP
    title            VARCHAR(100) NOT NULL,                     -- Tiêu đề
    description      TEXT,                                      -- Mô tả

    -- Data configuration - Cấu hình dữ liệu
    data_source      VARCHAR(100),                              -- Nguồn dữ liệu (chỉ số/bảng nào để truy vấn)
    query_config     JSONB,                                     -- Cấu hình truy vấn (SQL hoặc bộ lọc chỉ số) (JSON)
    chart_config     JSONB,                                     -- Cấu hình biểu đồ (loại, màu sắc, trục) (JSON)

    -- Display settings - Cài đặt hiển thị
    refresh_interval INTEGER          DEFAULT 300,              -- Khoảng thời gian làm mới (giây)
    time_range       VARCHAR(20)      DEFAULT '24h',            -- Phạm vi thời gian: 1h, 24h, 7d, 30d, 90d
    auto_refresh     BOOLEAN          DEFAULT TRUE,             -- Tự động làm mới

    -- Layout and positioning - Bố cục và vị trí
    dashboard_name   VARCHAR(100)     DEFAULT 'Default',        -- Tên dashboard
    position_x       INTEGER          DEFAULT 0,                 -- Vị trí X
    position_y       INTEGER          DEFAULT 0,                 -- Vị trí Y
    width            INTEGER          DEFAULT 4,                 -- Chiều rộng
    height           INTEGER          DEFAULT 3,                 -- Chiều cao

    -- Permissions - Quyền
    is_public        BOOLEAN          DEFAULT FALSE,            -- Công khai hay không
    shared_with      JSONB,                                     -- Chia sẻ với (mảng ID người dùng hoặc vai trò) (JSON)

    -- Status - Trạng thái
    is_active        BOOLEAN          DEFAULT TRUE,            -- Có đang hoạt động hay không

    created_at       TIMESTAMP        DEFAULT NOW(),           -- Thời gian tạo
    updated_at       TIMESTAMP        DEFAULT NOW()            -- Thời gian cập nhật gần nhất
);

-- Custom report builder - Trình tạo báo cáo tùy chỉnh
CREATE TABLE custom_reports
(
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id   UUID REFERENCES workspaces (id),           -- ID workspace

    -- Report metadata - Siêu dữ liệu báo cáo
    name           VARCHAR(200) NOT NULL,                     -- Tên báo cáo
    description    TEXT,                                      -- Mô tả
    category       VARCHAR(50),                               -- Danh mục: SALES, FINANCIAL, CUSTOMER, OPERATIONAL
    report_type    VARCHAR(50),                               -- Loại báo cáo: TABULAR (bảng), SUMMARY (tóm tắt), ANALYTICAL (phân tích), DASHBOARD

    -- Report configuration - Cấu hình báo cáo
    data_sources   JSONB        NOT NULL,                     -- Nguồn dữ liệu (bảng và thực thể) (JSON)
    filters        JSONB,                                     -- Điều kiện lọc (JSON)
    grouping       JSONB,                                     -- Nhóm theo trường (JSON)
    sorting        JSONB,                                     -- Cấu hình sắp xếp (JSON)
    columns        JSONB,                                     -- Định nghĩa và định dạng cột (JSON)
    calculations   JSONB,                                     -- Trường tính toán và tổng hợp (JSON)

    -- Formatting and styling - Định dạng và kiểu
    layout_config  JSONB,                                     -- Cấu hình bố cục (trang, đầu trang, chân trang) (JSON)
    style_config   JSONB,                                     -- Cấu hình kiểu (màu sắc, phông chữ, thương hiệu) (JSON)
    export_formats JSONB            DEFAULT '["PDF","EXCEL","CSV"]', -- Định dạng xuất (JSON)

    -- Parameterization - Tham số hóa
    parameters     JSONB,                                     -- Tham số người dùng có thể cấu hình (JSON)
    default_values JSONB,                                     -- Giá trị tham số mặc định (JSON)

    -- Access control - Kiểm soát truy cập
    visibility     VARCHAR(20)      DEFAULT 'PRIVATE',        -- Chế độ xem: PRIVATE (riêng tư), TEAM (đội), DEPARTMENT (phòng), PUBLIC (công khai)
    allowed_roles  JSONB,                                     -- Vai trò được phép (JSON)
    allowed_users  JSONB,                                     -- Người dùng được phép (JSON)

    -- Status and metadata - Trạng thái và siêu dữ liệu
    is_template    BOOLEAN          DEFAULT FALSE,            -- Có phải là mẫu hay không
    is_favorite    BOOLEAN          DEFAULT FALSE,            -- Có phải là yêu thích hay không
    usage_count    INTEGER          DEFAULT 0,                 -- Số lần sử dụng
    last_run_at    TIMESTAMP,                                 -- Lần chạy cuối

    created_by     UUID REFERENCES users (id),              -- Người tạo
    created_at     TIMESTAMP        DEFAULT NOW(),           -- Thời gian tạo
    updated_at     TIMESTAMP        DEFAULT NOW()            -- Thời gian cập nhật gần nhất
);

-- Scheduled report execution - Lên lịch thực thi báo cáo
CREATE TABLE report_schedules
(
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    report_id           UUID REFERENCES custom_reports (id),     -- ID báo cáo
    workspace_id        UUID REFERENCES workspaces (id),           -- ID workspace

    -- Schedule configuration - Cấu hình lịch trình
    schedule_name       VARCHAR(100),                              -- Tên lịch trình
    schedule_type       VARCHAR(20) NOT NULL,                      -- Loại lịch: DAILY, WEEKLY, MONTHLY, QUARTERLY
    frequency_config    JSONB,                                     -- Cấu hình tần suất (giống cron) (JSON)
    timezone            VARCHAR(50)      DEFAULT 'Asia/Ho_Chi_Minh', -- Múi giờ

    -- Execution timing - Thời gian thực thi
    next_run_at         TIMESTAMP,                                 -- Lần chạy tiếp theo
    last_run_at         TIMESTAMP,                                 -- Lần chạy cuối
    last_success_at     TIMESTAMP,                                 -- Lần chạy thành công cuối

    -- Distribution - Phân phối
    recipients          JSONB       NOT NULL,                      -- Người nhận (địa chỉ email, ID người dùng, vai trò) (JSON)
    delivery_method     VARCHAR(20)      DEFAULT 'EMAIL',          -- Phương thức gửi: EMAIL, WEBHOOK, FILE_STORAGE
    email_subject       VARCHAR(255),                              -- Tiêu đề email
    email_body          TEXT,                                      -- Nội dung email

    -- Output configuration - Cấu hình đầu ra
    output_format       VARCHAR(20)      DEFAULT 'PDF',            -- Định dạng đầu ra: PDF, EXCEL, CSV
    include_raw_data    BOOLEAN          DEFAULT FALSE,            -- Bao gồm dữ liệu thô
    compress_output     BOOLEAN          DEFAULT FALSE,            -- Nén đầu ra

    -- Status and error handling - Trạng thái và xử lý lỗi
    is_active           BOOLEAN          DEFAULT TRUE,             -- Có hoạt động hay không
    status              VARCHAR(20)      DEFAULT 'SCHEDULED',      -- Trạng thái: SCHEDULED, RUNNING, COMPLETED, FAILED, PAUSED
    failure_count       INTEGER          DEFAULT 0,                -- Số lần thất bại
    max_failures        INTEGER          DEFAULT 3,                -- Số lần thất bại tối đa
    error_message       TEXT,                                      -- Thông báo lỗi

    -- Retention - Lưu trữ
    retain_outputs_days INTEGER          DEFAULT 30,               -- Số ngày lưu giữ đầu ra

    created_by          UUID REFERENCES users (id),              -- Người tạo
    created_at          TIMESTAMP        DEFAULT NOW(),            -- Thời gian tạo
    updated_at          TIMESTAMP        DEFAULT NOW()             -- Thời gian cập nhật gần nhất
);

-- Predictive analytics models - Mô hình phân tích dự đoán
CREATE TABLE predictive_models
(
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id        UUID REFERENCES workspaces (id),           -- ID workspace

    -- Model definition - Định nghĩa mô hình
    model_name          VARCHAR(100) NOT NULL,                     -- Tên mô hình
    model_type          VARCHAR(50),                               -- Loại mô hình: CHURN_PREDICTION (dự đoán rời bỏ), LTV_ESTIMATION (ước tính LTV), SALES_FORECAST (dự báo doanh số), DEMAND_PREDICTION (dự báo nhu cầu)
    algorithm           VARCHAR(50),                               -- Thuật toán: LINEAR_REGRESSION, RANDOM_FOREST, NEURAL_NETWORK, TIME_SERIES

    -- Training configuration - Cấu hình huấn luyện
    training_data_query TEXT,                                      -- Truy vấn SQL để lấy dữ liệu huấn luyện
    feature_columns     JSONB,                                     -- Các cột đặc trưng (đầu vào) (JSON)
    target_column       VARCHAR(100),                              -- Cột mục tiêu (dự đoán)
    training_parameters JSONB,                                     -- Tham số huấn luyện của thuật toán (JSON)

    -- Model performance - Hiệu suất mô hình
    accuracy_score      DECIMAL(5, 4),                             -- Điểm chính xác
    precision_score     DECIMAL(5, 4),                             -- Điểm độ chính xác
    recall_score        DECIMAL(5, 4),                             -- Điểm độ nhạy
    f1_score            DECIMAL(5, 4),                             -- Điểm F1
    validation_metrics  JSONB,                                     -- Các chỉ số xác thực khác (JSON)

    -- Model metadata - Siêu dữ liệu mô hình
    training_data_size  INTEGER,                                   -- Kích thước dữ liệu huấn luyện
    feature_importance  JSONB,                                     -- Tầm quan trọng của đặc trưng (JSON)
    model_version       VARCHAR(20),                               -- Phiên bản mô hình

    -- Lifecycle management - Quản lý vòng đời
    trained_at          TIMESTAMP,                                 -- Thời điểm huấn luyện
    last_prediction_at  TIMESTAMP,                                 -- Lần dự đoán cuối
    retrain_frequency   VARCHAR(20),                               -- Tần suất huấn luyện lại: WEEKLY, MONTHLY, QUARTERLY
    next_retrain_at     TIMESTAMP,                                 -- Lần huấn luyện lại tiếp theo

    -- Model status - Trạng thái mô hình
    status              VARCHAR(20)      DEFAULT 'DRAFT',          -- Trạng thái: DRAFT, TRAINING, ACTIVE, DEPRECATED, FAILED
    is_active           BOOLEAN          DEFAULT FALSE,            -- Có đang hoạt động hay không

    -- Model storage - Lưu trữ mô hình
    model_file_path     VARCHAR(500),                              -- Đường dẫn đến file mô hình đã tuần tự hóa
    model_size_bytes    BIGINT,                                    -- Kích thước file mô hình (bytes)

    created_by          UUID REFERENCES users (id),              -- Người tạo
    created_at          TIMESTAMP        DEFAULT NOW(),            -- Thời gian tạo
    updated_at          TIMESTAMP        DEFAULT NOW()             -- Thời gian cập nhật gần nhất
);

-- Business intelligence insights - Thông tin chi tiết kinh doanh thông minh (BI)
CREATE TABLE business_insights
(
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Khóa chính định danh duy nhất
    workspace_id          UUID REFERENCES workspaces (id),           -- ID workspace

    -- Insight metadata - Siêu dữ liệu insight
    insight_type          VARCHAR(50),                               -- Loại insight: TREND (xu hướng), ANOMALY (bất thường), OPPORTUNITY (cơ hội), RISK (rủi ro), RECOMMENDATION (khuyến nghị)
    category              VARCHAR(50),                               -- Danh mục: SALES, CUSTOMER, FINANCIAL, OPERATIONAL
    title                 VARCHAR(200) NOT NULL,                     -- Tiêu đề
    description           TEXT,                                      -- Mô tả

    -- Insight data - Dữ liệu insight
    insight_data          JSONB,                                     -- Dữ liệu và chỉ số hỗ trợ (JSON)
    confidence_score      DECIMAL(3, 2),                             -- Điểm tin cậy (0.00 đến 1.00)
    impact_level          VARCHAR(20),                               -- Mức độ ảnh hưởng: LOW, MEDIUM, HIGH, CRITICAL
    urgency_level         VARCHAR(20),                               -- Mức độ khẩn cấp: LOW, MEDIUM, HIGH, URGENT

    -- Recommendations - Khuyến nghị
    recommended_actions   JSONB,                                     -- Mảng các hành động được đề xuất (JSON)
    potential_impact      JSONB,                                     -- Kết quả tiềm năng (JSON)
    implementation_effort VARCHAR(20),                               -- Nỗ lực thực hiện: LOW, MEDIUM, HIGH

    -- Validity and lifecycle - Hiệu lực và vòng đời
    valid_from            TIMESTAMP        DEFAULT NOW(),            -- Có hiệu lực từ
    valid_until           TIMESTAMP,                                 -- Có hiệu lực đến
    is_actionable         BOOLEAN          DEFAULT TRUE,             -- Có thể hành động hay không

    -- Source and generation - Nguồn và tạo ra
    generation_method     VARCHAR(50),                               -- Phương pháp tạo: RULE_BASED, ML_MODEL, STATISTICAL_ANALYSIS
    source_query          TEXT,                                      -- Truy vấn được sử dụng để tạo insight
    created_at            TIMESTAMP        DEFAULT NOW()             -- Thời gian tạo
);

-- Add circular foreign key relationships after all tables are created

-- Add foreign keys that reference tables created later
ALTER TABLE departments
    ADD CONSTRAINT fk_departments_leader
        FOREIGN KEY (leader_id) REFERENCES users (id);

ALTER TABLE customers
    ADD CONSTRAINT fk_customers_affiliate
        FOREIGN KEY (affiliate_id) REFERENCES affiliates (id);

ALTER TABLE licenses
    ADD CONSTRAINT fk_licenses_order
        FOREIGN KEY (order_id) REFERENCES orders (id),
    ADD CONSTRAINT fk_licenses_customer
        FOREIGN KEY (customer_id) REFERENCES customers (id);

ALTER TABLE license_renewals
    ADD CONSTRAINT fk_license_renewals_original_order
        FOREIGN KEY (original_order_id) REFERENCES orders (id),
    ADD CONSTRAINT fk_license_renewals_renewal_order
        FOREIGN KEY (renewal_order_id) REFERENCES orders (id);

ALTER TABLE trial_licenses
    ADD CONSTRAINT fk_trial_licenses_customer
        FOREIGN KEY (customer_id) REFERENCES customers (id),
    ADD CONSTRAINT fk_trial_licenses_conversion_order
        FOREIGN KEY (conversion_order_id) REFERENCES orders (id);

ALTER TABLE orders
    ADD CONSTRAINT fk_orders_reseller
        FOREIGN KEY (reseller_id) REFERENCES resellers (id),
    ADD CONSTRAINT fk_orders_affiliate
        FOREIGN KEY (affiliate_id) REFERENCES affiliates (id);

-- Multi-tenant indexes (most important)
CREATE INDEX CONCURRENTLY idx_customers_workspace_id ON customers (workspace_id);
CREATE INDEX CONCURRENTLY idx_orders_workspace_id ON orders (workspace_id);
CREATE INDEX CONCURRENTLY idx_licenses_workspace_id ON licenses (workspace_id);
CREATE INDEX CONCURRENTLY idx_invoices_workspace_id ON invoices (workspace_id);
CREATE INDEX CONCURRENTLY idx_payments_workspace_id ON payments (workspace_id);

-- Business logic indexes
CREATE INDEX CONCURRENTLY idx_customers_sales_id ON customers (sales_id) WHERE sales_id IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_customers_tier_lifecycle ON customers (tier, lifecycle_stage);
CREATE INDEX CONCURRENTLY idx_customers_email ON customers (email);
CREATE INDEX CONCURRENTLY idx_customers_status_tier ON customers (status, tier) WHERE status = 'ACTIVE';

CREATE INDEX CONCURRENTLY idx_orders_customer_id ON orders (customer_id);
CREATE INDEX CONCURRENTLY idx_orders_status ON orders (status);
CREATE INDEX CONCURRENTLY idx_orders_sales_id ON orders (sales_id) WHERE sales_id IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_orders_created_date ON orders (created_at);

CREATE INDEX CONCURRENTLY idx_licenses_customer_id ON licenses (customer_id);
CREATE INDEX CONCURRENTLY idx_licenses_status ON licenses (status);
CREATE INDEX CONCURRENTLY idx_licenses_expires_at ON licenses (expires_at) WHERE status IN ('ACTIVE', 'TRIAL');
CREATE INDEX CONCURRENTLY idx_licenses_sales_support ON licenses (sales_id, support_id);

CREATE INDEX CONCURRENTLY idx_invoices_status ON invoices (status);
CREATE INDEX CONCURRENTLY idx_invoices_due_date ON invoices (due_date) WHERE status IN ('SENT', 'OVERDUE');
CREATE INDEX CONCURRENTLY idx_invoices_s_invoice_status ON invoices (s_invoice_status);

CREATE INDEX CONCURRENTLY idx_payments_status ON payments (status);
CREATE INDEX CONCURRENTLY idx_payments_paid_at ON payments (paid_at) WHERE paid_at IS NOT NULL;

-- Reseller system indexes
CREATE INDEX CONCURRENTLY idx_resellers_tier ON resellers (tier);
CREATE INDEX CONCURRENTLY idx_resellers_status ON resellers (status);
CREATE INDEX CONCURRENTLY idx_reseller_customers_reseller_id ON reseller_customers (reseller_id);

-- Affiliate system indexes
CREATE INDEX CONCURRENTLY idx_affiliates_type ON affiliates (type);
CREATE INDEX CONCURRENTLY idx_affiliates_status ON affiliates (status);
CREATE INDEX CONCURRENTLY idx_affiliate_clicks_affiliate_id ON affiliate_clicks (affiliate_link_id);
CREATE INDEX CONCURRENTLY idx_affiliate_commissions_status ON affiliate_commissions (status);

-- Analytics indexes
CREATE INDEX CONCURRENTLY idx_analytics_metrics_name_timestamp ON analytics_metrics (metric_name, timestamp);
CREATE INDEX CONCURRENTLY idx_analytics_metrics_category_timestamp ON analytics_metrics (metric_category, timestamp);

-- Audit indexes
CREATE INDEX CONCURRENTLY idx_audit_logs_user_timestamp ON audit_logs (user_id, timestamp);
CREATE INDEX CONCURRENTLY idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX CONCURRENTLY idx_audit_logs_action_timestamp ON audit_logs (action, timestamp);

-- Email and notification indexes
CREATE INDEX CONCURRENTLY idx_email_queue_status ON email_queue (status, scheduled_at);
CREATE INDEX CONCURRENTLY idx_notifications_user_status ON notifications (user_id, status);