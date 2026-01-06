# EzyMarket Backend - Quick Reference Guide

## 📌 Quick Navigation

| Document                                                           | Purpose                                                           |
| ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)               | 🏗️ Kiến trúc toàn hệ thống, package diagrams, module dependencies |
| [API_ENDPOINTS_DOCUMENTATION.md](./API_ENDPOINTS_DOCUMENTATION.md) | 📡 Chi tiết tất cả API endpoints, request/response examples       |
| [DATA_FLOW_DIAGRAMS.md](./DATA_FLOW_DIAGRAMS.md)                   | 🔄 Luồng dữ liệu, integration flow, security flows                |
| [SWAGGER_GUIDE.md](./SWAGGER_GUIDE.md)                             | 📚 Interactive API documentation (accessible at /api-docs)        |

---

## 🚀 Getting Started

### Installation & Setup

```bash
# Clone repository
git clone <repo-url>
cd EzyMarket

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Environment Variables Required

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ezymarket
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=1h
REFRESH_TOKEN_SECRET=refresh-secret-key
REFRESH_TOKEN_EXPIRATION=7d

# Email Configuration (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SENDER_EMAIL=noreply@ezymarket.com

# UploadThing Configuration
UPLOADTHING_SECRET=your-uploadthing-secret
UPLOADTHING_APP_ID=your-app-id

# Optional: Admin Configuration
ADMIN_EMAIL=admin@ezymarket.com
```

---

## 📦 Core Modules

### 1. Authentication Module 🔐

**Location**: `routes/authRoute.js` | `controllers/authController.js` | `services/authService.js`

**Key Endpoints**:

- `POST /api/user/register` - User registration
- `POST /api/user/login` - User login
- `POST /api/user/verify-email` - Email verification
- `POST /api/user/forgot-password` - Password reset request
- `POST /api/user/reset-password` - Reset password

**Features**:

- JWT-based authentication (Access + Refresh tokens)
- Email verification via OTP
- Password hashing with bcryptjs
- Refresh token rotation

### 2. Group Management 👥

**Location**: `routes/groupRoute.js` | `controllers/groupController.js` | `services/groupService.js`

**Key Endpoints**:

- `POST /api/groups` - Create group
- `GET /api/groups` - List user's groups
- `POST /api/groups/{id}/members` - Add member
- `PUT /api/groups/{id}/members/{userId}` - Update member role
- `DELETE /api/groups/{id}/members/{userId}` - Remove member

**Features**:

- Group creation & management
- Member role-based access (owner, admin, member, viewer)
- Group settings & metadata
- Collaborative workspace

### 3. Ingredients & Units 🥕

**Location**: `routes/ingredientRoute.js` | `routes/unitRoute.js`

**Key Endpoints**:

- `GET/POST /api/ingredients` - List/Create ingredients
- `GET /api/ingredients/search?q=...` - Search ingredients
- `GET/POST /api/units` - List/Create units
- `PUT /api/units/{id}` - Update unit

**Features**:

- Group-specific ingredient catalogs
- Unit conversion support
- Ingredient categorization
- Custom units per group

### 4. Recipe Management 🍳

**Location**: `routes/recipeRoute.js` | `routes/tagRoute.js` | `routes/cookingRoute.js`

**Key Endpoints**:

- `GET/POST /api/recipes` - List/Create recipes
- `GET /api/recipes/search` - Search & filter recipes
- `GET /api/recipes/{id}` - Get recipe details
- `POST /api/recipes/{id}/like` - Like recipe
- `POST /api/recipes/{id}/rate` - Rate & review recipe
- `POST /api/cooking/{recipeId}/steps` - Add cooking steps

**Features**:

- Rich recipe management (ingredients, steps, servings)
- Tagging & categorization
- Ratings & reviews
- Public/private recipes
- Image upload support

### 5. Fridge & Inventory 🧊

**Location**: `routes/fridgeItemRoute.js` | `controllers/fridgeItemController.js`

**Key Endpoints**:

- `GET/POST /api/fridge-items` - List/Add items
- `GET /api/fridge-items/expiring` - Get expiring items
- `PUT /api/fridge-items/{id}` - Update item
- `POST /api/fridge-items/{id}/consume` - Use item
- `DELETE /api/fridge-items/{id}` - Remove item

**Features**:

- Inventory tracking
- Expiry date management
- Location-based organization (fridge, freezer, pantry)
- Notifications for expiring items

### 6. Meal Planning 📅

**Location**: `routes/mealPlanRoute.js` | `controllers/mealPlanController.js`

**Key Endpoints**:

- `GET/POST /api/meal-plans` - List/Create plans
- `POST /api/meal-plans/{id}/meals` - Add meal to plan
- `POST /api/shopping-lists/generate-from-plan` - Auto-generate shopping list

