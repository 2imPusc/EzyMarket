# Swagger API Documentation Guide

## Truy cập Swagger UI

Sau khi khởi động server, bạn có thể truy cập Swagger UI tại:

```
http://localhost:5000/api-docs
```

## Cách sử dụng

### 1. Xác thực (Authentication)

Hầu hết các API endpoints yêu cầu JWT token để xác thực. Để sử dụng:

1. **Đăng ký tài khoản mới** hoặc **Đăng nhập**:
   - Sử dụng endpoint `POST /api/auth/register` để tạo tài khoản mới
   - Hoặc sử dụng `POST /api/auth/login` để đăng nhập

2. **Copy JWT token** từ response (trường `token`)

3. **Authorize trong Swagger**:
   - Click vào nút **"Authorize"** ở góc trên bên phải
   - Nhập token vào ô input (không cần thêm "Bearer " prefix)
   - Click **"Authorize"**
   - Click **"Close"**

4. Bây giờ bạn có thể sử dụng tất cả các protected endpoints

### 2. Các nhóm API

#### Authentication APIs (`/api/auth`)
- **POST /register** - Đăng ký tài khoản mới
- **POST /login** - Đăng nhập
- **POST /refreshToken** - Làm mới access token
- **POST /logout** - Đăng xuất
- **POST /delete** - Xóa tài khoản
- **PUT /edit** - Cập nhật thông tin người dùng
- **PUT /change-password** - Đổi mật khẩu
- **POST /send-verification-email** - Gửi email xác thực
- **GET /verify-email** - Xác thực email
- **POST /forgot-password** - Yêu cầu reset mật khẩu
- **POST /reset-password** - Reset mật khẩu với token
- **GET /verify-reset-token** - Kiểm tra token reset có hợp lệ

#### Group APIs (`/api/groups`)
- **POST /create** - Tạo nhóm mới
- **GET /my-groups** - Lấy danh sách nhóm của user
- **GET /{groupId}** - Lấy thông tin chi tiết nhóm
- **POST /add-member** - Thêm thành viên vào nhóm (chỉ owner)
- **DELETE /remove-member** - Xóa thành viên khỏi nhóm (chỉ owner)
- **DELETE /{groupId}** - Xóa nhóm (chỉ owner hoặc admin)

### 3. Testing Flow

#### Luồng đăng ký và xác thực email:
```
1. POST /api/auth/register
2. POST /api/auth/login (lấy token)
3. Authorize với token
4. POST /api/auth/send-verification-email
5. Check email và click vào link verification
6. GET /api/auth/verify-email?token=<token_from_email>
```

#### Luồng quên mật khẩu:
```
1. POST /api/auth/forgot-password (nhập email)
2. Check email và lấy reset token
3. GET /api/auth/verify-reset-token?token=<token> (optional - kiểm tra token)
4. POST /api/auth/reset-password?token=<token> (nhập mật khẩu mới)
5. POST /api/auth/login (đăng nhập với mật khẩu mới)
```

#### Luồng quản lý nhóm:
```
1. POST /api/auth/login (đăng nhập và lấy token)
2. Authorize với token
3. POST /api/groups/create (tạo nhóm)
4. GET /api/groups/my-groups (xem danh sách nhóm)
5. POST /api/groups/add-member (thêm thành viên)
6. GET /api/groups/{groupId} (xem chi tiết nhóm)
7. DELETE /api/groups/remove-member (xóa thành viên)
8. DELETE /api/groups/{groupId} (xóa nhóm)
```

## Lưu ý

- Tất cả các endpoints (trừ register, login, verify-email, forgot-password, reset-password, verify-reset-token) đều yêu cầu JWT token
- Token có thời gian hết hạn, sử dụng `/refreshToken` để lấy token mới
- Một số endpoints yêu cầu quyền đặc biệt (owner, admin)
- Validate input cẩn thận trước khi gửi request

## Environment Variables

Đảm bảo file `.env` có các biến sau:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET_KEY=your_jwt_secret
JWT_REFRESH_KEY=your_jwt_refresh_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
```

## Khởi động server

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm run start:prod
```

Sau đó truy cập: http://localhost:5000/api-docs
