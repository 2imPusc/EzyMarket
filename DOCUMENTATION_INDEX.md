# 📚 EzyMarket Backend Documentation Index

## 🎯 Choose Your Path

Tùy theo nhu cầu của bạn, hãy chọn tài liệu phù hợp:

### 👨‍💻 For Developers Starting Out

1. Start with [README.md](./README.md) - Quick overview & setup
2. Read [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Quick guide for common tasks
3. Check [SWAGGER_GUIDE.md](./SWAGGER_GUIDE.md) - Interactive API testing

### 🏗️ For Understanding Architecture

1. Read [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) - Complete architecture overview
2. Study [DATA_FLOW_DIAGRAMS.md](./DATA_FLOW_DIAGRAMS.md) - See how data flows through the system
3. Review [API_ENDPOINTS_DOCUMENTATION.md](./API_ENDPOINTS_DOCUMENTATION.md) - API structure

### 🔌 For API Integration

1. Check [API_ENDPOINTS_DOCUMENTATION.md](./API_ENDPOINTS_DOCUMENTATION.md) - All endpoint details
2. Use [SWAGGER_GUIDE.md](./SWAGGER_GUIDE.md) - Test endpoints live at `/api-docs`
3. Reference code examples in [QUICK_REFERENCE.md](./QUICK_REFERENCE.md#-api-client-setup)

### 🔐 For Security Understanding

1. Read Security Layers in [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md#-security-layers)
2. Study Security Data Flow in [DATA_FLOW_DIAGRAMS.md](./DATA_FLOW_DIAGRAMS.md#-security-data-flow)
3. Review JWT & Middleware in [API_ENDPOINTS_DOCUMENTATION.md](./API_ENDPOINTS_DOCUMENTATION.md#-authentication-module)

### 🚀 For Deployment

1. Check Deployment section in [README.md](./README.md#-deployment)
2. Review Environment Configuration in [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
3. Use Deployment Checklist in [QUICK_REFERENCE.md](./QUICK_REFERENCE.md#-checklist-for-deployment)

### 🆕 For Adding New Features

1. Review [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md#-module-dependencies-map) - Understand module structure
2. Follow pattern in [QUICK_REFERENCE.md](./QUICK_REFERENCE.md#adding-a-new-feature)
3. Reference similar module in [API_ENDPOINTS_DOCUMENTATION.md](./API_ENDPOINTS_DOCUMENTATION.md)

---

## 📋 Complete Documentation List

### Core Documentation Files

#### 1. **README.md** - Project Overview

- 🎯 **Purpose**: Main entry point for the project
- 📖 **Contains**:
  - Project description & quick start
  - Architecture overview diagram
  - Main modules summary
  - Project structure
  - Dependencies list
  - Environment configuration
  - Deployment instructions

#### 2. **BACKEND_ARCHITECTURE.md** - Complete Architecture Guide

- 🎯 **Purpose**: Deep dive into system design
- 📖 **Contains**:
  - Tổng quan kiến trúc 3-layer
  - Package diagrams cho mỗi module (Auth, Groups, Recipes, etc)
  - Cross-cutting concerns (Middleware)
  - Module responsibilities (Controllers, Services, Repositories)
  - Luồng dữ liệu cơ bản
  - Cấu trúc thư mục chi tiết
  - Dependencies overview
  - Module dependencies map
  - Security layers explanation
  - Database schema relationships
  - Deployment & build info
  - Architecture best practices

#### 3. **API_ENDPOINTS_DOCUMENTATION.md** - Complete API Reference

- 🎯 **Purpose**: Detailed API documentation
- 📖 **Contains**:
  - Authentication module (Register, Login, Verify Email, Reset Password)
  - User management endpoints
  - Group management endpoints
  - Ingredient & Unit system endpoints
  - Recipe management endpoints
  - Fridge & inventory endpoints
  - Meal planning endpoints
  - Shopping lists endpoints
  - Reports & analytics endpoints
  - Admin module endpoints
  - Full request/response examples
  - Error handling formats
  - HTTP status codes
  - Pagination format

#### 4. **DATA_FLOW_DIAGRAMS.md** - System Flows & Integration

- 🎯 **Purpose**: Visual representation of data flows
- 📖 **Contains**:
  - User registration & email verification flow
  - Login & token generation flow
  - Recipe creation flow (nested data)
  - Shopping list generation from meal plan flow
  - External service integrations (Email, File Upload)
  - Database relationships diagram
  - Security data flow & JWT verification
  - Caching & performance considerations
  - Monitoring & logging strategies

#### 5. **QUICK_REFERENCE.md** - Developer Quick Guide

- 🎯 **Purpose**: Fast lookup for common tasks
- 📖 **Contains**:
  - Navigation guide & links
  - Installation & setup
  - Core modules quick summary
  - Middleware stack explanation
  - Database schema quick reference
  - Common development tasks
  - Error handling patterns
  - Middleware usage patterns
  - Performance tips
  - Testing structure
  - API client examples (Fetch, cURL)
  - Troubleshooting guide
  - Common issues & solutions
  - Deployment checklist

#### 6. **SWAGGER_GUIDE.md** - Interactive API Docs

- 🎯 **Purpose**: Live API testing & documentation
- 📖 **Contains**:
  - Swagger/OpenAPI setup
  - How to access `/api-docs`
  - Testing endpoints in Swagger UI
  - Authentication in Swagger
  - Example requests & responses

---

## 🗺️ Documentation Map by Topic

### Authentication & Security

- 🔐 Credentials & JWT: [API_ENDPOINTS_DOCUMENTATION.md - Auth Module](./API_ENDPOINTS_DOCUMENTATION.md#-authentication-module)
- 🔑 JWT Flow: [DATA_FLOW_DIAGRAMS.md - Login Flow](./DATA_FLOW_DIAGRAMS.md#2-login--token-generation-flow)
- 🛡️ Security Layers: [BACKEND_ARCHITECTURE.md - Security](./BACKEND_ARCHITECTURE.md#-security-layers)
- 🚨 Token Verification: [DATA_FLOW_DIAGRAMS.md - Security Data Flow](./DATA_FLOW_DIAGRAMS.md#-security-data-flow)

### Module-Specific Guides

| Module         | Main Doc                                                                      | Examples             | Flow                                                                                      |
| -------------- | ----------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------- |
| Authentication | [API_ENDPOINTS.md](./API_ENDPOINTS_DOCUMENTATION.md#-authentication-module)   | Login, Register      | [DATA_FLOW.md](./DATA_FLOW_DIAGRAMS.md#1-user-registration--email-verification-flow)      |
| Groups         | [API_ENDPOINTS.md](./API_ENDPOINTS_DOCUMENTATION.md#-group-management)        | CRUD, Members        | [BACKEND_ARCH.md](./BACKEND_ARCHITECTURE.md#-package-dependencies---chi-tiết-theo-module) |
| Recipes        | [API_ENDPOINTS.md](./API_ENDPOINTS_DOCUMENTATION.md#-recipe-management)       | Create, Search, Rate | [DATA_FLOW.md](./DATA_FLOW_DIAGRAMS.md#3-recipe-creation-with-nested-data-flow)           |
| Shopping       | [API_ENDPOINTS.md](./API_ENDPOINTS_DOCUMENTATION.md#-shopping-lists)          | Create, Generate     | [DATA_FLOW.md](./DATA_FLOW_DIAGRAMS.md#4-shopping-list-generation-from-meal-plan)         |
| Ingredients    | [API_ENDPOINTS.md](./API_ENDPOINTS_DOCUMENTATION.md#-ingredient--unit-system) | CRUD, Search         | [BACKEND_ARCH.md](./BACKEND_ARCHITECTURE.md)                                              |
| Fridge         | [API_ENDPOINTS.md](./API_ENDPOINTS_DOCUMENTATION.md#-fridge--inventory)       | Tracking, Expiry     | [QUICK_REF.md](./QUICK_REFERENCE.md#5-fridge--inventory-)                                 |
| Meals          | [API_ENDPOINTS.md](./API_ENDPOINTS_DOCUMENTATION.md#-meal-planning)           | Plan, Assign         | [QUICK_REF.md](./QUICK_REFERENCE.md#6-meal-planning-)                                     |
| Reports        | [API_ENDPOINTS.md](./API_ENDPOINTS_DOCUMENTATION.md#-reports--analytics)      | Analytics            | [QUICK_REF.md](./QUICK_REFERENCE.md)                                                      |

### Database & Data

- 📊 Schema Design: [BACKEND_ARCHITECTURE.md - Database Schema](./BACKEND_ARCHITECTURE.md#-database-schema-relationships)
- 🔗 Relationships: [DATA_FLOW_DIAGRAMS.md - Database Diagram](./DATA_FLOW_DIAGRAMS.md#-database-relationships-diagram)
- 🗂️ Collections: [QUICK_REFERENCE.md - Database](./QUICK_REFERENCE.md#-database-schema-quick-reference)

### API & Integration

- 🔌 All Endpoints: [API_ENDPOINTS_DOCUMENTATION.md](./API_ENDPOINTS_DOCUMENTATION.md)
- 📱 Client Examples: [QUICK_REFERENCE.md - API Client](./QUICK_REFERENCE.md#-api-client-setup)
- 🌐 External Services: [DATA_FLOW_DIAGRAMS.md - Integrations](./DATA_FLOW_DIAGRAMS.md#-external-service-integrations)
- 🧪 Testing: [QUICK_REFERENCE.md - Testing](./QUICK_REFERENCE.md#-testing)

### Development & Deployment

- 🚀 Setup: [README.md - Quick Start](./README.md#-quick-start)
- 🛠️ Development: [QUICK_REFERENCE.md - Getting Started](./QUICK_REFERENCE.md#-getting-started)
- 📦 Build & Deploy: [README.md - Deployment](./README.md#-deployment)
- ✅ Checklist: [QUICK_REFERENCE.md - Checklist](./QUICK_REFERENCE.md#-checklist-for-deployment)

### Troubleshooting & Support

- 🐛 Common Issues: [QUICK_REFERENCE.md - Troubleshooting](./QUICK_REFERENCE.md#-common-issues--solutions)
- ❓ FAQ: [README.md - Troubleshooting](./README.md#-troubleshooting)
- 📝 Code Standards: [README.md - Standards](./README.md#-code-standards)

---

## 🎓 Learning Paths

### Path 1: Complete Beginner (1-2 hours)

```
1. Read: README.md (15 min)
   └─ Get project overview

2. Read: QUICK_REFERENCE.md - Getting Started (15 min)
   └─ Setup development environment

3. Read: BACKEND_ARCHITECTURE.md - Overview (20 min)
   └─ Understand 3-layer architecture

4. Read: QUICK_REFERENCE.md - Core Modules (15 min)
   └─ Learn about each module

5. Access: http://localhost:5000/api-docs (15 min)
   └─ Explore API in Swagger UI

6. Read: QUICK_REFERENCE.md - Common Tasks (20 min)
   └─ Learn how to add features
```

### Path 2: API Integration (30-45 minutes)

```
1. Read: API_ENDPOINTS_DOCUMENTATION.md - Overview (10 min)
   └─ Get API structure

2. Read: API_ENDPOINTS_DOCUMENTATION.md - Auth Module (10 min)
   └─ Understand authentication

3. Access: SWAGGER_GUIDE.md (5 min)
   └─ Learn how to test APIs

4. Read: QUICK_REFERENCE.md - API Client Setup (10 min)
   └─ See code examples

5. Test: http://localhost:5000/api-docs (10 min)
   └─ Try endpoints yourself
```

### Path 3: Architecture Deep Dive (1-2 hours)

```
1. Read: BACKEND_ARCHITECTURE.md (30 min)
   └─ Complete architecture overview

2. Study: DATA_FLOW_DIAGRAMS.md - All flows (30 min)
   └─ Understand data movement

3. Read: BACKEND_ARCHITECTURE.md - Security (15 min)
   └─ Learn security implementation

4. Review: BACKEND_ARCHITECTURE.md - Database (10 min)
   └─ Understand schema design
```

### Path 4: Add New Feature (1-3 hours)

```
1. Read: QUICK_REFERENCE.md - Adding Feature (10 min)
   └─ Get development pattern

2. Study: Similar module in API_ENDPOINTS_DOCUMENTATION.md (15 min)
   └─ Understand structure

3. Review: BACKEND_ARCHITECTURE.md - Module Structure (10 min)
   └─ Follow naming conventions

4. Code: Implement feature following pattern
   └─ Controller → Service → Repository
```

---

## 🔍 Finding Specific Information

**Looking for...** → **Check this file**

- Endpoint reference → [API_ENDPOINTS_DOCUMENTATION.md](./API_ENDPOINTS_DOCUMENTATION.md)
- How data flows → [DATA_FLOW_DIAGRAMS.md](./DATA_FLOW_DIAGRAMS.md)
- System architecture → [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)
- Setup instructions → [README.md](./README.md) or [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
- Quick answers → [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
- Test API live → [SWAGGER_GUIDE.md](./SWAGGER_GUIDE.md) or `/api-docs`
- Code examples → [QUICK_REFERENCE.md](./QUICK_REFERENCE.md#-api-client-setup)
- Database schema → [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md#-database-schema-relationships)
- Security info → [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md#-security-layers)
- Deployment → [README.md](./README.md#-deployment) or [QUICK_REFERENCE.md](./QUICK_REFERENCE.md#-checklist-for-deployment)
- Troubleshooting → [QUICK_REFERENCE.md](./QUICK_REFERENCE.md#-common-issues--solutions)

---

## 📊 Documentation Statistics

| File                           | Lines     | Focus Areas                           | Read Time      |
| ------------------------------ | --------- | ------------------------------------- | -------------- |
| README.md                      | ~450      | Overview, Setup, Quick Summary        | 15-20 min      |
| BACKEND_ARCHITECTURE.md        | ~1200     | System Design, Packages, Architecture | 30-45 min      |
| API_ENDPOINTS_DOCUMENTATION.md | ~1500     | Detailed API, Endpoints, Examples     | 45-60 min      |
| DATA_FLOW_DIAGRAMS.md          | ~900      | Flows, Integration, Security          | 30-40 min      |
| QUICK_REFERENCE.md             | ~700      | Quick Tips, Tasks, Setup              | 20-30 min      |
| **TOTAL**                      | **~4750** | **Complete Reference**                | **~3-4 hours** |

---

## 🎯 By Role

### Backend Developer

Start with: [README.md](./README.md) → [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) → [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

### Frontend Developer

Start with: [API_ENDPOINTS_DOCUMENTATION.md](./API_ENDPOINTS_DOCUMENTATION.md) → [SWAGGER_GUIDE.md](./SWAGGER_GUIDE.md) → [QUICK_REFERENCE.md](./QUICK_REFERENCE.md#-api-client-setup)

### DevOps/DevSecOps

Start with: [README.md](./README.md#-deployment) → [QUICK_REFERENCE.md](./QUICK_REFERENCE.md#-checklist-for-deployment) → [DATA_FLOW_DIAGRAMS.md](./DATA_FLOW_DIAGRAMS.md#-security-data-flow)

### Project Manager/Architect

Start with: [README.md](./README.md) → [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md#-tổng-quan-kiến-trúc) → [DATA_FLOW_DIAGRAMS.md](./DATA_FLOW_DIAGRAMS.md)

### Quality Assurance/Tester

Start with: [API_ENDPOINTS_DOCUMENTATION.md](./API_ENDPOINTS_DOCUMENTATION.md) → [SWAGGER_GUIDE.md](./SWAGGER_GUIDE.md) → [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

---

## 🔗 Quick Links

| Resource         | Link                                                               |
| ---------------- | ------------------------------------------------------------------ |
| 📖 Main README   | [README.md](./README.md)                                           |
| 🏗️ Architecture  | [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)               |
| 📡 API Reference | [API_ENDPOINTS_DOCUMENTATION.md](./API_ENDPOINTS_DOCUMENTATION.md) |
| 🔄 Data Flows    | [DATA_FLOW_DIAGRAMS.md](./DATA_FLOW_DIAGRAMS.md)                   |
| ⚡ Quick Guide   | [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)                         |
| 📚 Swagger UI    | `http://localhost:5000/api-docs`                                   |
| 🐙 GitHub        | [Repository Link]                                                  |
| 📝 Swagger Guide | [SWAGGER_GUIDE.md](./SWAGGER_GUIDE.md)                             |

---

## ✨ Tips for Using This Documentation

1. **Use the search function** (Ctrl+F / Cmd+F) to find specific topics
2. **Click links** in documents to navigate between related sections
3. **Start with your role** section above
4. **Reference multiple files** for complete understanding
5. **Keep SWAGGER_GUIDE open** while coding for live API testing
6. **Bookmark important sections** for quick access

---

## 📞 Getting Help

1. **Search documentation** - Most questions are answered
2. **Check QUICK_REFERENCE.md** - Fastest answers
3. **Review code examples** - See patterns in action
4. **Test in Swagger** - Try endpoints interactively
5. **Check error messages** - Often describe the issue

---

## 🔄 Documentation Updates

- ✅ Latest version: January 2026
- 📝 All files updated and synchronized
- 🎯 Examples tested and verified
- 📊 Diagrams are ASCII-based (no external dependencies)

---

**Happy coding! 🚀**

For questions or contributions, refer to the main README.md
