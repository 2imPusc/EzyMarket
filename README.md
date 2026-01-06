# EzyMarket Backend

Một ứng dụng quản lý công thức nấu ăn, tủ lạnh và danh sách mua sắm được xây dựng bằng **Node.js + Express + MongoDB**.

## 📚 Documentation Structure

Dự án này có tài liệu chi tiết được tổ chức như sau:

| Tài liệu                                                               | Mô tả                                                                   |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **[BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)**               | 🏗️ Tổng quan kiến trúc, package diagrams, module organization           |
| **[API_ENDPOINTS_DOCUMENTATION.md](./API_ENDPOINTS_DOCUMENTATION.md)** | 📡 Chi tiết API endpoints, request/response examples cho tất cả modules |
| **[DATA_FLOW_DIAGRAMS.md](./DATA_FLOW_DIAGRAMS.md)**                   | 🔄 Luồng dữ liệu, integration flows, security architecture              |
| **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)**                         | ⚡ Hướng dẫn nhanh, setup, common tasks                                 |
| **[SWAGGER_GUIDE.md](./SWAGGER_GUIDE.md)**                             | 📚 Interactive API documentation (accessible at `/api-docs`)            |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 4.4+
- npm hoặc yarn

### Installation

```bash
# Clone repository
git clone <repository-url>
cd EzyMarket

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Configure environment variables
# Edit .env with your settings (MongoDB URI, JWT secret, SMTP config, etc)

# Start development server
npm run dev
```

Server sẽ chạy tại `http://localhost:5000`

### API Documentation

Truy cập Swagger UI documentation:

```
GET http://localhost:5000/api-docs
```

---

## 🏛️ Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│         Express.js HTTP Server (Port 5000)          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │       Middleware Stack (Auth, Validation)     │  │
│  └──────────────────┬───────────────────────────┘  │
│                     ↓                               │
│  ┌──────────────────────────────────────────────┐  │
│  │  Controllers Layer (Request Handlers)         │  │
│  │  - authController                             │  │
│  │  - groupController                            │  │
│  │  - recipeController                           │  │
│  │  - ... more                                    │  │
│  └──────────────────┬───────────────────────────┘  │
│                     ↓                               │
│  ┌──────────────────────────────────────────────┐  │
│  │  Services Layer (Business Logic)              │  │
│  │  - authService                                │  │
│  │  - recipeService                              │  │
│  │  - shoppingService                            │  │
│  │  - ... more                                    │  │
│  └──────────────────┬───────────────────────────┘  │
│                     ↓                               │
│  ┌──────────────────────────────────────────────┐  │
│  │  Repositories/Models (Data Access)            │  │
│  │  - userRepository (Mongoose)                  │  │
│  │  - recipeRepository (Mongoose)                │  │
│  │  - ... more                                    │  │
│  └──────────────────┬───────────────────────────┘  │
│                     ↓                               │
│  ┌──────────────────────────────────────────────┐  │
│  │         MongoDB Database                      │  │
│  │  users | groups | recipes | ingredients ...  │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 📦 Main Modules

### 1. **Authentication** 🔐

- User registration & login
- Email verification with OTP
- JWT token management (access + refresh)
- Password reset functionality

**Key Files**: `authRoute.js`, `authController.js`, `authService.js`

### 2. **Group Management** 👥

- Create & manage shared groups
- Member role-based access control
- Collaborative workspace

**Key Files**: `groupRoute.js`, `groupController.js`, `groupService.js`

### 3. **Recipe Management** 🍳

- Full recipe CRUD operations
- Ingredient & cooking step management
- Recipe tagging & categorization
- Ratings & reviews system

**Key Files**: `recipeRoute.js`, `tagRoute.js`, `cookingRoute.js`

### 4. **Ingredients & Units** 🥕

- Ingredient catalog per group
- Custom unit definitions
- Unit conversion support

**Key Files**: `ingredientRoute.js`, `unitRoute.js`

### 5. **Fridge Management** 🧊

