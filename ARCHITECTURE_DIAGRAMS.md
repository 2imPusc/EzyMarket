# EzyMarket - Kiến Trúc Hệ Thống (System Architecture)

## 1. Tổng Quan Kiến Trúc Hệ Thống (System Architecture Overview)

```mermaid
graph TB
    subgraph "Client Layer"
        FE[Frontend Application<br/>React/Next.js]
        Mobile[Mobile App<br/>React Native]
    end

    subgraph "API Gateway Layer"
        Express[Express.js Server<br/>Port 5000]
        CORS[CORS Middleware]
        BodyParser[Body Parser]
    end

    subgraph "Presentation Layer"
        Routes[API Routes<br/>/api/*]
        Swagger[Swagger Documentation<br/>/api-docs]
    end

    subgraph "Middleware Layer"
        AuthMW[Authentication<br/>Middleware]
        ValMW[Validation<br/>Middleware]
        GroupMW[Group<br/>Middleware]
        OwnerMW[Ownership<br/>Middleware]
    end

    subgraph "Application Layer"
        Controllers[Controllers<br/>Request Handlers]
    end

    subgraph "Business Logic Layer"
        Services[Services<br/>Business Logic]
    end

    subgraph "Data Access Layer"
        Repos[Repositories<br/>Data Access]
    end

    subgraph "Data Layer"
        MongoDB[(MongoDB<br/>Database)]
    end

    subgraph "External Services"
        Email[Email Service<br/>Nodemailer]
        Upload[UploadThing<br/>File Storage]
    end

    FE --> Express
    Mobile --> Express
    Express --> CORS
    Express --> BodyParser
    Express --> Routes
    Express --> Swagger
    Routes --> AuthMW
    Routes --> ValMW
    Routes --> GroupMW
    Routes --> OwnerMW
    Routes --> Controllers
    Controllers --> Services
    Services --> Repos
    Repos --> MongoDB
    Services --> Email
    Services --> Upload

    style Express fill:#4A90E2
    style MongoDB fill:#47A248
    style Services fill:#F5A623
    style Controllers fill:#D0021B
```

## 2. Kiến Trúc Phân Lớp Chi Tiết (Layered Architecture Detail)

```mermaid
graph LR
    subgraph "Layer 1: Routes"
        R1[Auth Route]
        R2[Recipe Route]
        R3[Meal Plan Route]
        R4[Shopping Route]
        R5[Fridge Item Route]
        R6[Group Route]
        R7[Report Route]
        R8[Admin Route]
        R9[Upload Route]
    end

    subgraph "Layer 2: Controllers"
        C1[Auth Controller]
        C2[Recipe Controller]
        C3[Meal Plan Controller]
        C4[Shopping Controller]
        C5[Fridge Item Controller]
        C6[Group Controller]
        C7[Report Controller]
        C8[Admin Controller]
    end

    subgraph "Layer 3: Services"
        S1[Auth Service]
        S2[Recipe Service]
        S3[Meal Plan Service]
        S4[Shopping Service]
        S5[Fridge Item Service]
        S6[Group Service]
        S7[Report Service]
    end

    subgraph "Layer 4: Repositories"
        Repo1[User Repository]
        Repo2[Recipe Repository]
        Repo3[Meal Plan Repository]
        Repo4[Shopping Repository]
        Repo5[Fridge Item Repository]
        Repo6[Group Repository]
        Repo7[Tag Repository]
        Repo8[Ingredient Repository]
    end

    R1 --> C1
    R2 --> C2
    R3 --> C3
    R4 --> C4
    R5 --> C5
    R6 --> C6
    R7 --> C7
    R8 --> C8

    C1 --> S1
    C2 --> S2
    C3 --> S3
    C4 --> S4
    C5 --> S5
    C6 --> S6
    C7 --> S7

    S1 --> Repo1
    S2 --> Repo2
    S3 --> Repo3
    S4 --> Repo4
    S5 --> Repo5
    S6 --> Repo6
    S2 --> Repo7
    S2 --> Repo8

    style R1 fill:#E8F4F8
    style C1 fill:#FFE8E8
    style S1 fill:#FFF4E6
    style Repo1 fill:#E8F5E9
```

