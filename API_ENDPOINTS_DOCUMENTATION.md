# EzyMarket Backend - Detailed Module Analysis

## 📑 Mục lục

- [Authentication Module](#authentication-module)
- [Group Management](#group-management)
- [Ingredient & Unit System](#ingredient--unit-system)
- [Recipe Management](#recipe-management)
- [Fridge & Inventory](#fridge--inventory)
- [Meal Planning](#meal-planning)
- [Shopping Lists](#shopping-lists)
- [API Response Format](#api-response-format)

---

## 🔐 Authentication Module

### Overview

Xử lý đăng ký, đăng nhập, xác minh email và quản lý phiên làm việc của người dùng.

### File Structure

```
authentication/
├── Route: routes/authRoute.js
├── Controller: controllers/authController.js
├── Service: services/authService.js
├── Email Service: services/verifyEmail.js
├── Utils: utils/otpGenerator.js, utils/sendEmail.js
├── Middleware: middlewares/authMiddleware.js
└── Model: model/userRepository.js
```

### Key Endpoints

#### 1. Register

```http
POST /api/user/register
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "userName": "john_doe",
  "password": "securePassword123"
}

Response (201):
{
  "success": true,
  "message": "User registered successfully. Please verify your email.",
  "userId": "user123"
}
```

#### 2. Send Verification Email

```http
POST /api/user/send-verification-email
Content-Type: application/json

Request:
{
  "email": "user@example.com"
}

Response (200):
{
  "success": true,
  "message": "Verification email sent"
}
```

#### 3. Verify Email

```http
POST /api/user/verify-email
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "otp": "123456"
}

Response (200):
{
  "success": true,
  "message": "Email verified successfully"
}
```

#### 4. Login

```http
POST /api/user/login
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response (200):
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "user123",
    "email": "user@example.com",
    "userName": "john_doe",
    "profile": { ... }
  }
}
```

#### 5. Refresh Token

```http
POST /api/user/refresh-token
Content-Type: application/json

Request:
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response (200):
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 6. Reset Password Request

```http
POST /api/user/forgot-password
Content-Type: application/json

Request:
{
  "email": "user@example.com"
}

Response (200):
{
  "success": true,
  "message": "Password reset OTP sent to email"
}
```

#### 7. Verify Reset Password OTP

```http
POST /api/user/verify-reset-otp
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "otp": "123456"
}

Response (200):
{
  "success": true,
  "resetToken": "resetToken123"
}
```

#### 8. Reset Password

```http
POST /api/user/reset-password
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "newPassword": "newSecurePassword123",
  "resetToken": "resetToken123"
}

Response (200):
{
  "success": true,
  "message": "Password reset successfully"
}
```

### Security Flow

```
User Registration
    ↓
Validate email & password strength
    ↓
Hash password with bcryptjs (10 salt rounds)
    ↓
Create user document in MongoDB
    ↓
Generate OTP
    ↓
Send verification email
    ↓
User clicks email link / enters OTP
    ↓
Mark email as verified
    ↓
User can now login
```

### Constants (authConst.js)

```javascript
OTP_EXPIRATION_MINUTES = 10          // OTP valid for 10 minutes
SAFE_USER_FIELDS = [...]            // Fields safe to return
PUBLIC_USER_FIELDS = [...]           // Public profile fields
JWT_EXPIRATION = '1h'               // Access token lifetime
REFRESH_TOKEN_EXPIRATION = '7d'     // Refresh token lifetime
```

---

## 👥 Group Management

### Overview

Cho phép người dùng tạo và quản lý các nhóm để chia sẻ công thức, thực phẩm và danh sách mua sắm.

### Architecture

```
groupRoute.js
    ↓
groupController.js
    ├─ Middleware: authMiddleware (verify JWT)
    ├─ Middleware: groupMiddleware (verify membership)
    ├─ Middleware: ownershipMiddleware (verify ownership)
    └─ Middleware: validationMiddleware (Joi schema)
    ↓
groupService.js
    ├─ Group business logic
    ├─ Member management
    └─ Permission checking
    ↓
groupRepository.js (Mongoose Model)
    ├─ User references
    ├─ Member array with roles
    └─ Metadata
```

### Key Endpoints

#### 1. Create Group

```http
POST /api/groups
Authorization: Bearer {accessToken}
Content-Type: application/json

Request:
{
  "name": "Family Kitchen",
  "description": "Our family's shared recipes"
}

Response (201):
{
  "_id": "group123",
  "name": "Family Kitchen",
  "owner": "user123",
  "members": [
    {
      "userId": "user123",
      "role": "owner",
      "joinedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### 2. Get Groups

```http
GET /api/groups
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "groups": [
    {
      "_id": "group123",
      "name": "Family Kitchen",
      "owner": "user123",
      "memberCount": 4
    }
  ]
}
```

#### 3. Get Group Details

```http
GET /api/groups/{groupId}
Authorization: Bearer {accessToken}

Response (200):
{
  "_id": "group123",
  "name": "Family Kitchen",
  "owner": "user123",
  "members": [...],
  "description": "Our family's shared recipes",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### 4. Add Member to Group

```http
POST /api/groups/{groupId}/members
Authorization: Bearer {accessToken}
Content-Type: application/json

Request:
{
  "email": "newmember@example.com",
  "role": "member"  // "owner", "member", "viewer"
}

Response (201):
{
  "success": true,
  "message": "Member added successfully"
}
```

#### 5. Update Member Role

```http
PUT /api/groups/{groupId}/members/{userId}
Authorization: Bearer {accessToken}
Content-Type: application/json

Request:
{
  "role": "admin"
}

Response (200):
{
  "success": true,
  "message": "Member role updated"
}
```

#### 6. Remove Member

```http
DELETE /api/groups/{groupId}/members/{userId}
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "message": "Member removed from group"
}
```

#### 7. Leave Group

```http
POST /api/groups/{groupId}/leave
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "message": "You have left the group"
}
```

#### 8. Delete Group

```http
DELETE /api/groups/{groupId}
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "message": "Group deleted successfully"
}
```

### Role-Based Permissions

```
Owner:
├─ Create group
├─ Delete group
├─ Add/Remove members
├─ Change member roles
├─ View all group data
└─ Disband group

Admin:
├─ Add/Remove members
├─ View group data
├─ Manage recipes/ingredients
└─ Cannot delete group

Member:
├─ View group data
├─ Create recipes
├─ Manage ingredients
├─ Create shopping lists
└─ Cannot manage members

Viewer:
└─ View-only access
```

---

## 🥕 Ingredient & Unit System

### Overview

Quản lý danh mục nguyên liệu và đơn vị đo lường cho các công thức nấu ăn.

### Unit Hierarchy

```
Unit (ml, l, g, kg, tbsp, tsp, cup, etc)
    ↓
Ingredient (Milk, Flour, Sugar, etc)
    ├─ Associated Unit
    ├─ Category (dairy, grain, sugar, etc)
    └─ Belongs to Group
```

### Endpoints - Units

#### 1. Create Unit

```http
POST /api/units
Authorization: Bearer {accessToken}
Content-Type: application/json

Request:
{
  "name": "milliliter",
  "abbreviation": "ml",
  "conversionFactor": 1,
  "type": "volume"
}

Response (201):
{
  "_id": "unit123",
  "name": "milliliter",
  "abbreviation": "ml",
  "group": "group123"
}
```

#### 2. Get Units

```http
GET /api/units?groupId={groupId}
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "units": [
    {
      "_id": "unit123",
      "name": "milliliter",
      "abbreviation": "ml"
    }
  ]
}
```

#### 3. Convert Units

```
Conversion Logic:
ml → l: divide by 1000
g → kg: divide by 1000
tbsp → ml: multiply by 15
tsp → ml: multiply by 5
cup → ml: multiply by 240
```

### Endpoints - Ingredients

#### 1. Create Ingredient

```http
POST /api/ingredients
Authorization: Bearer {accessToken}
Content-Type: application/json

Request:
{
  "name": "All-purpose flour",
  "category": "grain",
  "defaultUnit": "unit123",
  "groupId": "group123"
}

Response (201):
{
  "_id": "ingredient123",
  "name": "All-purpose flour",
  "category": "grain",
  "unit": {
    "_id": "unit123",
    "name": "gram",
    "abbreviation": "g"
  },
  "group": "group123"
}
```

#### 2. Search Ingredients

```http
GET /api/ingredients/search?q=flour&groupId={groupId}
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "ingredients": [
    {
      "_id": "ingredient123",
      "name": "All-purpose flour",
      "category": "grain"
    }
  ]
}
```

#### 3. Get Ingredient by Category

```http
GET /api/ingredients?category=grain&groupId={groupId}
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "ingredients": [...]
}
```

#### 4. Update Ingredient

```http
PUT /api/ingredients/{ingredientId}
Authorization: Bearer {accessToken}
Content-Type: application/json

Request:
{
  "name": "Organic all-purpose flour",
  "category": "grain"
}

Response (200):
{
  "success": true,
  "ingredient": {...}
}
```

#### 5. Delete Ingredient

```http
DELETE /api/ingredients/{ingredientId}
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "message": "Ingredient deleted"
}
```

---

## 🍳 Recipe Management

### Overview

Quản lý công thức nấu ăn, bao gồm nguyên liệu, các bước nấu và thẻ phân loại.

### Recipe Structure

```javascript
Recipe {
  _id: ObjectId,
  title: String,
  description: String,
  servings: Number,
  prepTime: Number,          // in minutes
  cookTime: Number,          // in minutes
  difficulty: "easy" | "medium" | "hard",
  group: Reference(Group),
  owner: Reference(User),
  ingredients: [
    {
      ingredient: Reference(Ingredient),
      quantity: Number,
      unit: Reference(Unit)
    }
  ],
  cookingSteps: [
    {
      stepNumber: Number,
      description: String,
      duration: Number        // optional, in minutes
    }
  ],
  tags: [Reference(Tag)],
  image: String,             // URL from UploadThing
  cuisineType: String,       // e.g., "Italian", "Asian"
  likes: [Reference(User)],
  ratings: [{
    userId: Reference(User),
    rating: Number,          // 1-5
    review: String
  }],
  isPublic: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Endpoints - Recipes

#### 1. Create Recipe

```http
POST /api/recipes
Authorization: Bearer {accessToken}
Content-Type: application/json

Request:
{
  "title": "Classic Pasta Carbonara",
  "description": "Authentic Italian pasta recipe",
  "servings": 4,
  "prepTime": 10,
  "cookTime": 20,
  "difficulty": "medium",
  "groupId": "group123",
  "ingredients": [
    {
      "ingredientId": "ingredient123",
      "quantity": 400,
      "unitId": "unit123"
    }
  ],
  "cookingSteps": [
    {
      "stepNumber": 1,
      "description": "Boil pasta",
      "duration": 15
    }
  ],
  "tags": ["tag123", "tag456"],
  "cuisineType": "Italian",
  "isPublic": false
}

Response (201):
{
  "_id": "recipe123",
  "title": "Classic Pasta Carbonara",
  "owner": "user123",
  "group": "group123",
  "ingredients": [...],
  "cookingSteps": [...],
  "tags": [...],
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### 2. Get All Recipes

```http
GET /api/recipes?groupId={groupId}&skip=0&limit=10
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "recipes": [
    {
      "_id": "recipe123",
      "title": "Classic Pasta Carbonara",
      "servings": 4,
      "prepTime": 10,
      "cookTime": 20,
      "difficulty": "medium",
      "owner": { _id, userName, profile },
      "tags": [...]
    }
  ],
  "total": 25,
  "page": 0
}
```

#### 3. Get Recipe Details

```http
GET /api/recipes/{recipeId}
Authorization: Bearer {accessToken}

Response (200):
{
  "_id": "recipe123",
  "title": "Classic Pasta Carbonara",
  "description": "...",
  "servings": 4,
  "prepTime": 10,
  "cookTime": 20,
  "difficulty": "medium",
  "ingredients": [
    {
      "ingredient": {
        "_id": "ingredient123",
        "name": "Pasta",
        "category": "grain"
      },
      "quantity": 400,
      "unit": {
        "_id": "unit123",
        "name": "gram",
        "abbreviation": "g"
      }
    }
  ],
  "cookingSteps": [
    {
      "stepNumber": 1,
      "description": "Boil pasta",
      "duration": 15
    }
  ],
  "tags": [
    {
      "_id": "tag123",
      "name": "Quick & Easy"
    }
  ],
  "owner": {
    "_id": "user123",
    "userName": "john_doe",
    "profile": { ... }
  },
  "likes": 15,
  "averageRating": 4.5
}
```

#### 4. Search Recipes

```http
GET /api/recipes/search?q=pasta&groupId={groupId}&difficulty=easy
Authorization: Bearer {accessToken}

Query Parameters:
- q: Search query (title, description)
- groupId: Filter by group
- difficulty: easy | medium | hard
- cuisineType: Filter by cuisine
- tags: Filter by tags (comma-separated IDs)
- rating: Minimum rating (1-5)

Response (200):
{
  "success": true,
  "recipes": [...]
}
```

#### 5. Like Recipe

```http
POST /api/recipes/{recipeId}/like
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "liked": true,
  "likeCount": 20
}
```

#### 6. Rate Recipe

```http
POST /api/recipes/{recipeId}/rate
Authorization: Bearer {accessToken}
Content-Type: application/json

Request:
{
  "rating": 5,
  "review": "Excellent recipe! Turned out great."
}

Response (201):
{
  "success": true,
  "rating": {
    "rating": 5,
    "review": "Excellent recipe! Turned out great.",
    "userId": "user123"
  },
  "averageRating": 4.7
}
```

#### 7. Update Recipe

```http
PUT /api/recipes/{recipeId}
Authorization: Bearer {accessToken}
Content-Type: application/json

Request: (same structure as create)

Response (200):
{
  "success": true,
  "recipe": {...}
}
```

#### 8. Delete Recipe

```http
DELETE /api/recipes/{recipeId}
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "message": "Recipe deleted"
}
```

### Cooking Steps Management

#### Add Cooking Step

```http
POST /api/cooking/{recipeId}/steps
Authorization: Bearer {accessToken}
Content-Type: application/json

