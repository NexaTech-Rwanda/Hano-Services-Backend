# HanoServices API Documentation

Base URL: `http://localhost:3000/api`

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## 1. Authentication Endpoints

### Register User
**POST** `/auth/register`

Register a new user (customer, provider, or admin).

**Request Body:**
```json
{
  "phone": "+250788123456",
  "role": "provider",
  "email": "user@example.com",  // optional
  "password": "password123"     // optional
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "accessToken": "jwt_token_here",
    "user": {
      "id": "uuid",
      "phone": "+250788123456",
      "email": "user@example.com",
      "role": "provider",
      "isPhoneVerified": false
    }
  }
}
```

### Send OTP
**POST** `/auth/send-otp`

Send OTP for phone verification.

**Request Body:**
```json
{
  "phone": "+250788123456"
}
```

### Verify OTP
**POST** `/auth/verify-otp`

Verify phone number with OTP.

**Request Body:**
```json
{
  "phone": "+250788123456",
  "code": "123456"
}
```

### Login with Password
**POST** `/auth/login`

**Request Body:**
```json
{
  "phone": "+250788123456",
  "password": "password123"
}
```

### Login with OTP
**POST** `/auth/login-otp`

**Request Body:**
```json
{
  "phone": "+250788123456",
  "code": "123456"
}
```

### Reset Password
**POST** `/auth/reset-password`

**Request Body:**
```json
{
  "phone": "+250788123456",
  "newPassword": "newpassword123"
}
```

---

## 2. Service Categories

### Get All Categories
**GET** `/categories`

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "Plumbing",
      "description": "Plumbing services and repairs",
      "icon": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Get Category by ID
**GET** `/categories/:id`

### Create Category (Admin Only)
**POST** `/categories`

**Request Body:**
```json
{
  "name": "New Category",
  "description": "Category description",
  "icon": "icon-url"
}
```

### Update Category (Admin Only)
**PUT** `/categories/:id`

### Delete Category (Admin Only)
**DELETE** `/categories/:id`

---

## 3. Provider Management

### Create Provider Profile
**POST** `/providers`

**Authentication:** Required (Provider role)

**Request Body:**
```json
{
  "name": "John Doe",
  "serviceCategoryId": "uuid",
  "photo": "https://example.com/photo.jpg",
  "priceRangeMin": 5000,
  "priceRangeMax": 15000,
  "yearsOfExperience": 5,
  "latitude": -1.9441,
  "longitude": 30.0619,
  "address": "Kigali, Rwanda"
}
```

### Get Provider by ID
**GET** `/providers/:id`

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "name": "John Doe",
    "photo": "https://example.com/photo.jpg",
    "serviceCategoryId": "uuid",
    "categoryName": "Plumbing",
    "priceRangeMin": 5000,
    "priceRangeMax": 15000,
    "yearsOfExperience": 5,
    "availability": "available",
    "verificationStatus": "pending",
    "isVerified": false,
    "averageRating": 4.5,
    "totalReviews": 10,
    "portfolioCount": 5,
    "location": {
      "latitude": -1.9441,
      "longitude": 30.0619,
      "address": "Kigali, Rwanda"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Get My Provider Profile
**GET** `/providers/me/profile`

**Authentication:** Required (Provider role)

### Update Provider Profile
**PUT** `/providers/:id`

**Authentication:** Required (Provider role - own profile only)

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Name",
  "photo": "https://example.com/new-photo.jpg",
  "priceRangeMin": 6000,
  "priceRangeMax": 20000
}
```

### Update Availability
**PATCH** `/providers/:id/availability`

**Authentication:** Required (Provider role - own profile only)

**Request Body:**
```json
{
  "availability": "available"  // "available", "busy", or "offline"
}
```

### Search Providers
**GET** `/providers/search`

**Query Parameters:**
- `serviceCategoryId` (optional) - Filter by category
- `latitude` (optional) - User's latitude for distance calculation
- `longitude` (optional) - User's longitude for distance calculation
- `maxDistance` (optional) - Maximum distance in kilometers
- `minRating` (optional) - Minimum average rating (0-5)
- `minPrice` (optional) - Minimum price
- `maxPrice` (optional) - Maximum price
- `availability` (optional) - Filter by availability status
- `isVerified` (optional) - Filter by verification status (true/false)
- `limit` (optional) - Results limit (1-100, default: 50)
- `offset` (optional) - Pagination offset

**Example:**
```
GET /providers/search?serviceCategoryId=uuid&latitude=-1.9441&longitude=30.0619&maxDistance=10&minRating=4&isVerified=true
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "categoryName": "Plumbing",
      "averageRating": 4.5,
      "totalReviews": 10,
      "distance_km": 2.5,
      ...
    }
  ],
  "count": 1
}
```

### Add Portfolio Image
**POST** `/providers/:id/portfolio`

**Authentication:** Required (Provider role - own profile only)

**Request Body:**
```json
{
  "imageUrl": "https://example.com/work-photo.jpg",
  "description": "Completed plumbing work"
}
```

### Get Portfolio Images
**GET** `/providers/:id/portfolio`

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "providerId": "uuid",
      "imageUrl": "https://example.com/work-photo.jpg",
      "description": "Completed plumbing work",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Delete Portfolio Image
**DELETE** `/providers/:id/portfolio/:portfolioId`

**Authentication:** Required (Provider role - own profile only)

### Submit Verification Request
**POST** `/providers/:id/verification`

**Authentication:** Required (Provider role - own profile only)

**Request Body:**
```json
{
  "idDocument": "https://example.com/id-document.jpg",
  "certificates": [
    "https://example.com/cert1.jpg",
    "https://example.com/cert2.jpg"
  ],
  "references": [
    "Reference 1 details",
    "Reference 2 details"
  ]
}
```

### Get Verification Request
**GET** `/providers/:id/verification`

**Authentication:** Required (Provider role - own profile only)

---

## 4. Admin Endpoints

All admin endpoints require Admin role authentication.

### Get Verification Requests
**GET** `/admin/verification-requests`

**Query Parameters:**
- `status` (optional) - Filter by status: "pending", "approved", "rejected"

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "providerId": "uuid",
      "idDocument": "https://example.com/id.jpg",
      "certificates": ["url1", "url2"],
      "references": ["ref1", "ref2"],
      "status": "pending",
      "adminNotes": null,
      "reviewedBy": null,
      "reviewedAt": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

### Get Verification Request by ID
**GET** `/admin/verification-requests/:id`

### Review Verification Request
**PATCH** `/admin/verification-requests/:id`

**Request Body:**
```json
{
  "status": "approved",  // or "rejected"
  "adminNotes": "Documents verified successfully"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "status": "approved",
    "reviewedBy": "admin-uuid",
    "reviewedAt": "2024-01-01T00:00:00.000Z",
    ...
  },
  "message": "Verification request approved successfully"
}
```

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "status": "error",
  "message": "Error description here"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Notes

1. **Phone Number Format**: Use international format (e.g., +250788123456)
2. **Coordinates**: Latitude (-90 to 90), Longitude (-180 to 180)
3. **Distance Calculation**: Uses Haversine formula, returns distance in kilometers
4. **Pagination**: Use `limit` and `offset` query parameters
5. **Image URLs**: All image fields expect full URLs (will integrate with cloud storage later)
6. **OTP**: In development mode, OTP codes are logged to console for testing

---

## Next Features (To Be Implemented)

- Booking System
- Reviews & Ratings
- Payment Integration
- Notifications
- Admin Analytics Dashboard
- User Management (Admin)
