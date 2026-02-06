# Booking/Appointment Feature – Usage Notes

This document explains the booking/appointment flow, endpoints, and how to use WhatsApp chat integration.

## Overview
- **Customers** search providers, view portfolios, then book appointments.
- **Providers** view assigned bookings, accept/decline, and chat with customers.
- **WhatsApp-only messaging**: In-app chat is removed. Clicking “Chat” opens a WhatsApp deep link to the other party’s phone number with a pre-filled message.

## Core Flow

1️⃣ **Customer discovers providers**
   - Use existing provider search endpoint (`GET /api/providers/search`) with location/filters.
   - View provider profiles and portfolios to decide.

2️⃣ **Customer creates a booking**
   - `POST /api/bookings` with providerId, serviceCategoryId, optional scheduledDate, description, location, notes.
   - Returns a `Booking` object with status `pending`.

3️⃣ **Provider receives booking**
   - `GET /api/bookings/provider` lists bookings assigned to them.
   - Provider can `PATCH /api/bookings/:id/accept` or `PATCH /api/bookings/:id/decline`.

4️⃣ **Chat via WhatsApp (optional)**
   - `GET /api/bookings/:id/whatsapp` returns a WhatsApp deep link to open a native chat with the other party.
   - The message is pre-filled with: “Hello! I have a question about our booking scheduled for {scheduledDate}.”

---

## Endpoints & Examples

### 1. Create a booking (Customer)

**Endpoint:** `POST /api/bookings`  
**Auth:** Customer (Bearer token)

**Example payload:**
```json
{
  "providerId": "uuid-of-provider",
  "serviceCategoryId": "uuid-of-category",
  "scheduledDate": "2025-02-10T10:00:00Z",
  "description": "Fix kitchen sink leak",
  "latitude": -1.9441,
  "longitude": 30.0619,
  "address": "Kigali, Rwanda",
  "notes": "Please bring necessary tools"
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "id": "new-booking-uuid",
    "customerId": "...",
    "providerId": "...",
    "serviceCategoryId": "...",
    "status": "pending",
    "scheduledDate": "2025-02-10T10:00:00.000Z",
    "description": "...",
    "location": { "latitude": -1.9441, "longitude": 30.0619, "address": "Kigali, Rwanda" },
    "notes": "...",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### 2. List my bookings (Customer)

**Endpoint:** `GET /api/bookings/my`  
**Auth:** Customer (Bearer token)

**Query filters:**
- `status=pending|accepted|declined|completed|cancelled`
- `limit=1..100`
- `offset=0..`

**Example:** `GET /api/bookings/my?status=pending&limit=10`

---

### 3. List provider bookings (Provider)

**Endpoint:** `GET /api/bookings/provider`  
**Auth:** Provider (Bearer token)

**Query filters:**
- `status=pending|accepted|declined|completed|cancelled`
- `limit=1..100`
- `offset=0..`

---

### 4. Accept a booking (Provider)

**Endpoint:** `PATCH /api/bookings/{id}/accept`  
**Auth:** Provider (Bearer token)

**No body required.** Changes booking status to `accepted`.

---

### 5. Decline a booking (Provider)

**Endpoint:** `PATCH /api/bookings/{id}/decline`  
**Auth:** Provider (Bearer token)

**No body required.** Changes booking status to `declined`.

---

### 6. Open WhatsApp chat (Both parties)

**Endpoint:** `GET /api/bookings/{id}/whatsapp`  
**Auth:** Customer or Provider (Bearer token)

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "whatsappLink": "https://wa.me/250788123456?text=Hello!%20I%20have%20a%20question%20about%20our%20booking%20scheduled%20for%202025-02-10T10%3A00%3A00%3A00Z."
  }
}
```

---

## Database Schema Additions

The following tables/columns were added to support bookings:

- `bookings` now includes:
  - `scheduled_date TIMESTAMP`
  - `notes TEXT`
- Removed: `chat_enabled` and `chat_messages` table (WhatsApp-only flow).

Indexes added for performance:
- Bookings indexed by `scheduled_date`.

---

## WhatsApp Integration

The `openWhatsApp` endpoint uses the existing `WhatsappService.generateDeepLink` to create a clickable URL:

```ts
WhatsappService.generateDeepLink(phone, message)
// Returns: "https://wa.me/250788123456?text=Hello%20there"
```

You can customize the default message via config:

```env
WHATSAPP_DEFAULT_MESSAGE="Hi! I have a question about our booking."
```

---

## Permissions & Authorization

- **Customers** can create bookings and view their own bookings.
- **Providers** can view bookings assigned to them and accept/decline.
- **Both parties** can use the WhatsApp link to open a native chat with the other party.

---

## Tips

- Use `scheduledDate` to propose appointment times.
- Use `notes` for special instructions (e.g., “Bring tools”, “Parking info”).
- After a booking is `accepted`, both parties can use the WhatsApp link to chat directly.
- You can extend the booking model to support status change notifications (e.g., from pending → accepted).

---

## Next Steps (Optional)

- Add push notifications for booking status changes.
- Add provider availability/calendar sync.
- Add read receipts for WhatsApp messages (via webhook).