- Track fridge inventory
- Expiry date monitoring
- Location-based organization

**Key Files**: `fridgeItemRoute.js`, `fridgeItemController.js`

### 6. **Meal Planning** 📅

- Weekly/monthly meal planning
- Auto-generate shopping lists from meal plans

**Key Files**: `mealPlanRoute.js`, `mealPlanController.js`

### 7. **Shopping Lists** 🛒

- Create & manage shopping lists
- Collaborative item tracking
- Purchase status management

**Key Files**: `shoppingRoute.js`, `shoppingController.js`

### 8. **Reports & Analytics** 📊

- Ingredient usage statistics
- Recipe popularity tracking
- Shopping patterns & spending

**Key Files**: `reportRoute.js`, `reportService.js`

---

## 🗂️ Project Structure

```
EzyMarket/
│
├── src/
│   ├── index.js                              # Entry point
│   │
│   ├── config/                               # Configuration
│   │   ├── db.js                             # MongoDB connection
│   │   ├── swagger.js                        # API docs setup
│   │   ├── authConst.js                      # Auth constants
│   │   └── uploadthing.js                    # File upload config
│   │
│   ├── controllers/                          # Request handlers
│   │   ├── authController.js
│   │   ├── groupController.js
│   │   ├── recipeController.js
│   │   ├── ingredientController.js
│   │   ├── unitController.js
│   │   ├── fridgeItemController.js
│   │   ├── mealPlanController.js
│   │   ├── shoppingController.js
│   │   ├── reportController.js
│   │   ├── tagController.js
│   │   └── cookingController.js
│   │
│   ├── services/                             # Business logic
│   │   ├── authService.js
│   │   ├── groupService.js
│   │   ├── recipeService.js
│   │   ├── shoppingService.js
│   │   ├── mealPlanService.js
│   │   ├── reportService.js
│   │   └── verifyEmail.js
│   │
│   ├── model/                                # Database schemas (Mongoose)
│   │   ├── userRepository.js
│   │   ├── groupRepository.js
│   │   ├── recipeRepository.js
│   │   ├── ingredientRepository.js
│   │   ├── unitRepository.js
│   │   ├── fridgeItemRepository.js
│   │   ├── mealPlanRepository.js
│   │   ├── shoppingRepository.js
│   │   └── tagRepository.js
│   │
│   ├── routes/                               # API routes
│   │   ├── authRoute.js
│   │   ├── groupRoute.js
│   │   ├── recipeRoute.js
│   │   ├── ingredientRoute.js
│   │   ├── unitRoute.js
│   │   ├── fridgeItemRoute.js
│   │   ├── mealPlanRoute.js
│   │   ├── shoppingRoute.js
│   │   ├── reportRoute.js
│   │   ├── tagRoute.js
│   │   ├── cookingRoute.js
│   │   ├── adminRoute.js
│   │   └── upload.routes.js
│   │
│   ├── middlewares/                          # Express middlewares
│   │   ├── authMiddleware.js                 # JWT verification
│   │   ├── groupMiddleware.js                # Group access control
│   │   ├── ownershipMiddleware.js            # Resource ownership
│   │   ├── validationMiddleware.js           # Joi validation
│   │   ├── shoppingListMiddleware.js         # Shopping list access
│   │   └── unitMiddleware.js                 # Unit validation
│   │
│   └── utils/                                # Utilities
│       ├── otpGenerator.js                   # OTP generation
│       └── sendEmail.js                      # Email sending
│
├── package.json                              # Dependencies & scripts
├── .env.example                              # Environment variables template
├── README.md                                 # This file
├── BACKEND_ARCHITECTURE.md                   # Architecture documentation
├── API_ENDPOINTS_DOCUMENTATION.md            # API reference
├── DATA_FLOW_DIAGRAMS.md                     # Data flow & security flows
├── QUICK_REFERENCE.md                        # Quick setup guide
└── SWAGGER_GUIDE.md                          # Swagger/OpenAPI guide
```

---