## 3. Luồng Xử Lý Request (Request Flow Diagram)

```mermaid
sequenceDiagram
    participant Client
    participant Express
    participant Route
    participant Middleware
    participant Controller
    participant Service
    participant Repository
    participant MongoDB
    participant External

    Client->>Express: HTTP Request
    Express->>Route: Route Matching
    Route->>Middleware: Authentication Check
    Middleware->>Middleware: Validate Token
    alt Token Invalid
        Middleware-->>Client: 401 Unauthorized
    else Token Valid
        Middleware->>Route: Continue
        Route->>Controller: Call Controller Method
        Controller->>Service: Execute Business Logic
        Service->>Repository: Data Access Request
        Repository->>MongoDB: Database Query
        MongoDB-->>Repository: Query Result
        alt External Service Needed
            Service->>External: Call External API
            External-->>Service: Response
        end
        Repository-->>Service: Data Result
        Service-->>Controller: Business Result
        Controller-->>Route: Response Data
        Route-->>Express: HTTP Response
        Express-->>Client: JSON Response
    end
```

## 4. Cấu Trúc Module và Phụ Thuộc (Module Dependencies)

```mermaid
graph TD
    subgraph "Core Application"
        Index[index.js<br/>Entry Point]
        Config[config/<br/>Configuration]
        Utils[utils/<br/>Utilities]
    end

    subgraph "API Modules"
        Auth[Auth Module]
        Recipe[Recipe Module]
        MealPlan[Meal Plan Module]
        Shopping[Shopping Module]
        Fridge[Fridge Item Module]
        Group[Group Module]
        Report[Report Module]
        Admin[Admin Module]
    end

    subgraph "Shared Components"
        Middleware[middlewares/<br/>Cross-cutting Concerns]
        Constants[constants/<br/>Constants]
    end

    Index --> Config
    Index --> Auth
    Index --> Recipe
    Index --> MealPlan
    Index --> Shopping
    Index --> Fridge
    Index --> Group
    Index --> Report
    Index --> Admin

    Auth --> Middleware
    Recipe --> Middleware
    MealPlan --> Middleware
    Shopping --> Middleware
    Fridge --> Middleware
    Group --> Middleware
    Report --> Middleware
    Admin --> Middleware

    Auth --> Utils
    Recipe --> Utils
    MealPlan --> Utils

    Config --> Utils

    style Index fill:#4A90E2
    style Config fill:#47A248
    style Middleware fill:#F5A623
```

## 5. Kiến Trúc Bảo Mật (Security Architecture)

```mermaid
graph TB
    subgraph "Security Layers"
        JWT[JWT Token<br/>Authentication]
        EmailVer[Email Verification<br/>OTP System]
        RoleBased[Role-Based<br/>Access Control]
        Validation[Input Validation<br/>& Sanitization]
    end

    subgraph "Middleware Chain"
        AuthMW[Auth Middleware<br/>verifyToken]
        AdminMW[Admin Middleware<br/>verifyAdmin]
        OwnerMW[Ownership Middleware<br/>verifyOwnership]
        ValMW[Validation Middleware<br/>validateUser]
    end

    subgraph "Protected Resources"
        UserAPI[User APIs]
        RecipeAPI[Recipe APIs]
        AdminAPI[Admin APIs]
        GroupAPI[Group APIs]
    end

    JWT --> AuthMW
    EmailVer --> AuthMW
    RoleBased --> AdminMW
    RoleBased --> OwnerMW
    Validation --> ValMW

    AuthMW --> UserAPI
    AuthMW --> RecipeAPI
    AuthMW --> GroupAPI
    AdminMW --> AdminAPI
    OwnerMW --> UserAPI
    ValMW --> UserAPI
    ValMW --> RecipeAPI

    style JWT fill:#D0021B
    style EmailVer fill:#F5A623
    style RoleBased fill:#4A90E2
    style Validation fill:#47A248
```