**Features**:

- Weekly/monthly meal planning
- Recipe assignment to dates
- Automatic shopping list generation
- Team meal coordination

### 7. Shopping Lists 🛒

**Location**: `routes/shoppingRoute.js` | `controllers/shoppingController.js`

**Key Endpoints**:

- `GET/POST /api/shopping-lists` - List/Create lists
- `POST /api/shopping-lists/{id}/items` - Add item
- `PUT /api/shopping-lists/{id}/items/{itemId}/purchase` - Mark as purchased
- `PUT /api/shopping-lists/{id}/complete` - Complete list
- `DELETE /api/shopping-lists/{id}` - Delete list

**Features**:

- Manual & auto-generated lists
- Collaborative shopping
- Purchase tracking
- Item notes & cost estimation

### 8. Reports & Analytics 📊

**Location**: `routes/reportRoute.js` | `controllers/reportController.js` | `services/reportService.js`

**Key Endpoints**:

- `GET /api/reports/ingredient-usage` - Usage statistics
- `GET /api/reports/recipe-popularity` - Most used recipes
- `GET /api/reports/shopping-patterns` - Shopping analytics
- `GET /api/reports/inventory` - Inventory overview

**Features**:

- Usage analytics
- Spending tracking
- Recipe popularity
- Inventory insights

### 9. Admin Module 👨‍💼

**Location**: `routes/adminRoute.js`

**Key Features**:

- Admin login & authentication
- User management
- System monitoring
- Content moderation

---

## 🔐 Middleware Stack (Execution Order)

1. **CORS Middleware** - `cors()`
   - Allows cross-origin requests
   - Configurable origins & methods

2. **Body Parser Middleware** - `bodyParser.json()`, `bodyParser.urlencoded()`
   - Parses request body
   - Handles JSON & form data

3. **Route-Specific Middlewares** (in order):
   - **authMiddleware** - JWT verification & user extraction
   - **groupMiddleware** - Group membership verification
   - **ownershipMiddleware** - Resource ownership check
   - **validationMiddleware** - Joi schema validation
   - **unitMiddleware** - Unit-specific validations
   - **shoppingListMiddleware** - Shopping list access control

4. **Controller & Service Execution**
5. **Error Handling & Response**

---

## 📊 Database Schema Quick Reference

### Key Collections

```javascript
// User
{
  _id: ObjectId,
  email: String (unique),
  userName: String (unique),
  password: String (hashed),
  role: "user" | "admin",
  emailVerified: Boolean,
  profile: { name, avatar, bio },
  groups: [ObjectId],
  recipes: [ObjectId]
}

// Group
{
  _id: ObjectId,
  name: String,
  owner: ObjectId(User),
  members: [{userId: ObjectId, role: String}],
  description: String
}

// Recipe
{
  _id: ObjectId,
  title: String,
  owner: ObjectId(User),
  group: ObjectId(Group),
  ingredients: [{ingredient: ObjectId, quantity: Number, unit: ObjectId}],
  cookingSteps: [{stepNumber: Number, description: String}],
  tags: [ObjectId(Tag)],
  servings: Number,
  prepTime: Number,
  cookTime: Number,
  difficulty: String,
  ratings: [{userId: ObjectId, rating: Number, review: String}],
  image: String (URL)
}

// Ingredient
{
  _id: ObjectId,
  name: String,
  category: String,
  unit: ObjectId(Unit),
  group: ObjectId(Group)
}

// Unit
{
  _id: ObjectId,
  name: String (ml, l, g, kg, etc),
  abbreviation: String,
  conversionFactor: Number
}

// FridgeItem
{
  _id: ObjectId,
  ingredient: ObjectId(Ingredient),
  group: ObjectId(Group),
  quantity: Number,
  unit: ObjectId(Unit),
  expiryDate: Date,
  location: "fridge" | "freezer" | "pantry",
  status: "fresh" | "expiring" | "expired"
}

// MealPlan
{
  _id: ObjectId,
  group: ObjectId(Group),
  name: String,
  startDate: Date,
  meals: [{date: Date, mealType: String, recipe: ObjectId, servings: Number}]
}

// Shopping
{
  _id: ObjectId,
  group: ObjectId(Group),
  name: String,
  items: [{ingredient: ObjectId, quantity: Number, unit: ObjectId, isPurchased: Boolean}],
  status: "draft" | "active" | "completed"
}
```

---

## 🔧 Common Development Tasks

### Adding a New Feature

1. **Create Database Schema** (model/)

   ```javascript
   // model/featureRepository.js
   import mongoose from 'mongoose';

   const featureSchema = new mongoose.Schema({
     name: String,
     group: mongoose.ObjectId,
     // ... other fields
   });

   const Feature = mongoose.model('Feature', featureSchema);
   export default Feature;
   ```

