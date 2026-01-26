# Postman Request Examples for HanoServices API

## Setup Instructions

1. **Set Environment Variables in Postman:**
   - `base_url`: `http://localhost:3000`
   - `provider_token`: (will be set after login)
   - `admin_token`: (will be set after admin login)

2. **Or Import the Collection:**
   - Import `POSTMAN_COLLECTION.json` into Postman
   - All requests are pre-configured

---

## Quick Start Testing Flow

### Step 1: Health Check
```
GET http://localhost:3000/health
```

### Step 2: Register a Provider
```
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "phone": "+250788123456",
  "role": "provider",
  "email": "provider@example.com",
  "password": "password123"
}
```
**Save the `accessToken` from response as `provider_token`**

### Step 3: Get Service Categories
```
GET http://localhost:3000/api/categories
```
**Copy a category `id` for next step**

### Step 4: Create Provider Profile
```
POST http://localhost:3000/api/providers
Authorization: Bearer {{provider_token}}
Content-Type: application/json

{
  "name": "John Doe",
  "serviceCategoryId": "paste-category-id-here",
  "photo": "https://example.com/photo.jpg",
  "priceRangeMin": 5000,
  "priceRangeMax": 15000,
  "yearsOfExperience": 5,
  "latitude": -1.9441,
  "longitude": 30.0619,
  "address": "Kigali, Rwanda"
}
```

---

## All API Requests

### 🔐 Authentication

#### 1. Register User
```
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "phone": "+250788123456",
  "role": "provider",
  "email": "user@example.com",
  "password": "password123"
}
```

#### 2. Send OTP
```
POST http://localhost:3000/api/auth/send-otp
Content-Type: application/json

{
  "phone": "+250788123456"
}
```
**Note:** In development, check console logs for OTP code

#### 3. Verify OTP
```
POST http://localhost:3000/api/auth/verify-otp
Content-Type: application/json

{
  "phone": "+250788123456",
  "code": "123456"
}
```

#### 4. Login with Password
```
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "phone": "+250788123456",
  "password": "password123"
}
```

#### 5. Login with OTP
```
POST http://localhost:3000/api/auth/login-otp
Content-Type: application/json

{
  "phone": "+250788123456",
  "code": "123456"
}
```

#### 6. Reset Password
```
POST http://localhost:3000/api/auth/reset-password
Content-Type: application/json

{
  "phone": "+250788123456",
  "newPassword": "newpassword123"
}
```

---

### 📁 Service Categories

#### 1. Get All Categories
```
GET http://localhost:3000/api/categories
```

#### 2. Get Category by ID
```
GET http://localhost:3000/api/categories/{category-id}
```

#### 3. Create Category (Admin Only)
```
POST http://localhost:3000/api/categories
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "New Category",
  "description": "Category description",
  "icon": "icon-url"
}
```

#### 4. Update Category (Admin Only)
```
PUT http://localhost:3000/api/categories/{category-id}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Updated Category Name",
  "description": "Updated description"
}
```

#### 5. Delete Category (Admin Only)
```
DELETE http://localhost:3000/api/categories/{category-id}
Authorization: Bearer {admin_token}
```

---

### 👷 Provider Management

#### 1. Create Provider Profile
```
POST http://localhost:3000/api/providers
Authorization: Bearer {provider_token}
Content-Type: application/json

{
  "name": "John Doe",
  "serviceCategoryId": "category-uuid-here",
  "photo": "https://example.com/photo.jpg",
  "priceRangeMin": 5000,
  "priceRangeMax": 15000,
  "yearsOfExperience": 5,
  "latitude": -1.9441,
  "longitude": 30.0619,
  "address": "Kigali, Rwanda"
}
```

#### 2. Get Provider by ID
```
GET http://localhost:3000/api/providers/{provider-id}
```

#### 3. Get My Provider Profile
```
GET http://localhost:3000/api/providers/me/profile
Authorization: Bearer {provider_token}
```

#### 4. Update Provider Profile
```
PUT http://localhost:3000/api/providers/{provider-id}
Authorization: Bearer {provider_token}
Content-Type: application/json

{
  "name": "Updated Name",
  "photo": "https://example.com/new-photo.jpg",
  "priceRangeMin": 6000,
  "priceRangeMax": 20000,
  "yearsOfExperience": 7
}
```

#### 5. Update Availability
```
PATCH http://localhost:3000/api/providers/{provider-id}/availability
Authorization: Bearer {provider_token}
Content-Type: application/json

{
  "availability": "available"
}
```
**Values:** `"available"`, `"busy"`, or `"offline"`

#### 6. Search Providers
```
GET http://localhost:3000/api/providers/search?serviceCategoryId={category-id}&latitude=-1.9441&longitude=30.0619&maxDistance=10&minRating=4&isVerified=true&limit=20
```

**Query Parameters:**
- `serviceCategoryId` - Filter by category
- `latitude` - User's latitude (-90 to 90)
- `longitude` - User's longitude (-180 to 180)
- `maxDistance` - Max distance in kilometers
- `minRating` - Minimum rating (0-5)
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `availability` - `"available"`, `"busy"`, or `"offline"`
- `isVerified` - `true` or `false`
- `limit` - Results limit (1-100, default: 50)
- `offset` - Pagination offset

