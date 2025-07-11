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
│   │   └── app-permission.enum.ts
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
├── data-source.ts
└── mkt-core.module.ts
```

---

## 🚀 Cách sử dụng

### 1. Tạo mới license

* Gọi hàm trong `license.service.ts`
* Truy cập qua API GraphQL khai báo trong `license.resolver.ts`

### 2. Thêm cột mới

* Sửa trong `license.entity.ts`
* Tạo migration (xem bên dưới)

### 3. Seed dữ liệu

* File mẫu: `libs/license/seed/license.seed.ts`

---

## 🛠️ Hướng dẫn tạo Migration

Giả sử đã khai báo entity trong `libs/license/entities/license.entity.ts`:

```bash
yarn typeorm migration:generate -d src/mkt-core/data-source.ts src/mkt-core/migration/CreateLicenseTable
```

> 📌 Lưu ý: cần đảm bảo entity được export và có trong `entities` array của DataSource.

---

## 🌱 Hướng dẫn Seed dữ liệu

1. Tạo file `license.seed.ts`
2. Ví dụ chạy seeder:

```bash
yarn dlx ts-node -r tsconfig-paths/register src/mkt-core/libs/license/seed/license.seed.ts
```

3. Bên trong `license.seed.ts`:

```ts
import { DataSource } from 'typeorm';
import { License } from '../entities/license.entity';

export const seedLicenses = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(License);
  await repo.save(repo.create({
    licenseCode: 'LIC-2025-001234',
    // ... các trường còn lại
  }));
};
```

---

## 🔐 Phân quyền & Middleware

* File `app-permission.enum.ts` định nghĩa toàn bộ quyền hệ thống.
* Dùng cùng `permission.guard.ts` để giới hạn route truy cập.

---

## 📬 Gợi ý mở rộng

* Tách rõ ràng tầng controller/resolver ↔ service ↔ entity
* Tạo `e2e` hoặc `integration-test` cho từng module
* Bổ sung validation cho DTO bằng `class-validator`

---

© Codebase nội bộ - `mkt-crm`