2. **Create Service Layer** (services/)

   ```javascript
   // services/featureService.js
   export const createFeature = async (data) => {
     // Business logic here
     return Feature.create(data);
   };
   ```

3. **Create Controller** (controllers/)

   ```javascript
   // controllers/featureController.js
   export const create = async (req, res) => {
     try {
       const result = await featureService.createFeature(req.body);
       res.status(201).json({ success: true, data: result });
     } catch (err) {
       res.status(500).json({ success: false, message: err.message });
     }
   };
   ```

4. **Create Routes** (routes/)

   ```javascript
   // routes/featureRoute.js
   import express from 'express';
   import featureController from '../controllers/featureController.js';

   const router = express.Router();
   router.post('/', authMiddleware, featureController.create);
   router.get('/', authMiddleware, featureController.list);

   export default router;
   ```

5. **Register Routes** (index.js)
   ```javascript
   import featureRoutes from './routes/featureRoute.js';
   app.use('/api/features', featureRoutes);
   ```

### Error Handling Pattern

```javascript
try {
  // Perform operation
  const result = await repository.create(data);
  res.status(201).json({
    success: true,
    message: 'Created successfully',
    data: result,
  });
} catch (err) {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}
```

### Middleware Usage Pattern

```javascript
// Create custom middleware
const myMiddleware = (req, res, next) => {
  // Do something
  req.myData = 'value';
  next(); // Pass to next middleware
};

// Use in route
router.post(
  '/endpoint',
  authMiddleware,
  groupMiddleware,
  myMiddleware,
  validationMiddleware,
  controller.method
);
```

---

## 📈 Performance Tips

1. **Database Indexing**
   - Index frequently queried fields
   - Use compound indexes for common filter combinations
   - Monitor slow queries

2. **API Response Optimization**
   - Use pagination (skip/limit)
   - Populate only necessary fields
   - Cache static data (tags, units)

3. **Validation**
   - Validate early (middleware)
   - Use schema validation (Joi)
   - Check authorization before database queries

4. **Error Handling**
   - Log errors for debugging
   - Return consistent error format
   - Don't expose sensitive error details

---

## 🧪 Testing

### Running Tests

```bash
npm run test
```

### Test Structure

```
tests/
├── auth/
│   ├── register.test.js
│   ├── login.test.js
│   └── emailVerification.test.js
├── recipes/
│   ├── create.test.js
│   ├── search.test.js
│   └── delete.test.js
└── ...
```

---

## 📱 API Client Setup

### JavaScript/Fetch

```javascript
const apiCall = async (endpoint, method = 'GET', data = null) => {
  const token = localStorage.getItem('accessToken');
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  if (data) options.body = JSON.stringify(data);

  const response = await fetch(`http://localhost:5000${endpoint}`, options);
  return response.json();
};

// Usage
const recipes = await apiCall('/api/recipes?groupId=group123');
```

### cURL Examples

```bash
# Get recipes
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/recipes?groupId=group123

# Create recipe
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Pasta","groupId":"group123"}' \
  http://localhost:5000/api/recipes
```

---

## 🚨 Common Issues & Solutions

| Issue                    | Solution                                                   |
| ------------------------ | ---------------------------------------------------------- |
| JWT token invalid        | Ensure token is included in `Authorization: Bearer` header |
| MongoDB connection fails | Check `MONGODB_URI` in `.env` and MongoDB service status   |
| Email not sending        | Verify SMTP credentials and app password (Gmail)           |
| CORS error               | Check CORS configuration and allowed origins               |
| Recipe creation fails    | Verify ingredient & unit IDs exist and belong to group     |
| Unauthorized error (403) | Check group membership and user permissions                |

---

## 📞 Support Resources

- **API Docs**: Available at `GET /api-docs` (Swagger UI)
- **GitHub**: [Repository Link]
- **Issues**: Report bugs & request features
- **Documentation**: See main documents listed above

---

## 📋 Checklist for Deployment

- [ ] Environment variables configured
- [ ] MongoDB connection verified
- [ ] JWT secrets set in production
- [ ] Email service configured
- [ ] File upload (UploadThing) configured
- [ ] CORS settings appropriate for production
- [ ] Error logging enabled
- [ ] Database backups configured
- [ ] Security headers set
- [ ] Rate limiting configured (if applicable)
- [ ] Tests passing
- [ ] Build process successful
- [ ] API documentation updated

---

## 🔗 Quick Links

- **Swagger UI**: `http://localhost:5000/api-docs`
- **GitHub Repository**: [Link]
- **MongoDB Atlas**: [Link]
- **UploadThing Dashboard**: [Link]

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Maintainer**: EzyMarket Development Team