## 6. Kiến Trúc Dữ Liệu (Data Architecture)

```mermaid
erDiagram
    USER ||--o{ RECIPE : creates
    USER ||--o{ MEAL_PLAN : creates
    USER ||--o{ SHOPPING_LIST : creates
    USER ||--o{ FRIDGE_ITEM : owns
    USER }o--|| GROUP : belongs_to
    GROUP ||--o{ USER : contains
    
    RECIPE ||--o{ RECIPE_INGREDIENT : has
    RECIPE ||--o{ RECIPE_TAG : tagged_with
    RECIPE ||--o{ COOKING_SESSION : used_in
    
    INGREDIENT ||--o{ RECIPE_INGREDIENT : used_in
    UNIT ||--o{ RECIPE_INGREDIENT : measures
    
    MEAL_PLAN ||--o{ MEAL_PLAN_ITEM : contains
    MEAL_PLAN_ITEM }o--|| RECIPE : references
    
    SHOPPING_LIST ||--o{ SHOPPING_ITEM : contains
    SHOPPING_ITEM }o--|| INGREDIENT : references
    
    USER {
        string _id PK
        string email
        string userName
        string password
        string role
        boolean emailVerified
        string groupId FK
    }
    
    GROUP {
        string _id PK
        string name
        string adminId FK
    }
    
    RECIPE {
        string _id PK
        string userId FK
        string title
        string description
        array instructions
    }
    
    MEAL_PLAN {
        string _id PK
        string userId FK
        date startDate
        date endDate
    }
    
    SHOPPING_LIST {
        string _id PK
        string userId FK
        string name
        date createdAt
    }
    
    FRIDGE_ITEM {
        string _id PK
        string userId FK
        string ingredientId FK
        number quantity
        date expiryDate
    }
```

## 7. Luồng Xác Thực và Phân Quyền (Authentication & Authorization Flow)

```mermaid
flowchart TD
    Start([Client Request]) --> CheckToken{Token<br/>Present?}
    CheckToken -->|No| Reject1[401 Unauthorized]
    CheckToken -->|Yes| VerifyToken[Verify JWT Token]
    VerifyToken --> TokenValid{Token<br/>Valid?}
    TokenValid -->|No| Reject2[403 Forbidden]
    TokenValid -->|Yes| CheckEmail{Email<br/>Verified?}
    CheckEmail -->|No| Reject3[403 Email Not Verified]
    CheckEmail -->|Yes| CheckRole{Check<br/>Role}
    CheckRole -->|Admin| AdminAccess[Admin Access]
    CheckRole -->|User| CheckOwnership{Ownership<br/>Check}
    CheckOwnership -->|Owner| OwnerAccess[Owner Access]
    CheckOwnership -->|Not Owner| Reject4[403 Forbidden]
    AdminAccess --> Allow[Allow Request]
    OwnerAccess --> Allow
    Allow --> Process[Process Request]
    
    style Reject1 fill:#FF6B6B
    style Reject2 fill:#FF6B6B
    style Reject3 fill:#FF6B6B
    style Reject4 fill:#FF6B6B
    style Allow fill:#51CF66
    style Process fill:#4DABF7
```

## 8. Kiến Trúc Tích Hợp Dịch Vụ Bên Ngoài (External Services Integration)

