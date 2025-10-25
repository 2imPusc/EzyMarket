# Test Forgot Password Flow

## Setup

Đảm bảo đã cấu hình đúng các biến môi trường trong file `.env`:

```env
PASSWORD_RESET_KEY=your-secret-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## Test Cases

### Test 1: Request Reset Password với email hợp lệ

```bash
POST http://localhost:5000/api/auth/forgot-password
Content-Type: application/json

{
  "email": "existing-user@example.com"
}

Expected Response (200):
{
  "message": "Password reset link has been sent to your email. Please check your inbox."
}
```

### Test 2: Request Reset Password với email không tồn tại

```bash
POST http://localhost:5000/api/auth/forgot-password
Content-Type: application/json

{
  "email": "nonexistent@example.com"
}

Expected Response (200):
{
  "message": "If the email exists, a password reset link has been sent to your email"
}
```

### Test 3: Request Reset Password không có email

```bash
POST http://localhost:5000/api/auth/forgot-password
Content-Type: application/json

{}

Expected Response (400):
{
  "message": "Email is required"
}
```

### Test 4: Verify Reset Token (token hợp lệ)

```bash
GET http://localhost:5000/api/auth/verify-reset-token?token=<VALID_TOKEN>

Expected Response (200):
{
  "message": "Token is valid",
  "email": "user@example.com"
}
```

### Test 5: Verify Reset Token (token không hợp lệ)

```bash
GET http://localhost:5000/api/auth/verify-reset-token?token=invalid-token

Expected Response (400):
{
  "message": "Invalid or expired token",
  "error": "jwt malformed"
}
```

### Test 6: Verify Reset Token (token hết hạn)

```bash
GET http://localhost:5000/api/auth/verify-reset-token?token=<EXPIRED_TOKEN>

Expected Response (400):
{
  "message": "Invalid or expired token",
  "error": "jwt expired"
}
```

### Test 7: Reset Password thành công

```bash
POST http://localhost:5000/api/auth/reset-password?token=<VALID_TOKEN>
Content-Type: application/json

{
  "newPassword": "newSecurePassword123"
}

Expected Response (200):
{
  "message": "Password has been reset successfully. Please login with your new password."
}
```

### Test 8: Reset Password với password ngắn

```bash
POST http://localhost:5000/api/auth/reset-password?token=<VALID_TOKEN>
Content-Type: application/json

{
  "newPassword": "12345"
}

Expected Response (400):
{
  "message": "Password must be at least 6 characters long"
}
```

### Test 9: Reset Password không có token

```bash
POST http://localhost:5000/api/auth/reset-password
Content-Type: application/json

{
  "newPassword": "newPassword123"
}

Expected Response (400):
{
  "message": "Reset token is required"
}
```

### Test 10: Reset Password không có newPassword

```bash
POST http://localhost:5000/api/auth/reset-password?token=<VALID_TOKEN>
Content-Type: application/json

{}

Expected Response (400):
{
  "message": "New password is required"
}
```

### Test 11: Login với password mới sau reset

```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "newSecurePassword123"
}

Expected Response (200):
{
  "user": {
    "id": "...",
    "userName": "...",
    "role": "user",
    "email": "user@example.com"
  },
  "token": "...",
  "refreshToken": "..."
}
```

## Postman Collection

Import collection này vào Postman để test:

```json
{
  "info": {
    "name": "EzyMarket - Forgot Password",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Request Reset Password",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"user@example.com\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/api/auth/forgot-password",
          "host": ["{{baseUrl}}"],
          "path": ["api", "auth", "forgot-password"]
        }
      }
    },
    {
      "name": "2. Verify Reset Token",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/api/auth/verify-reset-token?token={{resetToken}}",
          "host": ["{{baseUrl}}"],
          "path": ["api", "auth", "verify-reset-token"],
          "query": [
            {
              "key": "token",
              "value": "{{resetToken}}"
            }
          ]
        }
      }
    },
    {
      "name": "3. Reset Password",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"newPassword\": \"newPassword123\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/api/auth/reset-password?token={{resetToken}}",
          "host": ["{{baseUrl}}"],
          "path": ["api", "auth", "reset-password"],
          "query": [
            {
              "key": "token",
              "value": "{{resetToken}}"
            }
          ]
        }
      }
    },
    {
      "name": "4. Login with New Password",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"user@example.com\",\n  \"password\": \"newPassword123\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/api/auth/login",
          "host": ["{{baseUrl}}"],
          "path": ["api", "auth", "login"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:5000"
    },
    {
      "key": "resetToken",
      "value": ""
    }
  ]
}
```

## Manual Testing Steps

1. **Start Server**

   ```bash
   npm start
   ```

2. **Register a test user** (if not exists)

   ```bash
   POST /api/auth/register
   Body: { "userName": "Test User", "email": "test@example.com", "phone": "1234567890", "password": "password123" }
   ```

3. **Request reset password**

   ```bash
   POST /api/auth/forgot-password
   Body: { "email": "test@example.com" }
   ```

4. **Check your email** and copy the token from the URL

5. **Verify token** (optional)

   ```bash
   GET /api/auth/verify-reset-token?token=<TOKEN>
   ```

6. **Reset password**

   ```bash
   POST /api/auth/reset-password?token=<TOKEN>
   Body: { "newPassword": "newPassword123" }
   ```

7. **Login with new password**
   ```bash
   POST /api/auth/login
   Body: { "email": "test@example.com", "password": "newPassword123" }
   ```

## Expected Email Format

Subject: **Reset Your Password - EzyMarket**

Body:

```html
Reset Your Password Hello [Username], We received a request to reset your password. Click the button
below to create a new password: [Reset Password Button] Or copy and paste this link into your
browser: http://localhost:5000/api/auth/reset-password?token=eyJhbGc... Note: This link will expire
in 1 hour. If you didn't request a password reset, please ignore this email.
```

## Security Checklist

- ✅ Token expires in 1 hour
- ✅ Token is cryptographically signed with JWT
- ✅ Password is hashed before saving
- ✅ Refresh token is cleared after reset (forces re-login)
- ✅ No user existence disclosure
- ✅ Minimum password length validation (6 chars)
- ✅ Separate secret key for reset tokens

## Common Issues & Solutions

### Issue 1: Email not sent

**Solution:**

- Check EMAIL_USER and EMAIL_PASS in .env
- For Gmail: Enable 2FA and use App Password
- Check console for error logs

### Issue 2: Token expired error

**Solution:**

- Token is valid for 1 hour only
- Request a new reset password link

### Issue 3: Invalid token error

**Solution:**

- Ensure token is copied correctly from email
- Check PASSWORD_RESET_KEY matches in .env
- Token may have been used already

### Issue 4: Password not updated

**Solution:**

- Verify password meets minimum requirements (6+ chars)
- Check User model pre-save hook is working
- Look for errors in server logs
