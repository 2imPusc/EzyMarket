# EzyMarket - Module Dependencies Diagram

## Sơ Đồ Phụ Thuộc Module (Layout Tối Ưu - Không Rối Đường)

Sơ đồ này mô tả mối quan hệ và phụ thuộc giữa các module trong hệ thống EzyMarket với layout được tối ưu để tránh đường nối chéo nhau.

### Phiên Bản 1: Layout Nhóm Module (Recommended)

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

### Phiên Bản 2: Layout Phân Lớp (Layered Architecture)

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

### Phiên Bản 3: Layout Đơn Giản (Compact)

```mermaid
graph LR
    subgraph Core["Core"]
        User[👤 User]
        Auth[🔐 Auth]
    end

    subgraph Org["Organization"]
        Group[👥 Group]
    end

    subgraph Base["Base Data"]
        Ingredient[🥕 Ingredient]
        Unit[📏 Unit]
        Tag[🏷️ Tag]
    end

    subgraph RecipeSys["Recipe System"]
        Recipe[🍳 Recipe]
        Cook[👨‍🍳 Cooking]
    end

    subgraph Planning["Planning"]
        MealPlan[📅 Meal Plan]
        Fridge[❄️ Fridge]
        ShoppingList[🛒 Shopping]
    end

    subgraph Analytics["Analytics"]
        Report[📊 Report]
    end

    User --> Auth
    User --> Group
    Group --> User
    Auth --> User

    Ingredient --> Recipe
    Unit --> Recipe
    Tag --> Recipe
    Recipe --> Cook
    User --> Recipe

    Recipe --> MealPlan
    Ingredient --> MealPlan
    User --> MealPlan
    Group --> MealPlan

    MealPlan --> ShoppingList
    Ingredient --> ShoppingList
    Unit --> ShoppingList
    User --> ShoppingList
    Group --> ShoppingList
    Fridge --> ShoppingList

    Ingredient --> Fridge
    Unit --> Fridge
    User --> Fridge
    Group --> Fridge
    MealPlan --> Fridge

    MealPlan --> Report
    ShoppingList --> Report
    Fridge --> Report
    Recipe --> Report
    Group --> Report

    style User fill:#99ccff
    style Auth fill:#ff9999
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

## Mô Tả Các Phụ Thuộc

### Core Dependencies
- **Auth → User**: Module xác thực yêu cầu User module
- **Group → User**: Module nhóm quản lý người dùng
- **User → Group**: Người dùng thuộc về nhóm

### Recipe System Dependencies
- **Recipe → User**: Công thức được tạo bởi người dùng
- **Recipe → Ingredient**: Công thức chứa nhiều nguyên liệu
- **Recipe → Cook**: Công thức sử dụng các bước nấu
- **Recipe → Tag**: Công thức được gắn thẻ
- **Ingredient → Unit**: Nguyên liệu được đo bằng đơn vị

### Planning Dependencies
- **MealPlan → User/Group**: Kế hoạch bữa ăn thuộc về người dùng/nhóm
- **MealPlan → Recipe**: Kế hoạch chứa công thức
- **MealPlan → Ingredient**: Kế hoạch chứa nguyên liệu
- **MealPlan → Cook**: Kế hoạch sử dụng các bước nấu
- **MealPlan → Fridge**: Kế hoạch tạo ra các món đã nấu trong tủ lạnh

### Fridge Dependencies
- **Fridge → User/Group**: Tủ lạnh thuộc về người dùng/nhóm
- **Fridge → Ingredient**: Tủ lạnh theo dõi nguyên liệu
- **Fridge → Unit**: Tủ lạnh sử dụng đơn vị đo

### Shopping List Dependencies
- **ShoppingList → User/Group**: Danh sách mua sắm thuộc về người dùng/nhóm
- **ShoppingList → MealPlan**: Danh sách được tạo từ kế hoạch bữa ăn
- **ShoppingList → Ingredient**: Danh sách chứa nguyên liệu
- **ShoppingList → Unit**: Danh sách sử dụng đơn vị đo
- **ShoppingList → Fridge**: Danh sách kiểm tra tủ lạnh để tránh mua trùng

### Report Dependencies
- **Report → Group**: Báo cáo phân tích nhóm
- **Report → ShoppingList**: Báo cáo sử dụng danh sách mua sắm
- **Report → MealPlan**: Báo cáo sử dụng kế hoạch bữa ăn
- **Report → Fridge**: Báo cáo sử dụng dữ liệu tủ lạnh
- **Report → Recipe**: Báo cáo sử dụng dữ liệu công thức

## Hướng Dẫn Sử Dụng

1. **Copy mã Mermaid** từ bất kỳ phiên bản nào phù hợp với nhu cầu
2. **Paste vào**:
   - File Markdown (README.md, documentation)
   - GitHub/GitLab (tự động render)
   - Mermaid Live Editor: https://mermaid.live
   - Notion, Confluence (hỗ trợ Mermaid)
3. **Export** sang PNG/SVG từ Mermaid Live Editor nếu cần

## Khuyến Nghị

- **Phiên bản 1** (Layout Nhóm Module): Tốt nhất cho tài liệu báo cáo, dễ đọc và hiểu
- **Phiên bản 2** (Layout Phân Lớp): Tốt cho giải thích kiến trúc phân lớp
- **Phiên bản 3** (Layout Đơn Giản): Tốt cho slide presentation, compact và gọn


