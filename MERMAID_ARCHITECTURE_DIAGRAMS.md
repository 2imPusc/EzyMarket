# EzyMarket System Architecture - Mermaid Diagrams

Tài liệu này cung cấp mã Mermaid để vẽ các biểu đồ kiến trúc toàn hệ thống. Sao chép mã Mermaid vào [Mermaid Live Editor](https://mermaid.live) hoặc các công cụ hỗ trợ Mermaid khác.

---

## 1. Kiến Trúc Tổng Quan (System Overview)

```mermaid
graph TB
    subgraph Client["👥 Clients"]
        FE["Frontend (React/React Native)"]
        Admin["Admin Panel"]
    end

    subgraph API["🔌 API Gateway & Middleware"]
        Express["Express.js Server"]
        CORS["CORS Middleware"]
        Auth["Auth Middleware"]
        Validate["Validation Middleware"]
    end

    subgraph Services["⚙️ Business Logic Layer"]
        AuthSvc["Auth Service"]
        UserSvc["User Service"]
        RecipeSvc["Recipe Service"]
        GroupSvc["Group Service"]
        FridgeSvc["Fridge Service"]
        MealSvc["Meal Plan Service"]
        ShoppingList["Shopping List Service"]
        ReportSvc["Report Service"]
    end

    subgraph Data["💾 Data Layer"]
        MongoDB["MongoDB Database"]
        Cache["Redis Cache (Optional)"]
    end

    subgraph External["🌐 External Services"]
        Email["Nodemailer"]
        FileUpload["UploadThing"]
        JWT["JWT Auth"]
    end

    FE -->|HTTP/REST| Express
    Admin -->|HTTP/REST| Express

    Express --> CORS
    CORS --> Auth
    Auth --> Validate
    Validate --> AuthSvc
    Validate --> UserSvc
    Validate --> RecipeSvc
    Validate --> GroupSvc
    Validate --> FridgeSvc
    Validate --> MealSvc
    Validate --> ShoppingList
    Validate --> ReportSvc

    AuthSvc --> JWT
    AuthSvc --> Email

    AuthSvc --> MongoDB
    UserSvc --> MongoDB
    RecipeSvc --> MongoDB
    GroupSvc --> MongoDB
    FridgeSvc --> MongoDB
    MealSvc --> MongoDB
    ShoppingList --> MongoDB
    ReportSvc --> MongoDB

    RecipeSvc --> FileUpload
    UserSvc --> Cache

    style Client fill:#e1f5ff
    style API fill:#fff3e0
    style Services fill:#f3e5f5
    style Data fill:#e8f5e9
    style External fill:#fce4ec
```

---

## 2. 3-Layer Architecture (Kiến Trúc 3 Tầng)

```mermaid
graph LR
    subgraph Client["Client Layer"]
        REQ["HTTP Requests"]
    end

    subgraph Presentation["📤 Presentation Layer"]
        subgraph Routes["Routes"]
            AuthRoute["authRoute.js"]
            GroupRoute["groupRoute.js"]
            RecipeRoute["recipeRoute.js"]
            IngredientRoute["ingredientRoute.js"]
            UnitRoute["unitRoute.js"]
            FridgeRoute["fridgeItemRoute.js"]
            MealRoute["mealPlanRoute.js"]
            ShoppingRoute["shoppingRoute.js"]
            ReportRoute["reportRoute.js"]
            TagRoute["tagRoute.js"]
        end

        subgraph Controllers["Controllers"]
            AuthCtrl["authController.js"]
            GroupCtrl["groupController.js"]
            RecipeCtrl["recipeController.js"]
            IngredientCtrl["ingredientController.js"]
            UnitCtrl["unitController.js"]
            FridgeCtrl["fridgeItemController.js"]
            MealCtrl["mealPlanController.js"]
            ShoppingCtrl["shoppingController.js"]
            ReportCtrl["reportController.js"]
            TagCtrl["tagController.js"]
        end
    end

    subgraph Business["💼 Business Logic Layer"]
        subgraph BusinessServices["Services"]
            AuthSvc["authService.js"]
            GroupSvc["groupService.js"]
            RecipeSvc["recipeService.js"]
            IngredientSvc["ingredientService.js"]
            UnitSvc["unitService.js"]
            FridgeSvc["fridgeItemService.js"]
            MealSvc["mealPlanService.js"]
            ShoppingListSvc["shoppingListService.js"]
            ReportSvc["reportService.js"]
            TagSvc["tagService.js"]
        end

        subgraph Utilities["Utilities"]
            Helper["Helper Functions"]
            Validation["Validation Rules"]
            Constants["Constants"]
        end
    end

    subgraph Data["💾 Data Access Layer"]
        subgraph Repositories["Repositories/Models"]
            UserRepo["userRepository.js"]
            GroupRepo["groupRepository.js"]
            RecipeRepo["recipeRepository.js"]
            IngredientRepo["ingredientRepository.js"]
            UnitRepo["unitRepository.js"]
            FridgeRepo["fridgeItemRepository.js"]
            MealRepo["mealPlanRepository.js"]
            ShoppingRepo["shoppingListRepository.js"]
            TagRepo["tagRepository.js"]
        end

        subgraph Database["Database"]
            MongoDB["🍃 MongoDB"]
        end
    end

    Client --> REQ
    REQ --> Routes
    Routes --> Controllers
    Controllers --> BusinessServices
    BusinessServices --> Repositories
    Repositories --> Database

    Controllers --> Utilities
    BusinessServices --> Utilities

    style Client fill:#e1f5ff
    style Presentation fill:#fff3e0
    style Business fill:#f3e5f5
    style Data fill:#e8f5e9
```

---

## 3. Module Dependencies (Các Module Phụ Thuộc)

```mermaid
graph TB
    User["👤 User Module"]
    Auth["🔐 Auth Module"]
    Group["👥 Group Module"]
    Recipe["🍳 Recipe Module"]
    Ingredient["🥕 Ingredient Module"]
    Unit["📏 Unit Module"]
    Fridge["❄️ Fridge Module"]
    MealPlan["📅 Meal Plan Module"]
    ShoppingList["🛒 Shopping List Module"]
    Report["📊 Report Module"]
    Tag["🏷️ Tag Module"]
    Cook["👨‍🍳 Cooking Steps Module"]

    Auth -->|requires| User
    Group -->|manages| User
    Recipe -->|created by| User
    Recipe -->|has many| Ingredient
    Recipe -->|has many| Cook
    Recipe -->|tagged with| Tag
    Ingredient -->|measured in| Unit
    Fridge -->|tracks items| Ingredient
    Fridge -->|belongs to| Group
    MealPlan -->|contains| Recipe
    MealPlan -->|belongs to| Group
    ShoppingList -->|generated from| MealPlan
    ShoppingList -->|contains| Ingredient
    ShoppingList -->|belongs to| Group
    Report -->|analyzes| Group
    Report -->|uses| ShoppingList
    Report -->|uses| MealPlan
    Tag -->|categorizes| Recipe

    style Auth fill:#ff9999
    style User fill:#99ccff
    style Group fill:#99ff99
    style Recipe fill:#ffcc99
    style Ingredient fill:#cc99ff
    style Unit fill:#ff99ff
    style Fridge fill:#99ffcc
    style MealPlan fill:#ffff99
    style ShoppingList fill:#99ffff
    style Report fill:#ffccff
    style Tag fill:#ccffff
    style Cook fill:#ffffcc
```

---

## 4. Request/Response Flow (Luồng Yêu Cầu & Phản Hồi)

```mermaid
sequenceDiagram
    participant Client as Frontend/Mobile
    participant Route as Route Handler
    participant Middleware as Middleware Stack
    participant Controller as Controller
    participant Service as Service
    participant Repository as Repository
    participant DB as MongoDB

    Client->>Route: HTTP Request
    Route->>Middleware: Validate Request
    Middleware->>Middleware: Auth Check
    Middleware->>Middleware: Group Access Check
    Middleware->>Middleware: Input Validation (Joi)
    Middleware->>Controller: Proceed

    Controller->>Service: Call Service Method
    Service->>Repository: Query Data
    Repository->>DB: MongoDB Query
    DB-->>Repository: Return Data
    Repository-->>Service: Processed Data
    Service-->>Controller: Business Logic Result

    Controller-->>Client: JSON Response
    Client->>Client: Render Data
```

---

## 5. Authentication & Security Flow (Luồng Xác Thực & Bảo Mật)

```mermaid
graph TB
    subgraph Auth["🔐 Authentication Flow"]
        Register["1. User Registration"]
        Verify["2. Email Verification"]
        Login["3. Login"]
        TokenGen["4. Generate JWT Tokens"]
        Access["5. Access with Token"]
        Refresh["6. Refresh Token"]
    end

    subgraph Security["🛡️ Security Layers"]
        HashPass["Password Hashing<br/>bcryptjs (10 rounds)"]
        JWTSign["JWT Signing<br/>HS256"]
        CORS["CORS Policy"]
        RateLimit["Rate Limiting"]
        InputValid["Input Validation<br/>Joi Schemas"]
        RBAC["Role-Based<br/>Access Control"]
    end

    subgraph Storage["💾 Token Storage"]
        AccessToken["Access Token<br/>(1 hour)"]
        RefreshToken["Refresh Token<br/>(7 days)"]
        SecureHttpOnly["Secure + HttpOnly"]
    end

    Register --> HashPass
    HashPass --> Verify
    Verify --> Login
    Login --> TokenGen
    TokenGen --> AccessToken
    TokenGen --> RefreshToken
    AccessToken --> SecureHttpOnly
    RefreshToken --> SecureHttpOnly
    SecureHttpOnly --> Access
    Access --> RBAC
    Access --> InputValid
    Access --> CORS
    Refresh --> TokenGen

    TokenGen --> JWTSign

    style Auth fill:#ffcccc
    style Security fill:#ccffcc
    style Storage fill:#ccccff
```

---

## 6. Database Schema & Relationships (Sơ Đồ Cơ Sở Dữ Liệu)

```mermaid
erDiagram
    USERS ||--o{ GROUPS : creates
    USERS ||--o{ RECIPES : creates
    USERS ||--o{ FRINGE_ITEMS : owns
    USERS ||--o{ MEAL_PLANS : creates

    GROUPS ||--o{ GROUP_MEMBERS : has
    GROUPS ||--o{ FRIDGE_ITEMS : has
    GROUPS ||--o{ MEAL_PLANS : has
    GROUPS ||--o{ SHOPPING_LISTS : has

    RECIPES ||--o{ INGREDIENTS : contains
    RECIPES ||--o{ COOKING_STEPS : has
    RECIPES ||--o{ RECIPE_TAGS : has

    INGREDIENTS ||--o{ UNITS : "measured in"
    INGREDIENTS ||--o{ FRIDGE_ITEMS : "tracked as"
    INGREDIENTS ||--o{ SHOPPING_LIST_ITEMS : contains

    MEAL_PLANS ||--o{ MEAL_PLAN_ITEMS : has
    MEAL_PLAN_ITEMS ||--o{ RECIPES : contains

    SHOPPING_LISTS ||--o{ SHOPPING_LIST_ITEMS : has
    SHOPPING_LIST_ITEMS ||--o{ INGREDIENTS : contains

    TAGS ||--o{ RECIPES : categorizes

    USERS {
        string _id
        string email
        string username
        string passwordHash
        boolean emailVerified
        date createdAt
    }

    GROUPS {
        string _id
        string name
        string description
        string owner
        date createdAt
    }

    RECIPES {
        string _id
        string title
        string createdBy
        array ingredients
        array cookingSteps
        integer servings
        integer cookTime
        date createdAt
    }

    INGREDIENTS {
        string _id
        string name
        string category
        float calories
        string defaultUnit
        date createdAt
    }

    MEAL_PLANS {
        string _id
        string groupId
        date startDate
        date endDate
        array meals
        date createdAt
    }

    SHOPPING_LISTS {
        string _id
        string groupId
        date createdDate
        array items
        boolean completed
        date completedAt
    }
```

---

## 7. File Structure & Module Organization

```mermaid
graph TB
    Root["ezymarket-be"]

    Config["config/"]
    Controllers["controllers/"]
    Middlewares["middlewares/"]
    Models["model/"]
    Routes["routes/"]
    Services["services/"]
    Utils["utils/"]

    Root --> Config
    Root --> Controllers
    Root --> Middlewares
    Root --> Models
    Root --> Routes
    Root --> Services
    Root --> Utils
    Root --> index.js

    Config --> DB["db.js"]
    Config --> Auth["authConst.js"]
    Config --> Swagger["swagger.js"]
    Config --> Upload["uploadthing.js"]

    Controllers --> AuthCtrl["authController.js"]
    Controllers --> GroupCtrl["groupController.js"]
    Controllers --> RecipeCtrl["recipeController.js"]
    Controllers --> IngredientCtrl["ingredientController.js"]
    Controllers --> UnitCtrl["unitController.js"]
    Controllers --> FridgeCtrl["fridgeItemController.js"]
    Controllers --> MealCtrl["mealPlanController.js"]
    Controllers --> ShoppingCtrl["shoppingController.js"]
    Controllers --> ReportCtrl["reportController.js"]
    Controllers --> TagCtrl["tagController.js"]
    Controllers --> CookCtrl["cookingController.js"]

    Middlewares --> AuthMw["authMiddleware.js"]
    Middlewares --> GroupMw["groupMiddleware.js"]
    Middlewares --> OwnerMw["ownershipMiddleware.js"]
    Middlewares --> ValidMw["validationMiddleware.js"]
    Middlewares --> ShoppingMw["shoppingListMiddleware.js"]
    Middlewares --> UnitMw["unitMiddleware.js"]

    Models --> UserModel["userRepository.js"]
    Models --> GroupModel["groupRepository.js"]
    Models --> RecipeModel["recipeRepository.js"]
    Models --> IngredientModel["ingredientRepository.js"]
    Models --> UnitModel["unitRepository.js"]
    Models --> FridgeModel["fridgeItemRepository.js"]
    Models --> MealModel["mealPlanRepository.js"]
    Models --> ShoppingModel["shoppingListRepository.js"]
    Models --> TagModel["tagRepository.js"]

    Routes --> AuthRoute["authRoute.js"]
    Routes --> GroupRoute["groupRoute.js"]
    Routes --> RecipeRoute["recipeRoute.js"]
    Routes --> IngredientRoute["ingredientRoute.js"]
    Routes --> UnitRoute["unitRoute.js"]
    Routes --> FridgeRoute["fridgeItemRoute.js"]
    Routes --> MealRoute["mealPlanRoute.js"]
    Routes --> ShoppingRoute["shoppingRoute.js"]
    Routes --> ReportRoute["reportRoute.js"]
    Routes --> TagRoute["tagRoute.js"]
    Routes --> UploadRoute["upload.routes.js"]

    Services --> AuthSvc["authService.js"]
    Services --> GroupSvc["groupService.js"]
    Services --> RecipeSvc["recipeService.js"]
    Services --> IngredientSvc["ingredientService.js"]
    Services --> UnitSvc["unitService.js"]
    Services --> FridgeSvc["fridgeItemService.js"]
    Services --> MealSvc["mealPlanService.js"]
    Services --> ShoppingListSvc["shoppingListService.js"]
    Services --> ReportSvc["reportService.js"]
    Services --> TagSvc["tagService.js"]
    Services --> EmailService["verifyEmail.js"]

    Utils --> Helper["helperFunctions.js"]
    Utils --> Constant["constants.js"]
    Utils --> Error["errorHandler.js"]

    style Root fill:#e3f2fd
    style Config fill:#fff3e0
    style Controllers fill:#f3e5f5
    style Middlewares fill:#fce4ec
    style Models fill:#e8f5e9
    style Routes fill:#f1f8e9
    style Services fill:#ede7f6
    style Utils fill:#e0f2f1
```

---

## 8. API Endpoint Hierarchy (Cấu Trúc API)

```mermaid
graph TB
    API["/ - API Root"]

    Auth["/api/auth"]
    AuthLogin["/api/auth/login"]
    AuthRegister["/api/auth/register"]
    AuthVerify["/api/auth/verify"]
    AuthRefresh["/api/auth/refresh"]
    AuthLogout["/api/auth/logout"]
    AuthPasswordReset["/api/auth/password-reset"]

    Users["/api/users"]
    UserProfile["/api/users/profile"]
    UserUpdate["/api/users/:id"]

    Groups["/api/groups"]
    GroupList["/api/groups"]
    GroupCreate["/api/groups"]
    GroupDetail["/api/groups/:id"]
    GroupUpdate["/api/groups/:id"]
    GroupDelete["/api/groups/:id"]
    GroupMembers["/api/groups/:id/members"]

    Recipes["/api/recipes"]
    RecipeList["/api/recipes"]
    RecipeCreate["/api/recipes"]
    RecipeDetail["/api/recipes/:id"]
    RecipeSearch["/api/recipes/search"]

    Ingredients["/api/ingredients"]
    IngredientList["/api/ingredients"]
    IngredientCreate["/api/ingredients"]

    Units["/api/units"]
    UnitList["/api/units"]

    Fridge["/api/fridge"]
    FridgeList["/api/fridge"]
    FridgeAdd["/api/fridge/add"]
    FridgeUpdate["/api/fridge/:id"]

    Meals["/api/meals"]
    MealList["/api/meals"]
    MealCreate["/api/meals"]

    Shopping["/api/shopping"]
    ShoppingList["/api/shopping"]
    ShoppingCreate["/api/shopping"]
    ShoppingItem["/api/shopping/:id/items"]

    Reports["/api/reports"]
    ReportStats["/api/reports/stats"]

    API --> Auth
    Auth --> AuthLogin
    Auth --> AuthRegister
    Auth --> AuthVerify
    Auth --> AuthRefresh
    Auth --> AuthLogout
    Auth --> AuthPasswordReset

    API --> Users
    Users --> UserProfile
    Users --> UserUpdate

    API --> Groups
    Groups --> GroupList
    Groups --> GroupCreate
    Groups --> GroupDetail
    Groups --> GroupUpdate
    Groups --> GroupDelete
    Groups --> GroupMembers

    API --> Recipes
    Recipes --> RecipeList
    Recipes --> RecipeCreate
    Recipes --> RecipeDetail
    Recipes --> RecipeSearch

    API --> Ingredients
    Ingredients --> IngredientList
    Ingredients --> IngredientCreate

    API --> Units
    Units --> UnitList

    API --> Fridge
    Fridge --> FridgeList
    Fridge --> FridgeAdd
    Fridge --> FridgeUpdate

    API --> Meals
    Meals --> MealList
    Meals --> MealCreate

    API --> Shopping
    Shopping --> ShoppingList
    Shopping --> ShoppingCreate
    Shopping --> ShoppingItem

    API --> Reports
    Reports --> ReportStats

    style API fill:#bbdefb
    style Auth fill:#ffccbc
    style Users fill:#c8e6c9
    style Groups fill:#f8bbd0
    style Recipes fill:#ffe0b2
    style Ingredients fill:#dcedc8
    style Units fill:#b2dfdb
    style Fridge fill:#e1bee7
    style Meals fill:#f0f4c3
    style Shopping fill:#d1c4e9
    style Reports fill:#ffcccc
```

---

## 9. Data Processing Pipeline (Quy Trình Xử Lý Dữ Liệu)

```mermaid
graph LR
    Request["📥 HTTP Request"]
    Parse["Parse Body"]
    ValidInput["Validate Input"]
    AuthUser["Authenticate User"]
    CheckGroup["Check Group Access"]
    CheckOwner["Check Ownership"]
    Process["Business Logic"]
    QueryDB["Query Database"]
    Transform["Transform Data"]
    Response["Format Response"]
    Send["📤 Send Response"]

    Error["❌ Error Handler"]

    Request --> Parse
    Parse --> ValidInput
    ValidInput -->|Invalid| Error
    ValidInput -->|Valid| AuthUser
    AuthUser -->|Invalid| Error
    AuthUser -->|Valid| CheckGroup
    CheckGroup -->|No Access| Error
    CheckGroup -->|Has Access| CheckOwner
    CheckOwner -->|No Ownership| Error
    CheckOwner -->|Owner| Process

    Process --> QueryDB
    QueryDB --> Transform
    Transform --> Response
    Response --> Send

    Error --> Send

    style Request fill:#c3e9ff
    style Parse fill:#bbdefb
    style ValidInput fill:#90caf9
    style AuthUser fill:#64b5f6
    style CheckGroup fill:#42a5f5
    style CheckOwner fill:#2196f3
    style Process fill:#1e88e5
    style QueryDB fill:#1976d2
    style Transform fill:#1565c0
    style Response fill:#0d47a1
    style Send fill:#c3e9ff
    style Error fill:#ffcccc
```

---

## 10. Deployment Architecture (Kiến Trúc Triển Khai)

```mermaid
graph TB
    subgraph Local["Local Development"]
        LocalNode["Node.js Dev Server<br/>:5000"]
        LocalMongo["MongoDB Local<br/>:27017"]
        LocalEnv[".env.local"]
    end

    subgraph Staging["Staging Environment"]
        StagingNode["Node.js Server<br/>Ubuntu VM"]
        StagingMongo["MongoDB Staging<br/>Atlas"]
        StagingEnv[".env.staging"]
        StagingMonitor["Monitoring<br/>& Logs"]
    end

    subgraph Production["Production Environment"]
        ProdNode["Node.js Cluster<br/>Docker/PM2"]
        ProdMongo["MongoDB Production<br/>Atlas"]
        ProdEnv[".env.production"]
        CDN["CDN<br/>UploadThing"]
        Monitor["Monitoring<br/>NewRelic/Datadog"]
        Backup["Automated<br/>Backup"]
    end

    LocalNode --> LocalMongo
    LocalEnv -.-> LocalNode

    LocalNode -.->|git push| StagingNode
    StagingNode --> StagingMongo
    StagingEnv -.-> StagingNode
    StagingNode -.->|PR approved| ProdNode

    ProdNode --> ProdMongo
    ProdEnv -.-> ProdNode
    ProdNode --> CDN
    ProdMongo --> Backup
    ProdNode --> Monitor

    style Local fill:#e8f5e9
    style Staging fill:#fff3e0
    style Production fill:#ffebee
```

---

## Hướng Dẫn Sử Dụng Mermaid

### Option 1: Mermaid Live Editor

1. Truy cập [https://mermaid.live](https://mermaid.live)
2. Sao chép mã Mermaid từ bên dưới
3. Dán vào editor
4. Chỉnh sửa và xuất hình ảnh

### Option 2: VS Code Extension

```bash
# Cài đặt Markdown Preview Mermaid Support
# Extension ID: bierner.markdown-mermaid
```

### Option 3: GitHub/GitLab Markdown

Sao chép code block vào markdown file - tự động render!

```mermaid
graph TB
  A[Example]
  B[Diagram]
  A --> B
```

### Option 4: Notion Integration

- Notion hỗ trợ mermaid trực tiếp
- Sao chép code vào code block

---

## Tài Liệu Tham Khảo

- [Mermaid Documentation](https://mermaid.js.org/)
- [EzyMarket Backend Architecture](./BACKEND_ARCHITECTURE.md)
- [API Endpoints](./API_ENDPOINTS_DOCUMENTATION.md)
- [Data Flow Diagrams](./DATA_FLOW_DIAGRAMS.md)

---

**Cập nhật lần cuối**: Tháng 1 năm 2026