```mermaid
graph LR
    subgraph "EzyMarket Backend"
        App[Express Application]
        AuthSvc[Auth Service]
        RecipeSvc[Recipe Service]
        UploadSvc[Upload Service]
    end

    subgraph "External Services"
        EmailSvc[Email Service<br/>Nodemailer<br/>SMTP]
        FileSvc[File Storage<br/>UploadThing<br/>CDN]
        DB[(MongoDB<br/>Atlas/Cloud)]
    end

    App --> AuthSvc
    AuthSvc --> EmailSvc
    AuthSvc --> DB
    App --> RecipeSvc
    RecipeSvc --> DB
    App --> UploadSvc
    UploadSvc --> FileSvc

    style EmailSvc fill:#F5A623
    style FileSvc fill:#4A90E2
    style DB fill:#47A248
```

## 9. Kiến Trúc API Endpoints (API Endpoints Architecture)

```mermaid
mindmap
  root((EzyMarket API))
    Authentication
      POST /api/user/register
      POST /api/user/login
      POST /api/user/verify-email
      POST /api/user/refresh-token
      GET /api/user/profile
    Recipes
      GET /api/recipes
      POST /api/recipes
      GET /api/recipes/:id
      PUT /api/recipes/:id
      DELETE /api/recipes/:id
    Meal Plans
      GET /api/meal-plans
      POST /api/meal-plans
      PUT /api/meal-plans/:id
      DELETE /api/meal-plans/:id
    Shopping Lists
      GET /api/shopping-lists
      POST /api/shopping-lists
      PUT /api/shopping-lists/:id
      DELETE /api/shopping-lists/:id
    Fridge Items
      GET /api/fridge-items
      POST /api/fridge-items
      PUT /api/fridge-items/:id
      DELETE /api/fridge-items/:id
    Groups
      GET /api/groups
      POST /api/groups
      PUT /api/groups/:id
    Reports
      GET /api/reports/analytics
      GET /api/reports/expenses
    Admin
      GET /api/admin/users
      PUT /api/admin/users/:id
    Upload
      POST /api/uploadthing
```

## 10. Kiến Trúc Deployment (Deployment Architecture)

```mermaid
graph TB
    subgraph "Client Side"
        Web[Web Browser]
        MobileApp[Mobile App]
    end

    subgraph "Load Balancer / Reverse Proxy"
        LB[Load Balancer<br/>Nginx/Cloudflare]
    end

    subgraph "Application Server"
        Node1[Node.js Instance 1<br/>Port 5000]
        Node2[Node.js Instance 2<br/>Port 5000]
    end

    subgraph "Database Cluster"
        MongoPrimary[(MongoDB Primary)]
        MongoSecondary[(MongoDB Secondary)]
    end

    subgraph "External Services"
        EmailProvider[Email Provider<br/>SMTP]
        StorageProvider[File Storage<br/>UploadThing]
    end

    subgraph "Monitoring & Logging"
        Logs[Application Logs]
        Monitor[Monitoring Tools]
    end

    Web --> LB
    MobileApp --> LB
    LB --> Node1
    LB --> Node2
    Node1 --> MongoPrimary
    Node2 --> MongoPrimary
    MongoPrimary --> MongoSecondary
    Node1 --> EmailProvider
    Node2 --> EmailProvider
    Node1 --> StorageProvider
    Node2 --> StorageProvider
    Node1 --> Logs
    Node2 --> Logs
    Logs --> Monitor

    style LB fill:#4A90E2
    style MongoPrimary fill:#47A248
    style Node1 fill:#F5A623
    style Node2 fill:#F5A623
```

---

## Hướng Dẫn Sử Dụng

Các sơ đồ Mermaid trên có thể được sử dụng trong:

1. **Tài liệu báo cáo**: Copy mã Mermaid vào file Markdown hoặc tài liệu hỗ trợ Mermaid
2. **GitHub/GitLab**: Tự động render Mermaid trong README.md hoặc documentation
3. **Notion/Confluence**: Hỗ trợ Mermaid diagrams
4. **Mermaid Live Editor**: https://mermaid.live để preview và export

### Các Sơ Đồ Chính:

