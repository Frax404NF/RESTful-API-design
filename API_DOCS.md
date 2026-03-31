# Habit Tracker REST API

> A robust, scalable backend service for tracking daily habits, managing user profiles, and analyzing habit statistics. Built with Node.js, Express, and TypeScript.

---

## Overview
The Habit Tracker API provides endpoints for user registration, authentication, and comprehensive habit management. It is designed with a strong focus on secure data validation and predictable error handling.

## Authentication
All protected routes require a JSON Web Token (JWT) sent in the `Authorization` header.
- **Format:** `Authorization: Bearer <your_token_here>`
- If the token is missing or invalid, the API responds with a `401 Unauthorized` or `403 Forbidden` status.

## Data Responses
Responses follow a predictable structure. Errors will return a standardized JSON format with appropriate HTTP status codes, mapped via a centralized `errorHandler` block:

```json
{
  "error": "Validation Error",
  "details": "Habit name is required" // Automatically injected in 'dev' environment
}
```

---

## Endpoints Specification

### 1. Authentication
Handles user onboarding and session management. Strictly validates credentials formats.

| Method | Endpoint | Use Case | Body Requirements |
| :---: | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Create new user account | `email`, `password` |
| `POST` | `/api/auth/login` | Authenticate & get JWT | `email`, `password` |
| `POST` | `/api/auth/logout` | Invalidate current session | - |
| `POST` | `/api/auth/refresh`| Mint a fresh JWT | - |

### 2. User Management
Endpoints for profile configuration, security settings, and account details. All routes require Authentication.

| Method | Endpoint | Use Case | Body Requirements |
| :---: | :--- | :--- | :--- |
| `GET` | `/api/users/profile` | Retrieve logged-in profile | - |
| `PUT` | `/api/users/profile` | Update profile fields | `email`, `username`, `firstName` (optional) |
| `POST` | `/api/users/change-password` | Update account password | `currentPassword`, `newPassword` |

### 3. Habit Tracking
Core domain logic for creating, scheduling, categorizing, and completing habits. All routes require Authentication.

| Method | Endpoint | Use Case | Body Requirements |
| :---: | :--- | :--- | :--- |
| `GET` | `/api/habits/` | Fetch all user habits | - |
| `POST` | `/api/habits/` | Initialize a new habit | `name`, `frequency` (daily/weekly/monthly) |
| `GET` | `/api/habits/:id` | Fetch specific habit details | - |
| `PUT` | `/api/habits/:id` | Modify an existing habit | `name`, `frequency`, `targetCount`, `isActive` |
| `DELETE`| `/api/habits/:id` | Permanently remove habit | - |
| `POST` | `/api/habits/:id/complete`| Register habit occurrence | `note` (optional string) |
| `GET` | `/api/habits/:id/stats` | Retrieve metrics & streaks| - |
| `POST` | `/api/habits/:id/tags` | Attach categories/tags | `tagIds` (Array of UUIDs) |
| `GET` | `/api/habits/tag/:tagId` | Filter habits by tag | - |

### 4. Tagging System
Categorization system for advanced habit filtering and organization. All routes require Authentication.

| Method | Endpoint | Use Case | Body Requirements |
| :---: | :--- | :--- | :--- |
| `GET` | `/api/tags/` | Fetch all available tags | - |
| `POST` | `/api/tags/` | Create a new tag | `name`, `color` (Hex string) |
| `GET` | `/api/tags/popular` | Retrieve most-used tags | - |
| `GET` | `/api/tags/:id` | Get tag by UUID | - |
| `PUT` | `/api/tags/:id` | Modify tag properties | `name`, `color` (Hex string) |
| `DELETE`| `/api/tags/:id` | Delete categorized tag | - |

---

## Stack Overview
- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Validation:** Zod schemas
- **Authentication:** Custom JWT-based architecture
