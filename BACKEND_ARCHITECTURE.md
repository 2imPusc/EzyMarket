# EzyMarket Backend - Architecture Documentation

## 📋 Mục lục

- [Tổng quan kiến trúc](#tổng-quan-kiến-trúc)
- [Package Diagrams](#package-diagrams)
- [Chi tiết các modules](#chi-tiết-các-modules)
- [Luồng dữ liệu](#luồng-dữ-liệu)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)

---

## 🏗️ Tổng quan kiến trúc

EzyMarket Backend được xây dựng theo mô hình **3-Layer Architecture** (Presentation - Business Logic - Data Access) với các điểm đặc biệt:

- **Framework**: Express.js (Node.js)
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT + bcryptjs
- **Validation**: Joi
- **Documentation**: Swagger/OpenAPI
- **File Upload**: UploadThing

---

## 📦 Package Diagrams

### 1. Tổng quan kiến trúc toàn hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│                     Express Application                          │
│                       (entry: index.js)                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼──┐      ┌─────▼──┐      ┌─────▼──┐
    │ Config │      │ Routes │      │ Middleware
    │ Module │      │ Module │      │ Module
    └────────┘      └────────┘      └──────────┘
          │                │                │
          ├────────────────┼────────────────┤
          │                │                │
          └────────────────┼────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼──────┐   ┌─────▼──────┐   ┌────▼──────┐
    │ Controllers │   │  Services  │   │ Utilities  │
    │   Layer     │   │   Layer    │   │   Layer    │
    └─────┬──────┘   └─────┬──────┘   └────┬──────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼──────┐   ┌─────▼──────┐   ┌────▼──────┐
    │ Models     │   │ Repositories│   │ Database  │
    │ (Schemas)  │   │ (Queries)   │   │ (MongoDB) │
    └────────────┘   └─────┬──────┘   └───────────┘
                           │
                    ┌──────▼──────┐
                    │  MongoDB    │
                    │  Database   │
                    └─────────────┘
```

### 2. Package Dependencies - Chi tiết theo Module

#### 📝 Authentication Module

```
┌─────────────────────────────────────────┐
│      Authentication Package             │
├─────────────────────────────────────────┤
│                                         │
│  Routes/authRoute.js                    │
│       ↓                                  │
│  authController.js                      │
│       ├→ authService.js                 │
│       ├→ verifyEmail.js                 │
│       └→ userRepository.js              │
│            └→ User Model (MongoDB)      │
│                                         │
│  Dependencies:                          │
│  ├─ jsonwebtoken (JWT)                  │
│  ├─ bcryptjs (Password hashing)         │
│  ├─ nodemailer (Email)                  │
│  ├─ joi (Validation)                    │
│  └─ authMiddleware.js                   │
│                                         │
└─────────────────────────────────────────┘
```

#### 👥 User Management Module

```
┌─────────────────────────────────────────┐
│      User Management Package            │
├─────────────────────────────────────────┤
│                                         │
│  Routes/authRoute.js                    │
│       ↓                                  │
│  authController.js                      │
│       ├→ authService.js                 │
│       └→ User Repository                │
│            └→ MongoDB                   │
│                                         │
│  Exposed Endpoints:                     │
│  ├─ POST /api/user/register             │
│  ├─ POST /api/user/login                │
│  ├─ POST /api/user/verify-email         │
│  ├─ POST /api/user/reset-password       │
│  ├─ GET /api/user/profile               │
│  └─ PUT /api/user/update-profile        │
│                                         │
└─────────────────────────────────────────┘
```

#### 👨‍👩‍👧‍👦 Group Management Module

```
┌──────────────────────────────────────────────┐
│         Group Management Package             │
├──────────────────────────────────────────────┤
│                                              │
│  Routes/groupRoute.js                        │
│       ↓                                       │
│  groupController.js                          │
│       ├→ groupService.js                     │
│       ├→ groupRepository.js                  │
│       ├→ authMiddleware.js (JWT verify)      │
│       ├→ groupMiddleware.js (permission)     │
│       ├→ ownershipMiddleware.js              │
│       └→ validationMiddleware.js (Joi)       │
│            └→ Group Model (MongoDB)         │
│                 └→ User references          │
│                                              │
│  Key Features:                               │
│  ├─ Create groups                            │
│  ├─ Manage members                           │
│  ├─ Member roles & permissions               │
│  ├─ Group settings                           │
│  └─ Delete groups                            │
│                                              │
└──────────────────────────────────────────────┘
```

#### 🏭 Ingredients & Units Module

```
┌──────────────────────────────────────────────┐
│    Ingredients & Units Management Package    │
├──────────────────────────────────────────────┤
│                                              │
│  Routes:                                     │
│  ├─ ingredientRoute.js                       │
│  └─ unitRoute.js                             │
│       ↓                                       │
│  Controllers:                                │
│  ├─ ingredientController.js                  │
│  └─ unitController.js                        │
│       ↓                                       │
│  Services:                                   │
│  ├─ ingredientService.js                     │
│  └─ (unitService if exists)                  │
│       ↓                                       │
│  Repositories:                               │
│  ├─ ingredientRepository.js                  │
│  └─ unitRepository.js                        │
│       ↓                                       │
│  Middlewares:                                │
│  ├─ authMiddleware.js                        │
│  ├─ groupMiddleware.js                       │
│  ├─ validationMiddleware.js                  │
│  └─ unitMiddleware.js                        │
│       ↓                                       │
│  Models (MongoDB):                           │
│  ├─ Ingredient Schema                        │
│  └─ Unit Schema                              │
│       └─ Group references                    │
│                                              │
│  Endpoints:                                  │
│  ├─ GET/POST /api/ingredients                │
│  ├─ GET/PUT /api/ingredients/:id             │
│  ├─ DELETE /api/ingredients/:id              │
│  ├─ GET/POST /api/units                      │
│  ├─ PUT /api/units/:id                       │
│  └─ DELETE /api/units/:id                    │
│                                              │
└──────────────────────────────────────────────┘
```

#### 🍳 Recipe & Tags Module

```
┌──────────────────────────────────────────────┐
│       Recipe & Tags Management Package       │
├──────────────────────────────────────────────┤
│                                              │
│  Routes:                                     │
│  ├─ recipeRoute.js                           │
│  └─ tagRoute.js                              │
│       ↓                                       │
│  Controllers:                                │
│  ├─ recipeController.js                      │
│  └─ tagController.js                         │
│       ↓                                       │
│  Services:                                   │
│  ├─ recipeService.js                         │
│  ├─ tagService.js                            │
│  └─ cookingService.js (for cooking steps)    │
│       ↓                                       │
│  Repositories:                               │
│  ├─ recipeRepository.js                      │
│  └─ tagRepository.js                         │
│       ↓                                       │
│  Middlewares:                                │
│  ├─ authMiddleware.js                        │
│  ├─ groupMiddleware.js                       │
│  ├─ ownershipMiddleware.js                   │
│  └─ validationMiddleware.js                  │
│       ↓                                       │
│  Models (MongoDB):                           │
│  ├─ Recipe Schema                            │
│  │   └─ References: User, Group, Tags,       │
│  │       Ingredients, CookingSteps           │
│  └─ Tag Schema                               │
│       └─ References: Group, Recipe           │
│                                              │
│  Endpoints:                                  │
│  ├─ GET/POST /api/recipes                    │
│  ├─ GET/PUT /api/recipes/:id                 │
│  ├─ DELETE /api/recipes/:id                  │
│  ├─ GET /api/recipes/search                  │
│  ├─ GET/POST /api/recipe-tags                │
│  └─ DELETE /api/recipe-tags/:id              │
│                                              │
└──────────────────────────────────────────────┘
```

#### 🧊 Fridge Items Module

```
┌──────────────────────────────────────────────┐
│      Fridge Items Management Package         │
├──────────────────────────────────────────────┤
│                                              │
│  Routes/fridgeItemRoute.js                   │
│       ↓                                       │
│  fridgeItemController.js                     │
│       ├→ fridgeItemService.js                │
│       ├→ fridgeItemRepository.js             │
│       ├→ authMiddleware.js                   │
│       ├→ groupMiddleware.js                  │
│       ├→ ownershipMiddleware.js              │
│       └→ validationMiddleware.js             │
│            └→ FridgeItem Model              │
│                 ├→ References: Group,       │
│                 │   Ingredient, Unit        │
│                 └→ Expiry date, quantity    │
│                                              │
│  Key Features:                               │
│  ├─ Track fridge inventory                  │
│  ├─ Expiry date management                  │
│  ├─ Quantity tracking                       │
│  └─ Fridge notifications                    │
│                                              │
└──────────────────────────────────────────────┘
```

#### 📋 Meal Plan Module

```
┌──────────────────────────────────────────────┐
│      Meal Plan Management Package            │
├──────────────────────────────────────────────┤
│                                              │
│  Routes/mealPlanRoute.js                     │
│       ↓                                       │
│  mealPlanController.js                       │
│       ├→ mealPlanService.js                  │
│       ├→ mealPlanRepository.js               │
│       ├→ authMiddleware.js                   │
│       ├→ groupMiddleware.js                  │
│       └→ validationMiddleware.js             │
│            └→ MealPlan Model                │
│                 ├→ References: Group,       │
│                 │   Recipe, Cooking         │
│                 └→ Schedule info             │
│                                              │
│  Dependencies:                               │
│  └─ Recipe Model (for meal planning)        │
│                                              │
└──────────────────────────────────────────────┘
```

#### 🛒 Shopping List Module

```
┌──────────────────────────────────────────────┐
│     Shopping List Management Package         │
├──────────────────────────────────────────────┤
│                                              │
│  Routes/shoppingRoute.js                     │
│       ↓                                       │
│  shoppingController.js                       │
│       ├→ shoppingService.js                  │
│       ├→ shoppingRepository.js               │
│       ├→ authMiddleware.js                   │
│       ├→ groupMiddleware.js                  │
│       ├→ shoppingListMiddleware.js           │
│       ├→ ownershipMiddleware.js              │
│       └→ validationMiddleware.js             │
│            └→ Shopping Model                │
│                 ├→ References: Group,       │
│                 │   Ingredient, Unit        │
│                 └→ Status tracking          │
│                                              │
│  Advanced Features:                          │
│  ├─ Auto-generate from meal plans           │
│  ├─ Collaborative shopping                  │
│  ├─ Item status tracking                    │
│  └─ Shopping suggestions                    │
│                                              │
└──────────────────────────────────────────────┘
```

#### 📊 Reports & Analytics Module

```
┌──────────────────────────────────────────────┐
│       Reports & Analytics Package            │
├──────────────────────────────────────────────┤
│                                              │
│  Routes/reportRoute.js                       │
│       ↓                                       │
│  reportController.js                         │
│       ├→ reportService.js                    │
│       ├→ authMiddleware.js                   │
│       ├→ groupMiddleware.js                  │
│       └→ validationMiddleware.js             │
│            └→ MongoDB Aggregation           │
│                 └─ Analysis queries         │
│                                              │
│  Data Analyzed:                              │
│  ├─ Ingredient usage                        │
│  ├─ Recipe popularity                       │
│  ├─ Shopping patterns                       │
│  ├─ Meal frequency                          │
│  └─ Fridge inventory                        │
│                                              │
└──────────────────────────────────────────────┘
```

#### 👨‍💼 Admin Module

```
┌──────────────────────────────────────────────┐
│        Admin Management Package              │
├──────────────────────────────────────────────┤
│                                              │
│  Routes/adminRoute.js                        │
│       ↓                                       │
│  Controllers:                                │
│  ├─ authController.js (admin login)          │
│  └─ groupController.js (admin operations)    │
│       ↓                                       │
│  Middlewares:                                │
│  ├─ authMiddleware.js (JWT verify)           │
│  └─ Role-based access control                │
│       ↓                                       │
│  Services:                                   │
│  └─ Shared with other modules                │
│                                              │
│  Admin Capabilities:                         │
│  ├─ User management                          │
│  ├─ Group administration                     │
│  ├─ Content moderation                       │
│  └─ System monitoring                        │
│                                              │
└──────────────────────────────────────────────┘
```

#### 📤 Upload Module

```
┌──────────────────────────────────────────────┐
│         File Upload Management               │
├──────────────────────────────────────────────┤
│                                              │
│  Routes/upload.routes.js                     │
│       ↓                                       │
│  Config/uploadthing.js                       │
│       ├→ UploadThing API integration         │
│       ├→ File validation                     │
│       └→ Storage management                  │
│                                              │
│  Supported Use Cases:                        │
│  ├─ Recipe images                            │
│  ├─ Profile pictures                         │
│  ├─ Document uploads                         │
│  └─ Other media files                        │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 3. Cross-Cutting Concerns (Middleware Stack)

```
┌─────────────────────────────────────────────────────────────┐
│              HTTP Request Processing Pipeline               │
├─────────────────────────────────────────────────────────────┤
│                          ↓                                   │
│        Express Middleware Stack (Global)                     │
│        ├─ cors()                                             │
│        ├─ bodyParser.json()                                  │
│        └─ bodyParser.urlencoded()                            │
│                          ↓                                   │
│        Swagger Documentation (/api-docs)                     │
│                          ↓                                   │
│        Route-Specific Middlewares (Order Matters)            │
│        ├─ authMiddleware.js                                  │
│        │  └─ Verify JWT token & extract user                │
│        │     authentication                                  │
│        ├─ groupMiddleware.js                                 │
│        │  └─ Verify group membership & access               │
│        ├─ ownershipMiddleware.js                             │
│        │  └─ Verify resource ownership                      │
│        ├─ shoppingListMiddleware.js                          │
│        │  └─ Verify shopping list access                    │
│        ├─ unitMiddleware.js                                  │
│        │  └─ Validate unit-related operations               │
│        └─ validationMiddleware.js                            │
│           └─ Joi schema validation for req.body              │
│                          ↓                                   │
│        Controller Execution                                  │
│                          ↓                                   │
│        Response / Error Handling                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Chi tiết các modules

### Controllers Layer

```javascript
Controllers Responsibilities:
├─ Receive HTTP requests
├─ Call appropriate services
├─ Handle validation errors
├─ Format and return responses
└─ Pass data to services

Files:
├─ authController.js        → Auth logic (login, register, email verify)
├─ groupController.js       → Group CRUD & member management
├─ ingredientController.js  → Ingredient CRUD
├─ unitController.js        → Unit CRUD
├─ recipeController.js      → Recipe CRUD & search
├─ tagController.js         → Recipe tags CRUD
├─ fridgeItemController.js  → Fridge inventory management
├─ cookingController.js     → Cooking steps management
├─ mealPlanController.js    → Meal plan CRUD
├─ shoppingController.js    → Shopping list management
└─ reportController.js      → Data analytics & reports
```

### Services Layer

```javascript
Services Responsibilities:
├─ Business logic implementation
├─ Data transformation
├─ Service orchestration
├─ Validation logic
└─ Cache & optimization

Files:
├─ authService.js           → JWT generation, password hashing
├─ groupService.js          → Group business operations
├─ ingredientService.js     → Ingredient validations
├─ recipeService.js         → Recipe processing
├─ tagService.js            → Tag management
├─ fridgeItemService.js     → Inventory logic
├─ cookingService.js        → Cooking steps processing
├─ mealPlanService.js       → Meal scheduling logic
├─ shoppingService.js       → Shopping list generation
├─ reportService.js         → Report generation & aggregation
└─ verifyEmail.js           → Email OTP verification
```

### Repositories/Models Layer

```javascript
Repository Responsibilities:
├─ MongoDB database operations
├─ Query construction
├─ Data persistence
├─ Schema definition (Mongoose)
└─ Relationships management

Files:
├─ userRepository.js        → User schema & queries
├─ groupRepository.js       → Group schema & queries
├─ ingredientRepository.js  → Ingredient schema & queries
├─ unitRepository.js        → Unit schema & queries
├─ recipeRepository.js      → Recipe schema & queries
├─ tagRepository.js         → Tag schema & queries
├─ fridgeItemRepository.js  → FridgeItem schema & queries
├─ mealPlanRepository.js    → MealPlan schema & queries
└─ shoppingRepository.js    → Shopping schema & queries
```

### Middleware Layer

```javascript
Middleware Responsibilities:
├─ Request preprocessing
├─ Authentication/Authorization
├─ Validation
├─ Error handling
└─ Logging & monitoring

Files:
├─ authMiddleware.js        → JWT verification
├─ groupMiddleware.js       → Group access control
├─ ownershipMiddleware.js   → Resource ownership verification
├─ shoppingListMiddleware.js→ Shopping list access control
├─ unitMiddleware.js        → Unit-specific validations
└─ validationMiddleware.js  → Request body validation (Joi)
```

---

## 🔄 Luồng dữ liệu (Data Flow Examples)

### 1. Authentication Flow

```
User Request (Login)
        ↓
authRoute.js → authController.login()
        ↓
authService.verifyPassword()
        ↓
userRepository.findOne()
        ↓
MongoDB Query → User Document
        ↓
Generate JWT (accessToken + refreshToken)
        ↓
Return Response with Tokens
        ↓
Client receives JWT for future authenticated requests
```

### 2. Recipe Creation Flow

```
POST /api/recipes (with JWT token)
        ↓
authMiddleware → Verify token & extract userId
        ↓
groupMiddleware → Verify user belongs to group
        ↓
validationMiddleware → Validate recipe data (Joi schema)
        ↓
recipeController.create()
        ↓
recipeService.validateAndProcess()
        ↓
recipeRepository.create() → Save to MongoDB
        ↓
Populate references (user, group, tags, ingredients)
        ↓
Return created recipe with populated data
```

### 3. Shopping List Generation Flow

```
POST /api/shopping-lists/generate (from meal plan)
        ↓
authMiddleware → Verify user
        ↓
groupMiddleware → Verify group access
        ↓
shoppingController.generateFromMealPlan()
        ↓
shoppingService.processRecipes()
        ├→ Get meals from mealPlanRepository
        ├→ Extract ingredients from recipeRepository
        └→ Aggregate quantities by ingredient
        ↓
shoppingRepository.create() → Save shopping list
        ↓
Return shopping list with items grouped by ingredient
```

---

## 🏢 Cấu trúc thư mục chi tiết

```
EzyMarket/
│
├── src/
│   ├── index.js                          # Entry point
│   │
│   ├── config/                           # Configuration files
│   │   ├── authConst.js                  # Auth constants (OTP expiration, etc)
│   │   ├── db.js                         # MongoDB connection
│   │   ├── swagger.js                    # Swagger/OpenAPI setup
│   │   └── uploadthing.js                # File upload configuration
│   │
│   ├── constants/                        # Application constants
│   │
│   ├── controllers/                      # Request handlers
│   │   ├── authController.js
│   │   ├── groupController.js
│   │   ├── ingredientController.js
│   │   ├── unitController.js
│   │   ├── recipeController.js
│   │   ├── tagController.js
│   │   ├── fridgeItemController.js
│   │   ├── cookingController.js
│   │   ├── mealPlanController.js
│   │   ├── shoppingController.js
│   │   └── reportController.js
│   │
│   ├── middlewares/                      # Express middlewares
│   │   ├── authMiddleware.js
│   │   ├── groupMiddleware.js
│   │   ├── ownershipMiddleware.js
│   │   ├── shoppingListMiddleware.js
│   │   ├── unitMiddleware.js
│   │   └── validationMiddleware.js
│   │
│   ├── model/                            # Mongoose schemas & repositories
│   │   ├── userRepository.js
│   │   ├── groupRepository.js
│   │   ├── ingredientRepository.js
│   │   ├── unitRepository.js
│   │   ├── recipeRepository.js
│   │   ├── tagRepository.js
│   │   ├── fridgeItemRepository.js
│   │   ├── mealPlanRepository.js
│   │   └── shoppingRepository.js
│   │
│   ├── routes/                           # Express routes
│   │   ├── authRoute.js
│   │   ├── adminRoute.js
│   │   ├── groupRoute.js
│   │   ├── ingredientRoute.js
│   │   ├── unitRoute.js
│   │   ├── recipeRoute.js
│   │   ├── tagRoute.js
│   │   ├── fridgeItemRoute.js
│   │   ├── cookingRoute.js
│   │   ├── mealPlanRoute.js
│   │   ├── shoppingRoute.js
│   │   ├── reportRoute.js
│   │   └── upload.routes.js
│   │
│   ├── services/                         # Business logic
│   │   ├── authService.js
│   │   ├── groupService.js
│   │   ├── ingredientService.js
│   │   ├── recipeService.js
│   │   ├── tagService.js
│   │   ├── fridgeItemService.js
│   │   ├── cookingService.js
│   │   ├── mealPlanService.js
│   │   ├── shoppingService.js
│   │   ├── reportService.js
│   │   └── verifyEmail.js
│   │
│   └── utils/                            # Utility functions
│       ├── otpGenerator.js               # OTP generation
│       └── sendEmail.js                  # Email sending
│
├── package.json
├── vite.config.js
├── eslint.config.mjs
├── SWAGGER_GUIDE.md
└── README.md
```

---

## 🔌 Dependencies Overview

```
External Dependencies:
├── express (v5.1.0)           # Web framework
├── mongoose (v8.15.1)         # MongoDB ODM
├── jsonwebtoken (v9.0.2)      # JWT authentication
├── bcryptjs (v3.0.2)          # Password hashing
├── joi (v17.13.3)             # Data validation
├── nodemailer (v7.0.9)        # Email service
├── cors (v2.8.5)              # CORS middleware
├── dotenv (v16.5.0)           # Environment variables
├── swagger-ui-express         # Swagger UI
├── swagger-jsdoc              # Swagger documentation
├── uploadthing (v7.7.4)       # File upload service
└── @uploadthing/mime-types    # MIME type utilities

Dev Dependencies:
├── nodemon                    # Auto-reload on changes
├── eslint                     # Code linting
├── prettier                   # Code formatting
└── esbuild                    # Build bundler
```

---

## 📚 Module Dependencies Map

```
Shared Dependencies (Used by multiple modules):
├─ authMiddleware.js
│  ├─ Used by: All protected routes
│  └─ Function: JWT token verification
│
├─ groupMiddleware.js
│  ├─ Used by: Group, Recipe, Shopping, FridgeItem, MealPlan modules
│  └─ Function: Group membership verification
│
├─ ownershipMiddleware.js
│  ├─ Used by: Recipe, Shopping, FridgeItem modules
│  └─ Function: Resource ownership verification
│
├─ validationMiddleware.js
│  ├─ Used by: All routes
│  └─ Function: Request body validation using Joi
│
└─ shoppingListMiddleware.js
   ├─ Used by: Shopping module
   └─ Function: Shopping list access control
```

---

## 🔐 Security Layers

```
┌──────────────────────────────────────────────┐
│         Security Architecture                │
├──────────────────────────────────────────────┤
│                                              │
│  Layer 1: CORS Validation                    │
│  ├─ Request origin check                     │
│  └─ Allowed methods validation               │
│                                              │
│  Layer 2: Authentication (authMiddleware)    │
│  ├─ JWT token verification                   │
│  ├─ Token expiration check                   │
│  └─ User context extraction                  │
│                                              │
│  Layer 3: Authorization                      │
│  ├─ groupMiddleware: Group membership check  │
│  ├─ ownershipMiddleware: Resource ownership  │
│  └─ Role-based access control (Admin)        │
│                                              │
│  Layer 4: Data Validation (validationMW)     │
│  ├─ Schema validation with Joi               │
│  ├─ Type checking                            │
│  └─ Business rule validation                 │
│                                              │
│  Layer 5: Password Security                  │
│  ├─ bcryptjs hashing (authService)           │
│  └─ Salt rounds: 10                          │
│                                              │
│  Layer 6: Email Verification                 │
│  ├─ OTP generation (otpGenerator.js)         │
│  ├─ OTP expiration: 10 minutes               │
│  └─ Email sending (sendEmail.js)             │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 📊 Database Schema Relationships

```
User
├─ _id
├─ email (unique)
├─ userName (unique)
├─ password (hashed)
├─ profile (name, avatar, etc)
├─ role (user, admin)
├─ groups (reference: Group[])
├─ recipes (reference: Recipe[])
└─ createdAt, updatedAt

Group
├─ _id
├─ name
├─ owner (reference: User)
├─ members (reference: User[], with roles)
├─ ingredients (reference: Ingredient[])
├─ recipes (reference: Recipe[])
├─ fridgeItems (reference: FridgeItem[])
├─ mealPlans (reference: MealPlan[])
├─ shoppingLists (reference: Shopping[])
└─ createdAt, updatedAt

Recipe
├─ _id
├─ title
├─ description
├─ group (reference: Group)
├─ owner (reference: User)
├─ ingredients (Ingredient[] with quantities)
├─ cookingSteps (CookingStep[])
├─ tags (reference: Tag[])
├─ cookingTime
├─ servings
└─ createdAt, updatedAt

Ingredient
├─ _id
├─ name
├─ group (reference: Group)
├─ unit (reference: Unit)
├─ category
└─ createdAt, updatedAt

Unit
├─ _id
├─ name (ml, l, g, kg, etc)
├─ abbreviation
├─ conversionFactor
└─ group (reference: Group)

FridgeItem
├─ _id
├─ ingredient (reference: Ingredient)
├─ group (reference: Group)
├─ quantity
├─ unit (reference: Unit)
├─ expiryDate
├─ addedBy (reference: User)
└─ createdAt, updatedAt

MealPlan
├─ _id
├─ group (reference: Group)
├─ meals (Recipe[] with dates)
├─ startDate
├─ endDate
└─ createdAt, updatedAt

Shopping
├─ _id
├─ group (reference: Group)
├─ items (ShoppingItem[])
│  ├─ ingredient (reference: Ingredient)
│  ├─ quantity
│  ├─ unit (reference: Unit)
│  ├─ isPurchased (boolean)
│  └─ purchasedBy (reference: User)
└─ createdAt, updatedAt

Tag
├─ _id
├─ name
├─ group (reference: Group)
└─ createdAt, updatedAt
```

---

## 🚀 Deployment & Build Info

```bash
Development:
npm run dev          # Start with nodemon (auto-reload)

Production Build:
npm run build        # Build with esbuild
npm run build:prod   # Build minified
npm start:prod       # Run production build

Code Quality:
npm run lint         # Check with ESLint
npm run format       # Format with Prettier

Scripts in package.json:
{
  "dev": "nodemon src/index.js",
  "lint": "eslint .",
  "format": "prettier --write \"**/*.{js,json,md}\"",
  "build": "esbuild src/index.js --bundle --platform=node --target=node20 --outfile=dist/index.js --sourcemap",
  "build:prod": "esbuild src/index.js --bundle --platform=node --target=node20 --outfile=dist/index.js --minify",
  "start:prod": "node dist/index.js"
}
```

---

## 📝 API Documentation

Full API documentation is available via Swagger UI:

```
GET /api-docs
```

Documentation includes:

- All endpoint definitions
- Request/response schemas
- Authentication requirements
- Error responses
- Example payloads

---

## 🎯 Architecture Best Practices

1. **Separation of Concerns**
   - Controllers: Handle HTTP
   - Services: Business logic
   - Repositories: Data access

2. **Middleware Stack**
   - Applied in specific order
   - Reusable across routes

3. **Error Handling**
   - Try-catch in controllers
   - Consistent error format
   - Proper HTTP status codes

4. **Validation**
   - Joi schemas in middleware
   - Input sanitization
   - Type checking

5. **Authentication & Authorization**
   - JWT for stateless auth
   - Role-based access control
   - Resource ownership verification

6. **Code Organization**
   - Feature-based module structure
   - Import path aliases
   - Consistent naming conventions

---

## 📞 Support & Contact

Tài liệu kiến trúc Backend EzyMarket. Để cập nhật hoặc có câu hỏi, vui lòng liên hệ team development.

**Last Updated**: January 2026