- **Sơ đồ 1**: Tổng quan kiến trúc hệ thống - cho cái nhìn tổng thể
- **Sơ đồ 2**: Kiến trúc phân lớp - chi tiết các module
- **Sơ đồ 3**: Luồng xử lý request - sequence diagram
- **Sơ đồ 4**: Cấu trúc module - dependencies
- **Sơ đồ 5**: Kiến trúc bảo mật - security layers
- **Sơ đồ 6**: Kiến trúc dữ liệu - ER diagram
- **Sơ đồ 7**: Luồng xác thực - authentication flow
- **Sơ đồ 8**: Tích hợp dịch vụ bên ngoài
- **Sơ đồ 9**: API endpoints - mindmap
- **Sơ đồ 10**: Kiến trúc deployment
- **Sơ đồ 11**: Module Dependencies - Sơ đồ phụ thuộc module (Layout tối ưu)

## 11. Module Dependencies - Sơ Đồ Phụ Thuộc Module (Layout Tối Ưu)

```mermaid
graph TB
    subgraph "Core & Authentication"
        User["👤 User Module<br/>Core Entity"]
        Auth["🔐 Auth Module<br/>Authentication"]
    end

    subgraph "Group Management"
        Group["👥 Group Module<br/>Group Management"]
    end

    subgraph "Recipe System"
        Recipe["🍳 Recipe Module<br/>Recipe Management"]
        Tag["🏷️ Tag Module<br/>Recipe Tags"]
        Cook["👨‍🍳 Cooking Module<br/>Cooking Steps"]
    end

    subgraph "Ingredient System"
        Ingredient["🥕 Ingredient Module<br/>Ingredients"]
        Unit["📏 Unit Module<br/>Units of Measure"]
    end

    subgraph "Planning & Tracking"
        MealPlan["📅 Meal Plan Module<br/>Meal Planning"]
        Fridge["❄️ Fridge Module<br/>Fridge Items"]
        ShoppingList["🛒 Shopping List Module<br/>Shopping Lists"]
    end

    subgraph "Analytics"
        Report["📊 Report Module<br/>Reports & Analytics"]
    end

    %% Core dependencies
    Auth -->|requires| User
    Group -->|manages| User
    User -->|belongs to| Group

    %% Recipe system dependencies
    Recipe -->|created by| User
    Recipe -->|has many| Ingredient
    Recipe -->|uses| Cook
    Recipe -->|tagged with| Tag
    Ingredient -->|measured in| Unit

    %% Planning dependencies
    MealPlan -->|belongs to| User
    MealPlan -->|belongs to| Group
    MealPlan -->|contains| Recipe
    MealPlan -->|contains| Ingredient
    MealPlan -->|uses| Cook
    MealPlan -->|creates| Fridge

    %% Fridge dependencies
    Fridge -->|belongs to| User
    Fridge -->|belongs to| Group
    Fridge -->|tracks| Ingredient
    Fridge -->|measured in| Unit

    %% Shopping list dependencies
    ShoppingList -->|belongs to| User
    ShoppingList -->|belongs to| Group
    ShoppingList -->|generated from| MealPlan
    ShoppingList -->|contains| Ingredient
    ShoppingList -->|uses| Unit
    ShoppingList -->|checks| Fridge

    %% Report dependencies
    Report -->|analyzes| Group
    Report -->|uses| ShoppingList
    Report -->|uses| MealPlan
    Report -->|uses| Fridge
    Report -->|uses| Recipe

    %% Styling
    style User fill:#99ccff,stroke:#0066cc,stroke-width:3px
    style Auth fill:#ff9999,stroke:#cc0000,stroke-width:2px
    style Group fill:#99ff99,stroke:#00cc00,stroke-width:2px
    style Recipe fill:#ffcc99,stroke:#cc6600,stroke-width:2px
    style Ingredient fill:#cc99ff,stroke:#6600cc,stroke-width:2px
    style Unit fill:#ff99ff,stroke:#cc00cc,stroke-width:2px
    style Fridge fill:#99ffcc,stroke:#00cc99,stroke-width:2px
    style MealPlan fill:#ffff99,stroke:#cccc00,stroke-width:2px
    style ShoppingList fill:#99ffff,stroke:#00cccc,stroke-width:2px
    style Report fill:#ffccff,stroke:#cc00cc,stroke-width:2px
    style Tag fill:#ccffff,stroke:#00cccc,stroke-width:2px
    style Cook fill:#ffffcc,stroke:#cccc00,stroke-width:2px
```