Request:
{
  "stepNumber": 2,
  "description": "Add sauce and simmer",
  "duration": 10
}

Response (201):
{
  "success": true,
  "step": {...}
}
```

### Recipe Tags

#### Get All Tags

```http
GET /api/recipe-tags?groupId={groupId}
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "tags": [
    {
      "_id": "tag123",
      "name": "Quick & Easy"
    }
  ]
}
```

#### Create Tag

```http
POST /api/recipe-tags
Authorization: Bearer {accessToken}
Content-Type: application/json

Request:
{
  "name": "Vegetarian",
  "groupId": "group123"
}

Response (201):
{
  "_id": "tag123",
  "name": "Vegetarian",
  "group": "group123"
}
```

---

## 🧊 Fridge & Inventory

### Overview

Theo dõi các thực phẩm trong tủ lạnh, ngày hết hạn, và quản lý kho dự trữ.

### FridgeItem Structure

```javascript
FridgeItem {
  _id: ObjectId,
  group: Reference(Group),
  ingredient: Reference(Ingredient),
  quantity: Number,
  unit: Reference(Unit),
  expiryDate: Date,
  location: String,           // "fridge", "freezer", "pantry"
  addedBy: Reference(User),
  notes: String,
  status: "fresh" | "soon-to-expire" | "expired",
  createdAt: Date,
  updatedAt: Date
}
```

### Endpoints

#### 1. Add Item to Fridge

```http
POST /api/fridge-items
Authorization: Bearer {accessToken}
Content-Type: application/json