**Example:**
```
GET http://localhost:3000/api/providers/search?latitude=-1.9441&longitude=30.0619&maxDistance=5&minRating=4&availability=available&limit=10
```

#### 7. Add Portfolio Image
```
POST http://localhost:3000/api/providers/{provider-id}/portfolio
Authorization: Bearer {provider_token}
Content-Type: application/json

{
  "imageUrl": "https://example.com/work-photo.jpg",
  "description": "Completed plumbing work"
}
```

#### 8. Get Portfolio Images
```
GET http://localhost:3000/api/providers/{provider-id}/portfolio
```

#### 9. Delete Portfolio Image
```
DELETE http://localhost:3000/api/providers/{provider-id}/portfolio/{portfolio-id}
Authorization: Bearer {provider_token}
```

#### 10. Submit Verification Request
```
POST http://localhost:3000/api/providers/{provider-id}/verification
Authorization: Bearer {provider_token}
Content-Type: application/json

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

#### 11. Get Verification Request
```
GET http://localhost:3000/api/providers/{provider-id}/verification
Authorization: Bearer {provider_token}
```

---

### 👨‍💼 Admin Endpoints

#### 1. Get Verification Requests
```
GET http://localhost:3000/api/admin/verification-requests
Authorization: Bearer {admin_token}
```

**With Status Filter:**
```
GET http://localhost:3000/api/admin/verification-requests?status=pending
Authorization: Bearer {admin_token}
```
**Status values:** `pending`, `approved`, `rejected`

#### 2. Get Verification Request by ID
```
GET http://localhost:3000/api/admin/verification-requests/{verification-request-id}
Authorization: Bearer {admin_token}
```

#### 3. Review Verification Request (Approve/Reject)
```
PATCH http://localhost:3000/api/admin/verification-requests/{verification-request-id}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "status": "approved",
  "adminNotes": "Documents verified successfully"
}
```
**Status values:** `"approved"` or `"rejected"`

---

## Testing Workflow Example

### Complete Provider Flow:

1. **Register Provider:**
   ```
   POST /api/auth/register
   Body: { "phone": "+250788123456", "role": "provider", "password": "pass123" }
   ```
   → Save `accessToken` as `provider_token`

2. **Get Categories:**
   ```
   GET /api/categories
   ```
   → Copy a category `id`

3. **Create Profile:**
   ```
   POST /api/providers
   Headers: Authorization: Bearer {provider_token}
   Body: { "name": "John", "serviceCategoryId": "{category-id}", ... }
   ```
   → Save provider `id`

4. **Update Availability:**
   ```
   PATCH /api/providers/{provider-id}/availability
   Headers: Authorization: Bearer {provider_token}
   Body: { "availability": "available" }
   ```

5. **Add Portfolio:**
   ```
   POST /api/providers/{provider-id}/portfolio
   Headers: Authorization: Bearer {provider_token}
   Body: { "imageUrl": "https://example.com/photo.jpg" }
   ```

6. **Submit Verification:**
   ```
   POST /api/providers/{provider-id}/verification
   Headers: Authorization: Bearer {provider_token}
   Body: { "idDocument": "https://example.com/id.jpg", ... }
   ```

7. **Search Providers (as Customer):**
   ```
   GET /api/providers/search?latitude=-1.9441&longitude=30.0619&maxDistance=10
   ```

### Admin Flow:

1. **Register Admin:**
   ```
   POST /api/auth/register
   Body: { "phone": "+250788999999", "role": "admin", "password": "admin123" }
   ```
   → Save `accessToken` as `admin_token`

2. **Get Pending Verifications:**
   ```
   GET /api/admin/verification-requests?status=pending
   Headers: Authorization: Bearer {admin_token}
   ```

3. **Approve Verification:**
   ```
   PATCH /api/admin/verification-requests/{verification-id}
   Headers: Authorization: Bearer {admin_token}
   Body: { "status": "approved", "adminNotes": "Verified" }
   ```

---

## Common Test Data

### Kigali, Rwanda Coordinates:
- Latitude: `-1.9441`
- Longitude: `30.0619`

### Sample Phone Numbers (Rwanda):
- `+250788123456`
- `+250788999999`
- `+250789000000`

### Sample Service Categories (after seeding):
- Plumbing
- Electrical
- Carpentry
- Cleaning
- Tailoring
- Beauty & Hair
- Babysitting
- Gardening
- Painting

---

## Tips for Testing

1. **Use Postman Environment Variables:**
   - Create an environment with `base_url`, `provider_token`, `admin_token`
   - Use `{{variable_name}}` syntax in requests

2. **Save Responses:**
   - Copy IDs from responses (category-id, provider-id, etc.)
   - Use them in subsequent requests

3. **Check Console:**
   - In development mode, OTP codes are logged to server console
   - Check terminal/console for OTP codes

4. **Error Handling:**
   - All errors return JSON with `status: "error"` and `message`
   - Check status codes: 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found)

5. **Token Management:**
   - Tokens expire after 7 days (configurable)
   - Re-login if you get 401 errors

---

## Quick Copy-Paste Format

For easy copy-paste into Postman, use this format:

**Method:** `POST`  
**URL:** `http://localhost:3000/api/auth/register`  
**Headers:**
```
Content-Type: application/json
```
**Body (raw JSON):**
```json
{
  "phone": "+250788123456",
  "role": "provider",
  "password": "password123"
}
```