## 12. Module Dependencies - Sơ Đồ Phụ Thuộc Module (Dạng Flowchart)

```mermaid
flowchart TD
    subgraph Layer1["Layer 1: Core Foundation"]
        User["👤 User<br/>Core Entity"]
    end

    subgraph Layer2["Layer 2: Authentication & Organization"]
        Auth["🔐 Auth<br/>Authentication"]
        Group["👥 Group<br/>Organization"]
    end

    subgraph Layer3["Layer 3: Base Data"]
        Ingredient["🥕 Ingredient<br/>Base Data"]
        Unit["📏 Unit<br/>Measurement"]
        Tag["🏷️ Tag<br/>Categorization"]
    end

    subgraph Layer4["Layer 4: Recipe System"]
        Recipe["🍳 Recipe<br/>Recipe Management"]
        Cook["👨‍🍳 Cooking<br/>Cooking Steps"]
    end

    subgraph Layer5["Layer 5: Planning & Management"]
        MealPlan["📅 Meal Plan<br/>Meal Planning"]
        Fridge["❄️ Fridge<br/>Inventory"]
        ShoppingList["🛒 Shopping List<br/>Shopping"]
    end

    subgraph Layer6["Layer 6: Analytics"]
        Report["📊 Report<br/>Analytics"]
    end

    %% Layer 1 to Layer 2
    User --> Auth
    User --> Group

    %% Layer 2 to Layer 3
    Auth -.->|validates| User
    Group -.->|manages| User

    %% Layer 3 to Layer 4
    Ingredient --> Recipe
    Unit --> Recipe
    Tag --> Recipe
    Recipe --> Cook

    %% Layer 4 to Layer 5
    Recipe --> MealPlan
    Ingredient --> MealPlan
    MealPlan --> ShoppingList
    MealPlan --> Fridge
    Ingredient --> Fridge
    Unit --> Fridge
    Ingredient --> ShoppingList
    Unit --> ShoppingList
    Fridge -.->|checks| ShoppingList

    %% Layer 5 to Layer 6
    MealPlan --> Report
    ShoppingList --> Report
    Fridge --> Report
    Recipe --> Report
    Group --> Report

    %% User connections to all layers
    User -.->|creates| Recipe
    User -.->|owns| MealPlan
    User -.->|owns| Fridge
    User -.->|owns| ShoppingList
    Group -.->|shares| MealPlan
    Group -.->|shares| Fridge
    Group -.->|shares| ShoppingList

    style User fill:#99ccff,stroke:#0066cc,stroke-width:3px
    style Auth fill:#ff9999,stroke:#cc0000,stroke-width:2px
    style Group fill:#99ff99,stroke:#00cc00,stroke-width:2px
    style Recipe fill:#ffcc99,stroke:#cc6600,stroke-width:2px
    style Ingredient fill:#cc99ff,stroke:#6600cc,stroke-width:2px
    style Unit fill:#ff99ff,stroke:#cc00cc,stroke-width:2px
    style Fridge fill:#99ffcc,stroke:#00cc99,stroke-width:2px
    style MealPlan fill:#ffff99,stroke:#cccc00,stroke-width:2px
    style ShoppingList fill:#99ffff,stroke:#00cccc,stroke-width:2px
    style Report fill:#ffccff,stroke:#cc00cc,stroke-width:2px
    style Tag fill:#ccffff,stroke:#00cccc,stroke-width:2px
    style Cook fill:#ffffcc,stroke:#cccc00,stroke-width:2px
```

