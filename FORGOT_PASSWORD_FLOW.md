# 🔄 Forgot Password Flow Diagram

## Architecture Overview

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Client    │         │   Backend    │         │   Email     │
│  (Browser)  │         │   (Node.js)  │         │   Service   │
└──────┬──────┘         └───────┬──────┘         └──────┬──────┘
       │                        │                       │
       │  POST /forgot-password │                       │
       │  { email }             │                       │
       ├───────────────────────>│                       │
       │                        │                       │
       │                        │  Find User by Email   │
       │                        │                       │
       │                        │  Generate JWT Token   │
       │                        │  (expires in 1 hour)  │
       │                        │                       │
       │                        │  Send Email           │
       │                        ├──────────────────────>│
       │                        │                       │
       │  { message: "Email     │                       │
       │    sent successfully" }│                       │
       │<───────────────────────┤                       │
       │                        │                       │
       │                        │                       │  📧 Email
       │<─────────────────────────────────────────────────┤  with link
       │                        │                       │
       │  User clicks link      │                       │
       │  in email              │                       │
       │                        │                       │
       │  GET /verify-reset-token                       │
       │  ?token=xxx            │                       │
       ├───────────────────────>│                       │
       │                        │                       │
       │                        │  Verify JWT Token     │
       │                        │                       │
       │  { valid: true,        │                       │
       │    email: "..." }      │                       │
       │<───────────────────────┤                       │
       │                        │                       │
       │  User enters new       │                       │
       │  password              │                       │
       │                        │                       │
       │  POST /reset-password  │                       │
       │  ?token=xxx            │                       │
       │  { newPassword }       │                       │
       ├───────────────────────>│                       │
       │                        │                       │
       │                        │  Verify Token         │
       │                        │  Find User            │
       │                        │  Hash Password        │
       │                        │  Update DB            │
       │                        │  Clear refreshToken   │
       │                        │                       │
       │  { message: "Password  │                       │
       │    reset successfully" }│                      │
       │<───────────────────────┤                       │
       │                        │                       │
       │  POST /login           │                       │
       │  { email, newPassword }│                       │
       ├───────────────────────>│                       │
       │                        │                       │
       │  { token, refreshToken }                       │
       │<───────────────────────┤                       │
       │                        │                       │
```

## Detailed Step-by-Step Flow

### Phase 1: Request Reset Password

```
User                    Controller                  Service                     Database
 │                          │                          │                            │
 │  1. POST /forgot-pwd     │                          │                            │
 │  { email }               │                          │                            │
 ├─────────────────────────>│                          │                            │
 │                          │                          │                            │
 │                          │  2. Extract email        │                            │
 │                          │                          │                            │
 │                          │  3. Find user by email   │                            │
 │                          ├─────────────────────────────────────────────────────>│
 │                          │                          │                            │
 │                          │  4. User data            │                            │
 │                          │<─────────────────────────────────────────────────────┤
 │                          │                          │                            │
 │                          │  5. sendResetPasswordEmail()                          │
 │                          ├─────────────────────────>│                            │
 │                          │                          │                            │
 │                          │                          │  6. Generate JWT token     │
 │                          │                          │     (1 hour expiry)        │
 │                          │                          │                            │
 │                          │                          │  7. Create reset URL       │
 │                          │                          │                            │
 │                          │                          │  8. Send email             │
 │                          │                          │     (via nodemailer)       │
 │                          │                          │                            │
 │                          │  9. Email sent           │                            │
 │                          │<─────────────────────────┤                            │
 │                          │                          │                            │
 │  10. Success response    │                          │                            │
 │<─────────────────────────┤                          │                            │
 │                          │                          │                            │
```

### Phase 2: Verify Token (Optional)

```
User                    Controller                  Service                     Database
 │                          │                          │                            │
 │  1. GET /verify-token    │                          │                            │
 │     ?token=xxx           │                          │                            │
 ├─────────────────────────>│                          │                            │
 │                          │                          │                            │
 │                          │  2. Extract token        │                            │
 │                          │                          │                            │
 │                          │  3. verifyResetToken()   │                            │
 │                          ├─────────────────────────>│                            │
 │                          │                          │                            │
 │                          │                          │  4. jwt.verify()           │
 │                          │                          │     - Check signature      │
 │                          │                          │     - Check expiry         │
 │                          │                          │                            │
 │                          │  5. { valid, decoded }   │                            │
 │                          │<─────────────────────────┤                            │
 │                          │                          │                            │
 │                          │  6. Find user by ID      │                            │
 │                          ├─────────────────────────────────────────────────────>│
 │                          │                          │                            │
 │                          │  7. User data            │                            │
 │                          │<─────────────────────────────────────────────────────┤
 │                          │                          │                            │
 │  8. Token valid response │                          │                            │
 │<─────────────────────────┤                          │                            │
 │                          │                          │                            │
```

### Phase 3: Reset Password

```
User                    Controller                  Service                     Database
 │                          │                          │                            │
 │  1. POST /reset-pwd      │                          │                            │
 │     ?token=xxx           │                          │                            │
 │     { newPassword }      │                          │                            │
 ├─────────────────────────>│                          │                            │
 │                          │                          │                            │
 │                          │  2. Extract token & pwd  │                            │
 │                          │                          │                            │
 │                          │  3. Validate password    │                            │
 │                          │     (min 6 chars)        │                            │
 │                          │                          │                            │
 │                          │  4. verifyResetToken()   │                            │
 │                          ├─────────────────────────>│                            │
 │                          │                          │                            │
 │                          │                          │  5. jwt.verify()           │
 │                          │                          │                            │
 │                          │  6. { valid, decoded }   │                            │
 │                          │<─────────────────────────┤                            │
 │                          │                          │                            │
 │                          │  7. Find user by ID      │                            │
 │                          ├─────────────────────────────────────────────────────>│
 │                          │                          │                            │
 │                          │  8. User data            │                            │
 │                          │<─────────────────────────────────────────────────────┤
 │                          │                          │                            │
 │                          │  9. Update password      │                            │
 │                          │     user.password = new  │                            │
 │                          │                          │                            │
 │                          │  10. Clear refreshToken  │                            │
 │                          │      user.refreshToken=null                           │
 │                          │                          │                            │
 │                          │  11. Save user           │                            │
 │                          ├─────────────────────────────────────────────────────>│
 │                          │                          │                            │
 │                          │                          │  12. Pre-save hook         │
 │                          │                          │      - Hash password       │
 │                          │                          │      - bcrypt.hash()       │
 │                          │                          │                            │
 │                          │  13. Saved successfully  │                            │
 │                          │<─────────────────────────────────────────────────────┤
 │                          │                          │                            │
 │  14. Success response    │                          │                            │
 │<─────────────────────────┤                          │                            │
 │                          │                          │                            │
```

## Component Interaction

```
┌──────────────────────────────────────────────────────────────┐
│                         ROUTES                                │
│                    (authRoute.js)                             │
│                                                                │
│  POST   /api/auth/forgot-password                             │
│  GET    /api/auth/verify-reset-token                          │
│  POST   /api/auth/reset-password                              │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        │ Route to Controller
                        ↓
┌──────────────────────────────────────────────────────────────┐
│                      CONTROLLER                               │
│                  (authController.js)                          │
│                                                                │
│  • forgotPassword()      - Request reset email                │
│  • verifyResetToken()    - Validate token                     │
│  • resetPassword()       - Update password                    │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        │ Call Services
                        ↓
┌──────────────────────────────────────────────────────────────┐
│                       SERVICES                                │
│                  (forgotPassword.js)                          │
│                                                                │
│  • sendResetPasswordEmail() - Generate token & send email     │
│  • verifyResetToken()       - Verify JWT token                │
└───────────────────────┬──────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ↓               ↓               ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│    EMAIL     │ │     JWT      │ │   DATABASE   │
│   (Gmail)    │ │  (jsonwebtoken)│ │  (MongoDB)   │
│              │ │              │ │              │
│ sendEmail()  │ │ jwt.sign()   │ │ User.find()  │
│              │ │ jwt.verify() │ │ User.save()  │
└──────────────┘ └──────────────┘ └──────────────┘
```

## Security Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY MEASURES                          │
└─────────────────────────────────────────────────────────────┘

1. TOKEN GENERATION
   ┌──────────────────────────────────────┐
   │ jwt.sign({                           │
   │   id: user._id,                      │
   │   email: user.email                  │
   │ },                                   │
   │ process.env.PASSWORD_RESET_KEY,      │ ← Separate secret key
   │ { expiresIn: '1h' }                  │ ← Time-limited
   │ )                                    │
   └──────────────────────────────────────┘

2. TOKEN VERIFICATION
   ┌──────────────────────────────────────┐
   │ jwt.verify(                          │
   │   token,                             │
   │   process.env.PASSWORD_RESET_KEY     │ ← Must match
   │ )                                    │
   │                                      │
   │ Checks:                              │
   │ ✓ Valid signature                    │
   │ ✓ Not expired                        │
   │ ✓ Correct format                     │
   └──────────────────────────────────────┘

3. PASSWORD HASHING
   ┌──────────────────────────────────────┐
   │ Pre-save hook in User model:         │
   │                                      │
   │ const salt = bcrypt.genSalt(10)      │
   │ user.password = bcrypt.hash(         │
   │   password,                          │
   │   salt                               │
   │ )                                    │
   │                                      │
   │ Automatic on user.save()             │
   └──────────────────────────────────────┘

4. SESSION INVALIDATION
   ┌──────────────────────────────────────┐
   │ After password reset:                │
   │                                      │
   │ user.refreshToken = null             │ ← Force re-login
   │ user.save()                          │
   │                                      │
   │ All existing sessions invalidated    │
   └──────────────────────────────────────┘
```

## Error Handling Flow

```
┌────────────────────────────────────────────────────────────┐
│                     ERROR SCENARIOS                          │
└────────────────────────────────────────────────────────────┘

1. FORGOT PASSWORD
   ├─ Email not provided → 400 "Email is required"
   ├─ User not found     → 200 "If email exists..." (no disclosure)
   └─ Email send fails   → 500 "Internal server error"

2. VERIFY TOKEN
   ├─ No token           → 400 "Token is required"
   ├─ Invalid token      → 400 "Invalid or expired token"
   ├─ Expired token      → 400 "Invalid or expired token"
   └─ User not found     → 404 "User not found"

3. RESET PASSWORD
   ├─ No token           → 400 "Reset token is required"
   ├─ No password        → 400 "New password is required"
   ├─ Password too short → 400 "Password must be at least 6 chars"
   ├─ Invalid token      → 400 "Invalid or expired reset token"
   ├─ User not found     → 404 "User not found"
   └─ Save fails         → 500 "Internal server error"
```

## Data Flow

```
REQUEST                    PROCESSING                    RESPONSE
========                   ==========                    ========

{ email }         →  Find in DB                  →  { message }
                     Generate token
                     Send email

?token=xxx        →  Verify JWT                  →  { valid, email }
                     Check expiry
                     Find user

{ newPassword }   →  Verify token                →  { message }
?token=xxx           Validate password
                     Hash password
                     Update DB
                     Clear session
```

## File Structure

```
EzyMarket/
└── src/
    ├── routes/
    │   └── authRoute.js              ← 3 new routes
    │
    ├── controllers/
    │   └── authController.js         ← 3 new methods
    │
    ├── services/
    │   ├── forgotPassword.js         ← NEW FILE
    │   └── verifyEmail.js            ← Updated
    │
    ├── utils/
    │   └── sendEmail.js              ← Existing
    │
    └── model/
        └── userRepository.js         ← Existing (pre-save hook)
```
