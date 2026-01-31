# Flutterwave Payment Integration Setup Guide

This guide will help you get all the credentials needed and set up Flutterwave payments in your HanoServices application.

## 📋 Table of Contents
1. [Getting Credentials from Flutterwave Dashboard](#getting-credentials)
2. [Setting Up Webhook Secret Hash](#webhook-secret-hash)
3. [Configuring Callback URL](#callback-url)
4. [Environment Variables Setup](#environment-variables)
5. [Testing Your Integration](#testing)

---

## 🔑 Getting Credentials

### Step 1: Access Flutterwave Dashboard
1. Go to [https://dashboard.flutterwave.com](https://dashboard.flutterwave.com)
2. Sign in with your account
3. Make sure you're in the correct environment (Sandbox for testing, Live for production)

### Step 2: Get API Credentials

#### For Flutterwave v4 API (Recommended):
1. In the dashboard, go to **Settings** → **API**
2. You'll see:
   - **Client-Id** → This is your `FLUTTERWAVE_CLIENT_ID`
   - **Client-Secret** → This is your `FLUTTERWAVE_CLIENT_SECRET`
3. **Copy these immediately** - Client-Secret is only shown once!

#### For Flutterwave v3 API (Legacy):
1. In the dashboard, go to **Settings** → **API**
2. You'll see:
   - **Public Key** → This is your `FLUTTERWAVE_PUBLIC_KEY`
   - **Secret Key** → This is your `FLUTTERWAVE_SECRET_KEY`

**Note:** The code supports both v4 (OAuth) and v3 (API keys). If you have Client-Id/Secret, it will use v4. Otherwise, it falls back to v3.

---

## 🔐 Setting Up Webhook Secret Hash

The webhook secret hash is used to verify that webhooks are actually coming from Flutterwave.

### Step 1: Generate Secret Hash
1. Go to **Settings** → **Webhooks** in your Flutterwave dashboard
2. You'll see a section for **"Secret Hash"**
3. Click **"Generate"** or **"Create Secret Hash"**
4. **Copy the generated hash** → This is your `FLUTTERWAVE_SECRET_HASH`
5. **Save it immediately** - you won't be able to see it again!

### Step 2: Use the Secret Hash
- Add it to your `.env` file as `FLUTTERWAVE_SECRET_HASH`
- The code will automatically use it to verify webhook signatures
- **Important:** Without this, your webhooks won't be verified (security risk!)

---

## 🔗 Configuring Callback URL

The callback URL is where Flutterwave sends payment status updates after a payment is processed.

### Step 1: Determine Your Callback URL

#### For Local Development:
Use **ngrok** or similar tool to expose your local server:

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
```

You'll get a URL like: `https://abc123.ngrok.io`

Your callback URL will be: `https://abc123.ngrok.io/api/payments/flutterwave/callback`

#### For Production:
Use your actual domain: `https://yourdomain.com/api/payments/flutterwave/callback`

### Step 2: Set Callback URL in Flutterwave Dashboard
1. Go to **Settings** → **Webhooks** in your Flutterwave dashboard
2. Find **"Webhook URL"** or **"Callback URL"** section
3. Enter your callback URL: `https://yourdomain.com/api/payments/flutterwave/callback`
4. Click **"Save"** or **"Update"**

### Step 3: Verify Callback URL
- Make sure your callback URL is **HTTPS** (not HTTP)
- It must be **publicly accessible** (not localhost)
- Flutterwave will send POST requests to this URL
- Your server must respond with `200 OK` quickly (within 5 seconds)

---

## ⚙️ Environment Variables Setup

Add these to your `.env` file:

```env
# ============================================
# Flutterwave v4 API Configuration (Recommended)
# ============================================
FLUTTERWAVE_CLIENT_ID=your_client_id_here
FLUTTERWAVE_CLIENT_SECRET=your_client_secret_here

# ============================================
# Flutterwave v3 API Configuration (Fallback)
# ============================================
# Only use these if you don't have Client-Id/Secret
FLUTTERWAVE_PUBLIC_KEY=your_public_key_here
FLUTTERWAVE_SECRET_KEY=your_secret_key_here

# ============================================
# Webhook Configuration
# ============================================
FLUTTERWAVE_SECRET_HASH=your_secret_hash_here

# ============================================
# API URLs
# ============================================
# For Sandbox (Testing)
FLUTTERWAVE_API_URL=https://developersandbox-api.flutterwave.com
FLUTTERWAVE_AUTH_URL=https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token
FLUTTERWAVE_ENVIRONMENT=sandbox

# For Production (when ready)
# FLUTTERWAVE_API_URL=https://api.flutterwave.com
# FLUTTERWAVE_ENVIRONMENT=production

# ============================================
# Callback URL
# ============================================
FLUTTERWAVE_CALLBACK_URL=https://yourdomain.com/api/payments/flutterwave/callback

# ============================================
# Optional
# ============================================
FLUTTERWAVE_LOGO_URL=https://yourdomain.com/logo.png
```

---

## 🧪 Testing Your Integration

### 1. Test with Sandbox Environment
- Use sandbox credentials from Flutterwave dashboard
- Test with Flutterwave test phone numbers (check their documentation)
- No real money is transferred in sandbox

### 2. Test Payment Initiation
```bash
# Example API call
POST /api/payments/initiate
{
  "amount": 1000,
  "currency": "RWF",
  "customerId": "user123",
  "channel": "mtn_momo",
  "phoneNumber": "+250788123456",
  "email": "[email protected]",
  "description": "Test payment"
}
```

### 3. Test Webhook Callback
- Use **ngrok** to expose your local server
- Update callback URL in Flutterwave dashboard
- Make a test payment
- Check your server logs for webhook received

### 4. Monitor Logs
Check your server logs for:
- API request/response details
- Webhook received data
- Error messages
- Token generation (if using v4 API)

---

## 📚 Additional Resources

- **Flutterwave Documentation**: [https://developer.flutterwave.com/docs](https://developer.flutterwave.com/docs)
- **Getting Started**: [https://developer.flutterwave.com/docs/getting-started](https://developer.flutterwave.com/docs/getting-started)
- **Mobile Money**: [https://developer.flutterwave.com/docs/mobile-money](https://developer.flutterwave.com/docs/mobile-money)
- **Webhooks**: Check Flutterwave dashboard for webhook documentation

---

## ❓ Common Issues

### "Invalid Client-Id or Client-Secret"
- Make sure you're using the correct environment (sandbox vs production)
- Check if credentials are copied correctly (no extra spaces)
- Regenerate credentials if needed

### "Webhook signature verification failed"
- Make sure `FLUTTERWAVE_SECRET_HASH` is set correctly
- Verify the secret hash in Flutterwave dashboard matches your `.env`
- Check if webhook payload is being parsed correctly

### "Callback URL not accessible"
- Ensure URL is HTTPS (not HTTP)
- Make sure server is running and publicly accessible
- Check firewall/security settings
- For local testing, use ngrok

### "Access token expired"
- Tokens expire after 10 minutes
- The code automatically refreshes tokens
- If you see this error, check token generation logic

---

## 🚀 Next Steps

1. ✅ Get Client-Id and Client-Secret from Flutterwave dashboard
2. ✅ Generate Secret Hash for webhook verification
3. ✅ Set up callback URL (use ngrok for local testing)
4. ✅ Add all credentials to `.env` file
5. ✅ Test with sandbox environment
6. ✅ Implement database updates in webhook handler (marked with TODO)
7. ✅ Request production access when ready

---

## 📝 Important Notes

- **Sandbox vs Production**: Always test in sandbox first
- **Webhook Security**: Always verify webhook signatures in production
- **Token Caching**: The code caches access tokens (valid for 10 minutes)
- **Error Handling**: All errors are logged for debugging
- **Phone Numbers**: Must include country code (e.g., +250 for Rwanda)