Request:
{
  "groupId": "group123",
  "ingredientId": "ingredient123",
  "quantity": 2,
  "unitId": "unit123",
  "expiryDate": "2024-12-31",
  "location": "fridge",
  "notes": "Half-used package"
}

Response (201):
{
  "_id": "fridgeItem123",
  "ingredient": {
    "_id": "ingredient123",
    "name": "Milk",
    "category": "dairy"
  },
  "quantity": 2,
  "unit": { _id, name, abbreviation },
  "expiryDate": "2024-12-31",
  "location": "fridge",
  "status": "fresh"
}
```

#### 2. Get Fridge Inventory

```http
GET /api/fridge-items?groupId={groupId}&location=fridge
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "items": [
    {
      "_id": "fridgeItem123",
      "ingredient": { ... },
      "quantity": 2,
      "expiryDate": "2024-12-31",
      "status": "fresh"
    }
  ]
}
```

#### 3. Get Expiring Items

```http
GET /api/fridge-items/expiring?groupId={groupId}&days=7
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "expiringItems": [
    {
      "_id": "fridgeItem123",
      "ingredient": { ... },
      "expiryDate": "2024-12-25",
      "daysUntilExpiry": 5,
      "status": "soon-to-expire"
    }
  ]
}
```

#### 4. Update Fridge Item

```http
PUT /api/fridge-items/{fridgeItemId}
Authorization: Bearer {accessToken}
Content-Type: application/json

