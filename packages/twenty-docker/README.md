# Twenty Docker

Package này chứa tất cả các cấu hình cần thiết để chạy toàn bộ ứng dụng Twenty CRM bằng Docker và Docker Compose. Việc này giúp đơn giản hóa quá trình thiết lập môi trường phát triển cục bộ và triển khai ứng dụng một cách nhất quán.

## Yêu cầu

-   [Docker](https://docs.docker.com/get-docker/)
-   [Docker Compose](https://docs.docker.com/compose/install/) (thường được cài đặt sẵn cùng với Docker)

## Cấu trúc thư mục

Dưới đây là mô tả về các tệp và thư mục quan trọng trong `twenty-docker`:

```
.
├── .env.example         # Tệp mẫu chứa các biến môi trường cần thiết.
├── docker-compose.yml   # Tệp chính định nghĩa các service của ứng dụng.
├── Makefile             # Chứa các lệnh tắt để build và chạy image (chủ yếu cho production build).
├── grafana/             # Cấu hình cho Grafana (monitoring).
├── k8s/                 # Cấu hình để triển khai trên Kubernetes.
├── otel-collector/      # Cấu hình cho OpenTelemetry Collector (monitoring).
├── podman/              # Cấu hình để chạy với Podman (một giải pháp thay thế Docker).
├── scripts/             # Các script hỗ trợ.
├── twenty/              # Dockerfile và các tài nguyên để build image cho ứng dụng Twenty.
├── twenty-postgres-spilo/ # Cấu hình cho PostgreSQL sử dụng Spilo (Postgres Operator của Zalando).
└── twenty-website/      # Cấu hình Docker cho trang web của Twenty.
```

## Hướng dẫn sử dụng

Thực hiện các bước sau để khởi chạy toàn bộ ứng dụng trên máy của bạn.

### 1. Điều hướng đến thư mục

Mở terminal và di chuyển vào thư mục `packages/twenty-docker`:

```bash
cd packages/twenty-docker
```

### 2. Cấu hình môi trường

Sao chép tệp `.env.example` thành một tệp mới có tên là `.env`. Tệp này sẽ chứa các cấu hình riêng cho môi trường của bạn.

```bash
cp .env.example .env
```

Mở tệp `.env` và chỉnh sửa các biến nếu cần. Quan trọng nhất là `APP_SECRET`, bạn nên tạo một chuỗi ngẫu nhiên và an toàn cho biến này.

```dotenv
# .env
TAG=latest

# Cấu hình PostgreSQL (có thể giữ nguyên giá trị mặc định)
#PG_DATABASE_USER=postgres
#PG_DATABASE_PASSWORD=replace_me_with_a_strong_password_without_special_characters
#PG_DATABASE_HOST=db
#PG_DATABASE_PORT=5432

# URL của Redis (giữ nguyên giá trị mặc định)
#REDIS_URL=redis://redis:6379

# URL của server, mặc định là localhost:3000
SERVER_URL=http://localhost:3000

# !!! QUAN TRỌNG: Thay thế bằng một chuỗi ngẫu nhiên, an toàn
# Bạn có thể dùng lệnh: openssl rand -base64 32
APP_SECRET=replace_me_with_a_random_string

# Loại lưu trữ (local hoặc s3)
STORAGE_TYPE=local

# Cấu hình cho S3 (nếu STORAGE_TYPE=s3)
# STORAGE_S3_REGION=eu-west3
# STORAGE_S3_NAME=my-bucket
# STORAGE_S3_ENDPOINT=
```

### 3. Khởi chạy ứng dụng

Sử dụng Docker Compose để build (nếu cần) và khởi chạy tất cả các service đã được định nghĩa trong `docker-compose.yml`.

```bash
docker-compose up -d
```

Lệnh này sẽ khởi chạy các service sau ở chế độ nền (`-d`):

-   `server`: Backend của Twenty CRM.
-   `worker`: Xử lý các tác vụ nền.
-   `db`: Cơ sở dữ liệu PostgreSQL.
-   `redis`: Dùng cho caching và hàng đợi (queue).

### 4. Truy cập ứng dụng

Sau khi tất cả các container đã khởi động thành công, bạn có thể truy cập ứng dụng Twenty tại địa chỉ: [http://localhost:3000](http://localhost:3000).

## Các lệnh thường dùng

Dưới đây là một số lệnh `docker-compose` hữu ích để quản lý môi trường của bạn.

-   **Khởi chạy tất cả các service:**
    ```bash
    docker-compose up -d
    ```

-   **Dừng và xóa tất cả các container:**
    ```bash
    docker-compose down
    ```

-   **Xem logs của tất cả các service:**
    ```bash
    docker-compose logs -f
    ```

-   **Xem logs của một service cụ thể (ví dụ: `server`):**
    ```bash
    docker-compose logs -f server
    ```

-   **Khởi động lại các service:**
    ```bash
    docker-compose restart
    ```

-   **Truy cập vào shell của một container (ví dụ: `server`):**
    ```bash
    docker-compose exec server bash
    ```