## 🔐 Security Features

- **JWT Authentication**: Stateless token-based auth with refresh tokens
- **Password Hashing**: bcryptjs with 10 salt rounds
- **Email Verification**: OTP-based email verification
- **Role-Based Access Control**: Owner, Admin, Member, Viewer roles
- **CORS Protection**: Configurable origin validation
- **Input Validation**: Joi schema validation for all requests
- **Ownership Verification**: Users can only access/modify their own data

---

## 🗄️ Database Design

### Collections

- **users** - User accounts & profiles
- **groups** - Shared groups/workspaces
- **recipes** - Recipe information
- **ingredients** - Ingredient catalog
- **units** - Measurement units (ml, g, kg, etc)
- **tags** - Recipe tags & categories
- **fridgeitems** - Fridge inventory
- **mealplans** - Meal schedules
- **shoppinglists** - Shopping list items

### Key Relationships

```
User → Groups (many-to-many with roles)
User → Recipes (one-to-many)
Group → Recipes (one-to-many)
Group → FridgeItems (one-to-many)
Recipe → Ingredients (many-to-many with quantities)
Recipe → Tags (many-to-many)
MealPlan → Recipes (many-to-many with dates)
```

---

## 📡 API Endpoints Summary

| Module          | Method | Endpoint                                 |
| --------------- | ------ | ---------------------------------------- |
| **Auth**        | POST   | `/api/user/register`                     |
|                 | POST   | `/api/user/login`                        |
|                 | POST   | `/api/user/verify-email`                 |
| **Groups**      | GET    | `/api/groups`                            |
|                 | POST   | `/api/groups`                            |
|                 | POST   | `/api/groups/{id}/members`               |
| **Recipes**     | GET    | `/api/recipes`                           |
|                 | POST   | `/api/recipes`                           |
|                 | GET    | `/api/recipes/search`                    |
|                 | POST   | `/api/recipes/{id}/like`                 |
| **Ingredients** | GET    | `/api/ingredients`                       |
|                 | POST   | `/api/ingredients`                       |
|                 | GET    | `/api/ingredients/search`                |
| **Shopping**    | GET    | `/api/shopping-lists`                    |
|                 | POST   | `/api/shopping-lists`                    |
|                 | POST   | `/api/shopping-lists/generate-from-plan` |
| **Reports**     | GET    | `/api/reports/ingredient-usage`          |
|                 | GET    | `/api/reports/recipe-popularity`         |

See **[API_ENDPOINTS_DOCUMENTATION.md](./API_ENDPOINTS_DOCUMENTATION.md)** for complete endpoint list.

---

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start with hot reload (nodemon)

# Code Quality
npm run lint            # Run ESLint
npm run format          # Format with Prettier

# Build & Deployment
npm run build           # Build for production
npm run build:prod      # Build minified
npm start:prod          # Run production build

# Testing
npm run test            # Run tests (if configured)
```

---

## 📋 Dependencies

### Core

- **express** (v5.1.0) - Web framework
- **mongoose** (v8.15.1) - MongoDB ODM
- **jsonwebtoken** (v9.0.2) - JWT authentication
- **bcryptjs** (v3.0.2) - Password hashing
- **joi** (v17.13.3) - Input validation
- **cors** (v2.8.5) - CORS middleware

### Additional Services

- **nodemailer** (v7.0.9) - Email service
- **swagger-ui-express** - API documentation UI
- **uploadthing** (v7.7.4) - File upload service
- **dotenv** (v16.5.0) - Environment variables

### Development

- **nodemon** - Auto-reload on changes
- **eslint** - Code linting
- **prettier** - Code formatting
- **esbuild** - Build bundler

---

## 🔧 Environment Configuration

Create a `.env` file based on `.env.example`:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/ezymarket

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRATION=1h
REFRESH_TOKEN_SECRET=your-refresh-token-secret
REFRESH_TOKEN_EXPIRATION=7d

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SENDER_EMAIL=noreply@ezymarket.com

# File Upload (UploadThing)
UPLOADTHING_SECRET=your-uploadthing-secret
UPLOADTHING_APP_ID=your-app-id

# Optional
ADMIN_EMAIL=admin@ezymarket.com
LOG_LEVEL=debug
```

