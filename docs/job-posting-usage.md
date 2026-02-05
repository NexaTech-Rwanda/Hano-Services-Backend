# Job Posting Feature Usage

This document provides quick examples and notes for using the job posting endpoints.

## Overview
- **Customers** can post jobs, view their own jobs, edit/delete (only while open), and update status.
- **Providers** can view available jobs, claim a job (assign to themselves), and update status of assigned jobs.

## Common Statuses
- `open` – job is posted and available for providers to claim
- `assigned` – a provider has claimed the job
- `in_progress` – work has started
- `completed` – job is finished
- `cancelled` – job was cancelled

---

## 1. Customer: Post a new job

**Endpoint:** `POST /api/jobs`  
**Auth:** Customer (Bearer token)

**Example payload:**
```json
{
  "serviceCategoryId": "uuid-of-category",
  "title": "Fix leaking kitchen faucet",
  "description": "The kitchen faucet is dripping and needs replacement. I already have the new faucet.",
  "budget": 45.00,
  "locationAddress": "123 Main St, Kigali",
  "latitude": -1.9441,
  "longitude": 30.0619,
  "deadline": "2025-02-10T18:00:00Z"
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "id": "new-job-uuid",
    "customerId": "customer-uuid",
    "serviceCategoryId": "uuid-of-category",
    "title": "Fix leaking kitchen faucet",
    "description": "...",
    "budget": 45.00,
    "locationAddress": "123 Main St, Kigali",
    "latitude": -1.9441,
    "longitude": 30.0619,
    "deadline": "2025-02-10T18:00:00.000Z",
    "status": "open",
    "assignedProviderId": null,
    "assignedAt": null,
    "completedAt": null,
    "createdAt": "2025-02-05T12:34:56.000Z",
    "updatedAt": "2025-02-05T12:34:56.000Z"
  }
}
```

---

## 2. Customer: View my posted jobs

**Endpoint:** `GET /api/jobs/my`  
**Auth:** Customer (Bearer token)

**Optional query filters:**
- `status=open|assigned|in_progress|completed|cancelled`
- `limit=1..100`

**Example:** `GET /api/jobs/my?status=open&limit=10`

---

## 3. Customer: Edit a job (only while open)

**Endpoint:** `PATCH /api/jobs/{id}`  
**Auth:** Customer (Bearer token)

**Example payload:**
```json
{
  "title": "Fix leaking kitchen faucet (URGENT)",
  "budget": 55.00
}
```

---

## 4. Customer: Delete a job (only while open)

**Endpoint:** `DELETE /api/jobs/{id}`  
**Auth:** Customer (Bearer token)

---

## 5. Provider: List available jobs

**Endpoint:** `GET /api/jobs`  
**Auth:** Provider (Bearer token)

**Optional query filters:**
- `serviceCategoryId=uuid`
- `latitude=-1.9441&longitude=30.0619&maxDistanceKm=10` (location-based)
- `minBudget=20&maxBudget=200`
- `status=open` (default shows all statuses)
- `limit=1..100`

**Example:** `GET /api/jobs?status=open&latitude=-1.9441&longitude=30.0619&maxDistanceKm=5&limit=20`

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "job-uuid",
      "customerId": "...",
      "serviceCategoryId": "...",
      "title": "Fix leaking kitchen faucet",
      "description": "...",
      "budget": 45.00,
      "locationAddress": "...",
      "latitude": -1.9441,
      "longitude": 30.0619,
      "deadline": "...",
      "status": "open",
      "assignedProviderId": null,
      "assignedAt": null,
      "completedAt": null,
      "createdAt": "...",
      "updatedAt": "...",
      "categoryName": "Plumbing",
      "customerName": "john_doe",
      "providerName": null,
      "distanceKm": 2.3
    }
  ],
  "count": 1
}
```

---

## 6. Provider: Claim/assign a job to yourself

**Endpoint:** `PATCH /api/jobs/{id}/assign`  
**Auth:** Provider (Bearer token)

**No body required.** The job must be `open`.

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "...": "...",
    "status": "assigned",
    "assignedProviderId": "provider-uuid",
    "assignedAt": "2025-02-05T13:00:00.000Z",
    "..."
  }
}
```

---

## 7. Provider/Customer: Update job status

**Endpoint:** `PATCH /api/jobs/{id}/status`  
**Auth:** Customer (own jobs) or Assigned Provider

**Example payload:**
```json
{
  "status": "in_progress"
}
```

Allowed transitions:
- Customer can set to `cancelled` (any time) or `completed` (when work is done)
- Assigned provider can set to `in_progress` or `completed`

---

## 8. Get a single job by ID

**Endpoint:** `GET /api/jobs/{id}`  
**Auth:** Any authenticated user

---

## Notes & Gotchas
- **Geolocation**: If you provide `latitude` and `longitude`, the system stores a `geo_location` point for fast distance queries.
- **Authorization**: Customers can only edit/delete their own jobs and only while `status=open`. Providers can only claim jobs and update status of jobs assigned to them.
- **Swagger**: All endpoints are documented at `/api-docs` with request/response schemas.
- **Pagination**: List endpoints support `limit`. You can add cursor-based pagination later if needed.

---

## Next Steps (optional enhancements)
- Add notifications (push/SMS) when a job is assigned or status changes.
- Add provider ratings/reviews tied to completed jobs.
- Add file attachments (photos/docs) to job postings.
- Add a “chat/messaging” sub-resource per job.
