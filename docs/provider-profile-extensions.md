# Provider Profile Extensions – Usage Notes

This document outlines the new fields added to the provider profile and how to use them.

## New Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `bio` | string | Short professional description | “Experienced plumber specializing in residential installations.” |
| `certifications` | string[] | List of certification names/URLs | `["Certified Plumber", "Safety Training 2023"]` |
| `languages` | string[] | Languages the provider speaks | `["English", "French", "Kinyarwanda"]` |
| `availabilityHours` | object | Weekly working hours per day | `{ mon: { open: "08:00", close: "17:00" }, tue: { open: "08:00", close: "17:00" } }` |
| `responseRate` | number (0–100) | Percentage of messages responded to | `95.5` |
| `responseTimeMinutes` | integer | Typical response time in minutes | `30` |
| `website` | string (URL) | Provider’s personal/business website | `"https://johndoe-plumbing.rw"` |
| `socialLinks` | object | Social media URLs | `{ twitter: "https://twitter.com/johndoe", linkedin: "https://linkedin.com/in/johndoe" }` |
| `preferredContactMethod` | enum | Preferred way to be contacted | `"whatsapp"` (options: phone, email, whatsapp, sms) |
| `isFeatured` | boolean | Whether provider is currently featured | `false` |
| `featuredUntil` | datetime | When featured status expires | `"2025-03-01T00:00:00Z"` |

## How to Use

### 1. Create a provider profile with new fields

**Endpoint:** `POST /api/providers` (multipart/form-data or JSON)

**Example JSON payload:**
```json
{
  "name": "John Doe",
  "serviceCategoryId": "uuid-of-category",
  "bio": "Experienced plumber specializing in residential installations.",
  "certifications": ["Certified Plumber", "Safety Training 2023"],
  "languages": ["English", "French", "Kinyarwanda"],
  "availabilityHours": {
    "mon": { "open": "08:00", "close": "17:00" },
    "tue": { "open": "08:00", "close": "17:00" },
    "wed": { "open": "08:00", "close": "17:00" },
    "thu": { "open": "08:00", "close": "17:00" },
    "fri": { "open": "08:00", "close": "17:00" },
    "sat": { "open": "09:00", "close: "13:00" },
    "sun": { "open": "closed", "close": "closed" }
  },
  "responseRate": 95.5,
  "responseTimeMinutes": 30,
  "website": "https://johndoe-plumbing.rw",
  "socialLinks": {
    "twitter": "https://twitter.com/johndoe",
    "linkedin": "https://linkedin.com/in/johndoe"
  },
  "preferredContactMethod": "whatsapp",
  "isFeatured": false,
  "featuredUntil": null,
  "priceRangeMin": 10000,
  "priceRangeMax": 50000,
  "yearsOfExperience": 5,
  "latitude": -1.9441,
  "longitude": 30.0619,
  "address": "Kigali, Rwanda"
}
```

### 2. Update a provider profile

**Endpoint:** `PATCH /api/providers/:id` (multipart/form-data or JSON)

Include any of the new fields you want to update. All fields are optional.

### 3. Response format

All provider responses (create, update, get) now include the new fields:

```json
{
  "status": "success",
  "data": {
    "id": "...",
    "userId": "...",
    "name": "John Doe",
    "photo": "...",
    "serviceCategoryId": "...",
    "priceRangeMin": 10000,
    "priceRangeMax": 50000,
    "yearsOfExperience": 5,
    "availability": "offline",
    "verificationStatus": "pending",
    "isVerified": false,
    "location": { "latitude": -1.9441, "longitude": 30.0619, "address": "Kigali, Rwanda" },
    "bio": "Experienced plumber specializing in residential installations.",
    "certifications": ["Certified Plumber", "Safety Training 2023"],
    "languages": ["English", "French", "Kinyarwanda"],
    "availabilityHours": { ... },
    "responseRate": 95.5,
    "responseTimeMinutes": 30,
    "website": "https://johndoe-plumbing.rw",
    "socialLinks": { "twitter": "...", "linkedin": "..." },
    "preferredContactMethod": "whatsapp",
    "isFeatured": false,
    "featuredUntil": null,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

## Database Migration

Run the new migration to add the columns to the `providers` table:

```bash
npm run db:migrate
```

The migration:
- Adds the new columns with appropriate types and constraints
- Adds indexes for performance (GIN on array fields, regular indexes on searchable fields)
- Adds a partial index for `is_featured` to optimize featured-provider queries

## Optional Enhancements

- **Featured providers**: Use `isFeatured=true` with a future `featuredUntil` to promote providers.
- **Search by languages/certifications**: The new indexes enable fast filtering.
- **Availability UI**: You can render a weekly schedule from `availabilityHours`.
- **Contact preference**: Use `preferredContactMethod` to surface the right contact button.

---

## Notes

- All new fields are optional; existing providers will have `null` values until updated.
- `availabilityHours` is stored as JSONB; you can structure it by day or however you prefer.
- `socialLinks` is also JSONB; include any platforms you need.
- `featuredUntil` can be set in the future to schedule a provider’s featured period.
