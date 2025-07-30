# 📦 mkt-core Module

Đây là thư mục chính trong hệ thống, chứa các chức năng lõi phục vụ cho hoạt động của toàn bộ ứng dụng.

---

## 🧭 Mục lục

* [Cấu trúc thư mục](#cấu-trúc-thư-mục)
* [Cách sử dụng](#cách-sử-dụng)
* [Hướng dẫn tạo Migration](#hướng-dẫn-tạo-migration)
* [Hướng dẫn Seed dữ liệu](#hướng-dẫn-seed-dữ-liệu)

---

## 🗂️ Cấu trúc thư mục

```
mkt-core/
├── common/
│   ├── constants/
│   │   └── custom-field-ids.ts
│   │   └── custom-object-ids.ts
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── middlewares/
│   └── utils/
│
├── infrastructure/
│   └── (các thành phần hạ tầng như DB, Redis...)
│
├── libs/
│   ├── auth/
│   ├── license/
│   │   ├── dto/
│   │   ├── entities/
│   │   ├── seed/
│   │   ├── license.module.ts
│   │   ├── license.service.ts
│   │   └── license.resolver.ts
│   └── otp/
│       ├── dto/
│       ├── otp.module.ts
│       ├── otp.service.ts
│       └── otp-auth-app.service.ts
│
├── migration/
├── seeder-data/
└── mkt-core.module.ts
```

---

## 🛠️ Hướng dẫn tạo Migration

Khai báo field_id và object_id tại custom-field-ids và custom-object-ids 

Khai báo WorkspaceEntity, WorkspaceField trong folder entities của module trong libs (VD: `libs/license/entities/license.workspace-entity.ts`)

Import workspace entity vào trong mkt-entities 

Lưu ý: Join column thì sẽ dùng WorkspaceJoinColumn

### Đồng bộ metadata workspace
```bash
yarn command:prod workspace:sync-metadata
```

---

## 🌱 Hướng dẫn Seed dữ liệu

1. Tạo file seed data
2. Ví dụ chạy seeder:

## cho workspace cụ thể
```bash
yarn command:prod workspace:seed:customer-module -w 3b8e6458-5fc1-4e63-8563-008ccddaa6db
yarn command:prod workspace:seed:product-module -w 3b8e6458-5fc1-4e63-8563-008ccddaa6db
yarn command:prod workspace:seed:attribute-module -w 3b8e6458-5fc1-4e63-8563-008ccddaa6db
yarn command:prod workspace:seed:variant-module -w 3b8e6458-5fc1-4e63-8563-008ccddaa6db
yarn command:prod workspace:seed:attribute-value-module -w 3b8e6458-5fc1-4e63-8563-008ccddaa6db
yarn command:prod workspace:seed:variant-attribute-value-module -w 3b8e6458-5fc1-4e63-8563-008ccddaa6db
```

---

© Codebase nội bộ - `mkt-crm`