Request:
{
  "quantity": 1,
  "expiryDate": "2024-12-20"
}

Response (200):
{
  "success": true,
  "item": {...}
}
```

#### 5. Use/Consume Item

```http
POST /api/fridge-items/{fridgeItemId}/consume
Authorization: Bearer {accessToken}
Content-Type: application/json

Request:
{
  "quantityUsed": 0.5
}

Response (200):
{
  "success": true,
  "remainingQuantity": 1.5
}
```

#### 6. Delete Item

```http
DELETE /api/fridge-items/{fridgeItemId}
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "message": "Item removed from fridge"
}
```

---

## 📅 Meal Planning

### Overview

Lên kế hoạch bữa ăn hàng tuần hoặc hàng tháng cho nhóm.

### MealPlan Structure

```javascript
MealPlan {
  _id: ObjectId,
  group: Reference(Group),
  name: String,
  startDate: Date,
  endDate: Date,
  meals: [
    {
      date: Date,
      mealType: "breakfast" | "lunch" | "dinner" | "snack",
      recipe: Reference(Recipe),
      servings: Number,
      assignedTo: [Reference(User)]
    }
  ],
  createdBy: Reference(User),
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Endpoints

#### 1. Create Meal Plan

```http
POST /api/meal-plans
Authorization: Bearer {accessToken}
Content-Type: application/json

Request:
{
  "groupId": "group123",
  "name": "Weekly Plan",
  "startDate": "2024-01-08",
  "endDate": "2024-01-14",
  "meals": [
    {
      "date": "2024-01-08",
      "mealType": "dinner",
      "recipeId": "recipe123",
      "servings": 4
    }
  ]
}

Response (201):
{
  "_id": "mealPlan123",
  "name": "Weekly Plan",
  "meals": [...]
}
```

#### 2. Get Meal Plans

```http
GET /api/meal-plans?groupId={groupId}&startDate=2024-01-08&endDate=2024-01-14
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "mealPlans": [...]
}
```

#### 3. Get Meal Plan Details

```http
GET /api/meal-plans/{mealPlanId}
Authorization: Bearer {accessToken}

Response (200):
{
  "_id": "mealPlan123",
  "name": "Weekly Plan",
  "startDate": "2024-01-08",
  "meals": [
    {
      "date": "2024-01-08",
      "mealType": "dinner",
      "recipe": {
        "_id": "recipe123",
        "title": "Pasta Carbonara",
        "ingredients": [...]
      },
      "servings": 4
    }
  ]
}
```

#### 4. Add Meal to Plan

```http
POST /api/meal-plans/{mealPlanId}/meals
Authorization: Bearer {accessToken}
Content-Type: application/json

Request:
{
  "date": "2024-01-09",
  "mealType": "breakfast",
  "recipeId": "recipe456",
  "servings": 2
}

Response (201):
{
  "success": true,
  "meal": {...}
}
```

#### 5. Auto-Generate Shopping List from Meal Plan

```http
POST /api/shopping-lists/generate-from-plan
Authorization: Bearer {accessToken}
Content-Type: application/json

Request:
{
  "mealPlanId": "mealPlan123",
  "groupId": "group123"
}

Response (201):
{
  "success": true,
  "shoppingList": {
    "_id": "shopping123",
    "items": [
      {
        "ingredient": { ... },
        "quantity": 2000,
        "unit": { ... }
      }
    ]
  }
}
```

---

## 🛒 Shopping Lists

### Overview

Quản lý danh sách mua sắm, theo dõi các mục đã mua, và cộng tác với các thành viên nhóm.

### Shopping Structure

```javascript
Shopping {
  _id: ObjectId,
  group: Reference(Group),
  name: String,
  items: [
    {
      _id: ObjectId,
      ingredient: Reference(Ingredient),
      quantity: Number,
      unit: Reference(Unit),
      isPurchased: Boolean,
      purchasedBy: Reference(User),
      purchasedAt: Date,
      notes: String,
      estimatedCost: Number
    }
  ],
  status: "draft" | "active" | "completed",
  createdBy: Reference(User),
  createdAt: Date,
  updatedAt: Date
}
```

### Endpoints

#### 1. Create Shopping List

```http
POST /api/shopping-lists
Authorization: Bearer {accessToken}
Content-Type: application/json

Request:
{
  "groupId": "group123",
  "name": "Weekly groceries",
  "items": [
    {
      "ingredientId": "ingredient123",
      "quantity": 2,
      "unitId": "unit123",
      "notes": "Organic preferred"
    }
  ]
}

Response (201):
{
  "_id": "shopping123",
  "name": "Weekly groceries",
  "items": [...],
  "status": "draft"
}
```

#### 2. Get Shopping Lists

```http
GET /api/shopping-lists?groupId={groupId}&status=active
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "shoppingLists": [
    {
      "_id": "shopping123",
      "name": "Weekly groceries",
      "itemCount": 15,
      "purchasedCount": 3,
      "status": "active"
    }
  ]
}
```

#### 3. Get Shopping List Details

```http
GET /api/shopping-lists/{shoppingListId}
Authorization: Bearer {accessToken}

Response (200):
{
  "_id": "shopping123",
  "name": "Weekly groceries",
  "items": [
    {
      "_id": "item123",
      "ingredient": { ... },
      "quantity": 2,
      "unit": { ... },
      "isPurchased": false
    }
  ],
  "status": "active"
}
```

#### 4. Add Item to Shopping List

```http
POST /api/shopping-lists/{shoppingListId}/items
Authorization: Bearer {accessToken}
Content-Type: application/json

Request:
{
  "ingredientId": "ingredient456",
  "quantity": 1,
  "unitId": "unit456",
  "notes": "Check expiry"
}

Response (201):
{
  "success": true,
  "item": {...}
}
```

#### 5. Mark Item as Purchased

```http
PUT /api/shopping-lists/{shoppingListId}/items/{itemId}/purchase
Authorization: Bearer {accessToken}
Content-Type: application/json

Request:
{
  "isPurchased": true
}

Response (200):
{
  "success": true,
  "item": {
    "isPurchased": true,
    "purchasedBy": "user123",
    "purchasedAt": "2024-01-08T15:30:00Z"
  }
}
```

#### 6. Remove Item from Shopping List

```http
DELETE /api/shopping-lists/{shoppingListId}/items/{itemId}
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "message": "Item removed"
}
```

#### 7. Mark Shopping List as Complete

```http
PUT /api/shopping-lists/{shoppingListId}/complete
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "message": "Shopping list completed",
  "status": "completed"
}
```

#### 8. Delete Shopping List

```http
DELETE /api/shopping-lists/{shoppingListId}
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "message": "Shopping list deleted"
}
```

---

## 📊 Reports & Analytics

### Overview

Sinh báo cáo về thói quen ăn uống, sử dụng nguyên liệu và xu hướng mua sắm.

### Available Reports

#### 1. Ingredient Usage Report

```http
GET /api/reports/ingredient-usage?groupId={groupId}&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "report": {
    "period": "2024-01-01 to 2024-01-31",
    "ingredients": [
      {
        "ingredient": { ... },
        "timesUsed": 8,
        "totalQuantity": 2000,
        "unit": { ... }
      }
    ]
  }
}
```

#### 2. Recipe Popularity Report

```http
GET /api/reports/recipe-popularity?groupId={groupId}&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "report": {
    "mostCooked": [
      {
        "recipe": { ... },
        "timesCooked": 5,
        "averageRating": 4.8,
        "totalServings": 18
      }
    ]
  }
}
```

#### 3. Shopping Pattern Report

```http
GET /api/reports/shopping-patterns?groupId={groupId}&months=3
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "report": {
    "averageMonthlySpend": 250,
    "topCategories": [
      { "category": "dairy", "totalSpend": 450 }
    ]
  }
}
```

#### 4. Inventory Report

```http
GET /api/reports/inventory?groupId={groupId}
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "report": {
    "totalItems": 45,
    "expiringSoon": 3,
    "byLocation": {
      "fridge": 20,
      "freezer": 15,
      "pantry": 10
    }
  }
}
```

---

## 🎯 API Response Format

### Success Response Format

```javascript
{
  "success": true,
  "message": "Optional success message",
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2024-01-08T10:00:00Z",
    "version": "1.0.0"
  }
}
```

### Error Response Format

```javascript
{
  "success": false,
  "error": "Error code",
  "message": "Detailed error message",
  "details": {
    // Additional error details if applicable
  }
}
```

### Common HTTP Status Codes

```
200 OK                  - Successful GET, PUT
201 Created             - Successful POST
204 No Content          - Successful DELETE
400 Bad Request         - Invalid input
401 Unauthorized        - Missing/invalid JWT token
403 Forbidden           - Insufficient permissions
404 Not Found           - Resource not found
409 Conflict            - Duplicate resource
500 Server Error        - Internal server error
```

### Pagination Format

```javascript
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 0,
    "limit": 10,
    "total": 50,
    "pages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## 📝 Notes

- All endpoints require `Authorization: Bearer {accessToken}` header except authentication endpoints
- Timestamps are in ISO 8601 format
- All IDs are MongoDB ObjectIds
- File uploads use UploadThing service
- Email notifications sent via Nodemailer (configurable)

---

**Last Updated**: January 2026
