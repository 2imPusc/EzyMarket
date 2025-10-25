# API Quên Mật Khẩu (Forgot Password)

## Tổng quan

Chức năng quên mật khẩu cho phép người dùng reset mật khẩu thông qua email xác thực.

## Workflow

```
1. User yêu cầu reset password (forgot-password)
   ↓
2. System gửi email chứa reset token (expires in 1 hour)
   ↓
3. User click link trong email hoặc nhập token
   ↓
4. [Optional] Verify token validity (verify-reset-token)
   ↓
5. User submit new password (reset-password)
   ↓
6. System cập nhật password và xóa refresh token
   ↓
7. User đăng nhập lại với password mới
```

## API Endpoints

### 1. Request Reset Password

Gửi email reset password đến user.

**Endpoint:** `POST /api/auth/forgot-password`

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response Success (200):**

```json
{
  "message": "Password reset link has been sent to your email. Please check your inbox."
}
```

**Response Error:**

- `400`: Email is required
- `500`: Internal server error

**Note:** Vì lý do bảo mật, API sẽ luôn trả về success message ngay cả khi email không tồn tại trong hệ thống.

---

### 2. Verify Reset Token (Optional)

Kiểm tra xem token có hợp lệ không. Endpoint này hữu ích cho frontend để validate trước khi hiển thị form reset password.

**Endpoint:** `GET /api/auth/verify-reset-token?token=<TOKEN>`

**Query Parameters:**

- `token`: Reset token nhận được từ email

**Response Success (200):**

```json
{
  "message": "Token is valid",
  "email": "user@example.com"
}
```

**Response Error:**

- `400`: Token is required / Invalid or expired token
- `404`: User not found
- `500`: Internal server error

---

### 3. Reset Password

Cập nhật password mới sau khi verify token.

**Endpoint:** `POST /api/auth/reset-password?token=<TOKEN>`

**Query Parameters:**

- `token`: Reset token nhận được từ email

**Request Body:**

```json
{
  "newPassword": "newSecurePassword123"
}
```

**Response Success (200):**

```json
{
  "message": "Password has been reset successfully. Please login with your new password."
}
```

**Response Error:**

- `400`: Reset token is required / New password is required / Password must be at least 6 characters long / Invalid or expired reset token
- `404`: User not found
- `500`: Internal server error

---

## Cấu hình Environment Variables

Thêm các biến sau vào file `.env`:

```env
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# JWT Keys
EMAIL_VERIFY_KEY=your-email-verify-secret-key
PASSWORD_RESET_KEY=your-password-reset-secret-key
JWT_ACCESS_KEY=your-access-token-secret
JWT_REFRESH_KEY=your-refresh-token-secret
```

**Lưu ý:**

- `PASSWORD_RESET_KEY`: Key riêng để sign reset password token (khác với các key khác)
- Token reset password có thời gian sống là 1 giờ
- Nên sử dụng App Password của Gmail thay vì password thường

---

## Test Flow với cURL/Postman

### Bước 1: Request reset password

```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

### Bước 2: Check email và lấy token từ link

Link trong email sẽ có dạng:

```
http://localhost:5000/api/auth/reset-password?token=eyJhbGc...
```

### Bước 3 (Optional): Verify token

```bash
curl -X GET "http://localhost:5000/api/auth/verify-reset-token?token=eyJhbGc..."
```

### Bước 4: Reset password

```bash
curl -X POST "http://localhost:5000/api/auth/reset-password?token=eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{"newPassword": "newPassword123"}'
```

### Bước 5: Login với password mới

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "newPassword123"
  }'
```

---

## Security Features

1. **Token Expiration**: Reset token tự động hết hạn sau 1 giờ
2. **One-time Use**: Sau khi reset, refresh token bị xóa, bắt buộc login lại
3. **Email Privacy**: Không tiết lộ thông tin user có tồn tại hay không
4. **Secure Token**: Sử dụng JWT với secret key riêng
5. **Password Validation**: Minimum 6 characters
6. **Auto Hash**: Password được hash trước khi lưu vào database

---

## Frontend Integration Example

### React Example

```javascript
// 1. Request reset password
const forgotPassword = async (email) => {
  const response = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return await response.json();
};

// 2. Verify token (when user clicks email link)
const verifyToken = async (token) => {
  const response = await fetch(`/api/auth/verify-reset-token?token=${token}`);
  return await response.json();
};

// 3. Reset password
const resetPassword = async (token, newPassword) => {
  const response = await fetch(`/api/auth/reset-password?token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newPassword }),
  });
  return await response.json();
};
```

---

## Troubleshooting

### Email không được gửi

- Kiểm tra `EMAIL_USER` và `EMAIL_PASS` trong `.env`
- Với Gmail, cần bật 2FA và tạo App Password
- Kiểm tra logs để xem error message

### Token không hợp lệ

- Kiểm tra `PASSWORD_RESET_KEY` trong `.env`
- Token có thể đã hết hạn (> 1 giờ)
- Đảm bảo token được truyền đúng từ email

### Password không được cập nhật

- Kiểm tra password có đủ 6 ký tự không
- Kiểm tra pre-save hook trong User model có hoạt động không
- Xem logs để debug

---

## Files Modified/Created

### Created Files:

- `src/services/forgotPassword.js` - Service xử lý logic forgot password

### Modified Files:

- `src/controllers/authController.js` - Thêm 3 methods: forgotPassword, resetPassword, verifyResetToken
- `src/routes/authRoute.js` - Thêm 3 routes mới
- `src/services/verifyEmail.js` - Fix lỗi gọi sendEmail

---

## Best Practices

1. **Rate Limiting**: Nên thêm rate limiting cho endpoint forgot-password để tránh spam
2. **Logging**: Log tất cả các request reset password để audit
3. **User Notification**: Gửi email thông báo khi password được thay đổi
4. **Token Storage**: Có thể lưu reset token vào DB để có thể revoke
5. **Multiple Attempts**: Giới hạn số lần reset password trong một khoảng thời gian