---

## 🚀 Deployment

### Prerequisites

- MongoDB Atlas cluster or self-hosted MongoDB
- Node.js hosting (Heroku, Vercel, AWS, DigitalOcean, etc)
- Email service configured (Gmail, SendGrid, AWS SES)
- UploadThing account for file uploads

### Deployment Steps

1. **Prepare environment variables** for production
2. **Build application**: `npm run build:prod`
3. **Deploy to hosting** (push to git, deploy from CI/CD)
4. **Verify API** is accessible and functional
5. **Monitor logs** for any issues

### Production Checklist

- [ ] JWT secrets configured
- [ ] MongoDB connection secured
- [ ] CORS origins set appropriately
- [ ] Email service verified
- [ ] Error logging enabled
- [ ] Database backups configured
- [ ] Rate limiting (if needed)
- [ ] Security headers configured

---

## 📚 Documentation Files

### [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)

Comprehensive architecture guide including:

- System overview
- Package diagrams for each module
- Middleware stack explanation
- Database schema relationships
- Security layers

### [API_ENDPOINTS_DOCUMENTATION.md](./API_ENDPOINTS_DOCUMENTATION.md)

Detailed API reference including:

- Authentication flows
- Group management
- Recipe operations
- Shopping list generation
- Request/response examples

### [DATA_FLOW_DIAGRAMS.md](./DATA_FLOW_DIAGRAMS.md)

Data flow visualizations including:

- Registration & login flows
- Recipe creation flow
- Shopping list generation flow
- External service integrations
- Security data flows

### [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

Quick setup & common tasks guide

### [SWAGGER_GUIDE.md](./SWAGGER_GUIDE.md)

Swagger/OpenAPI documentation setup

---

## 🐛 Troubleshooting

### Common Issues

| Issue                    | Solution                                       |
| ------------------------ | ---------------------------------------------- |
| MongoDB connection error | Check `MONGODB_URI` and MongoDB service status |
| JWT token invalid        | Verify token format and `JWT_SECRET`           |
| Email not sending        | Check SMTP credentials in `.env`               |
| CORS error               | Add origin to CORS configuration               |
| Recipe creation fails    | Verify ingredient & unit IDs exist in group    |

### Getting Help

1. Check documentation files
2. Review error logs: `npm run dev`
3. Check API response details
4. Verify database connection

---

## 📝 Code Standards

### Naming Conventions

- **Files**: camelCase for files & folders
- **Functions**: camelCase (e.g., `createRecipe`)
- **Classes/Models**: PascalCase (e.g., `User`, `Recipe`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`)

### Error Handling

```javascript
try {
  // operation
  res.status(200).json({ success: true, data: result });
} catch (error) {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: error.message,
  });
}
```

### Response Format

```javascript
// Success
{ success: true, message: "...", data: {...} }

// Error
{ success: false, message: "...", error: {...} }
```

---

## 🤝 Contributing

1. Create a feature branch (`git checkout -b feature/AmazingFeature`)
2. Follow code standards
3. Test your changes
4. Commit with clear messages
5. Push to branch
6. Create Pull Request

---

## 📄 License

[Specify your license]

---

## 📞 Support & Contact

For questions or issues:

- 📧 Email: support@ezymarket.com
- 🐛 Issues: GitHub Issues
- 💬 Discussions: GitHub Discussions

---

## 📈 Roadmap

- [ ] Advanced search filters
- [ ] Social recipe sharing
- [ ] Nutritional information tracking
- [ ] Mobile app integration
- [ ] Real-time collaboration features
- [ ] AI-powered recipe suggestions

---

## 🎉 Acknowledgments

Built with ❤️ by EzyMarket Development Team

---

**Last Updated**: January 2026  
**Version**: 1.0.0
