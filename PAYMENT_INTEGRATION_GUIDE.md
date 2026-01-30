# Mobile Money Integration Guide - MTN & Airtel

This guide will walk you through getting credentials and setting up MTN Mobile Money and Airtel Money integrations.

## 📋 Table of Contents
1. [MTN Mobile Money Setup](#mtn-mobile-money-setup)
2. [Airtel Money Setup](#airtel-money-setup)
3. [Understanding Callback URLs](#understanding-callback-urls)
4. [Environment Variables](#environment-variables)
5. [Testing Your Integration](#testing-your-integration)

---

## 🔵 MTN Mobile Money Setup

### Step 1: Access MTN Developer Portal
1. Go to [https://momodeveloper.mtn.com](https://momodeveloper.mtn.com)
2. Sign in with your account
3. Navigate to the **Dashboard**

### Step 2: Create an API User
1. In the dashboard, look for **"API Users"** or **"Users"** section
2. Click **"Create API User"**
3. Fill in:
   - **User ID**: Choose a unique ID (e.g., `hanoservices-api-user`)
   - **Provider Callback Host**: Your server URL (e.g., `https://yourdomain.com` or `https://your-ngrok-url.ngrok.io` for testing)
4. Click **"Create"**
5. **IMPORTANT**: Copy and save:
   - **API Key** → This is your `MTN_MOMO_API_KEY`
   - **API Secret** → This is your `MTN_MOMO_API_SECRET`

### Step 3: Get Subscription Key
1. Go to **"Products"** or **"Subscriptions"** section
2. You'll see different products (Collection, Disbursement, Remittance)
3. For receiving payments, you need **"Collection"** product
4. Click on **"Collection"** product
5. Copy the **"Primary Key"** or **"Subscription Key"** → This is your `MTN_MOMO_SUBSCRIPTION_KEY`

### Step 4: Get API URLs
- **Sandbox URL**: `https://sandbox.momodeveloper.mtn.com`
- **Production URL**: Provided by MTN after approval (usually `https://momodeveloper.mtn.com` or similar)

### Step 5: Generate Access Token
MTN uses OAuth 2.0. You need to generate an access token using your API Key and Secret:

**Endpoint**: `POST https://sandbox.momodeveloper.mtn.com/collection/token/`

**Headers**:
```
Authorization: Basic {base64(apiKey:apiSecret)}
Ocp-Apim-Subscription-Key: {subscriptionKey}
```

**Response**: You'll get an `access_token` which expires (usually 1 hour). This token is used as `MTN_MOMO_API_KEY` in requests.

---

## 🟢 Airtel Money Setup

### Step 1: Access Airtel Developer Portal
1. Go to [https://developers.airtel.africa](https://developers.airtel.africa)
2. Sign in with your account
3. Navigate to **"Dashboard"** or **"My Apps"**

### Step 2: Create an Application
1. Click **"Create App"** or **"New Application"**
2. Fill in:
   - **App Name**: e.g., "HanoServices"
   - **Description**: Brief description
   - **Environment**: Select "Sandbox" for testing
3. Click **"Create"**

### Step 3: Get Client Credentials
After creating the app, you'll see:
- **Client ID** → This is your `AIRTEL_MONEY_CLIENT_ID`
- **Client Secret** → This is your `AIRTEL_MONEY_CLIENT_SECRET`
- **Copy these immediately** - Client Secret is only shown once!

### Step 4: Get API URL
- **Sandbox URL**: Usually `https://openapiuat.airtel.africa` or check documentation
- **Production URL**: Provided after approval

### Step 5: Get Merchant ID
1. Go to **"Merchant Settings"** or **"Business Profile"**
2. Find your **Merchant ID** or **Business ID** → This is your `AIRTEL_MONEY_MERCHANT_ID`

### Step 6: Generate Access Token
Airtel uses OAuth 2.0. Generate token using Client ID and Secret:

**Endpoint**: `POST {apiUrl}/auth/oauth2/token`

**Body** (form-data):
```
grant_type=client_credentials
client_id={clientId}
client_secret={clientSecret}
```

**Response**: You'll get an `access_token` → This is your `AIRTEL_MONEY_API_KEY`

---

## 🔗 Understanding Callback URLs

### What is a Callback URL?
A callback URL is an endpoint on **your server** where MTN/Airtel will send payment status updates (success, failure, etc.) after a payment is processed.

### How It Works:
1. User initiates payment → Your app calls MTN/Airtel API
2. User approves payment on their phone
3. MTN/Airtel processes payment
4. MTN/Airtel sends status update to your callback URL
5. Your server receives the update and updates your database

### Setting Up Callback URLs

#### For Local Development:
Use **ngrok** or similar tool to expose your local server:

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
```

You'll get a URL like: `https://abc123.ngrok.io`

#### For Production:
Use your actual domain: `https://yourdomain.com`

### Callback URL Format:
- **MTN**: `https://yourdomain.com/api/payments/mtn/callback`
- **Airtel**: `https://yourdomain.com/api/payments/airtel/callback`

### Important Notes:
- Callback URLs must be **HTTPS** (not HTTP) in production
- They must be **publicly accessible** (not localhost)
- MTN/Airtel will send POST requests to these URLs
- Your server must respond with `200 OK` quickly (within 5 seconds)

---

## 🔐 Environment Variables

Add these to your `.env` file:

```env
# ============================================
# MTN Mobile Money Configuration
# ============================================
MTN_MOMO_API_URL=https://sandbox.momodeveloper.mtn.com
MTN_MOMO_API_KEY=your_api_key_here
MTN_MOMO_API_SECRET=your_api_secret_here
MTN_MOMO_SUBSCRIPTION_KEY=your_subscription_key_here
MTN_MOMO_ENVIRONMENT=sandbox
MTN_MOMO_CALLBACK_URL=https://yourdomain.com/api/payments/mtn/callback

# ============================================
# Airtel Money Configuration
# ============================================
AIRTEL_MONEY_API_URL=https://openapiuat.airtel.africa
AIRTEL_MONEY_CLIENT_ID=your_client_id_here
AIRTEL_MONEY_CLIENT_SECRET=your_client_secret_here
AIRTEL_MONEY_API_KEY=your_access_token_here
AIRTEL_MONEY_MERCHANT_ID=your_merchant_id_here
AIRTEL_MONEY_ENVIRONMENT=sandbox
AIRTEL_MONEY_CALLBACK_URL=https://yourdomain.com/api/payments/airtel/callback
```

---

## 🧪 Testing Your Integration

### 1. Test with Sandbox Environment
- Both providers offer sandbox/test environments
- Use test phone numbers provided in their documentation
- No real money is transferred in sandbox

### 2. Test Callback URLs
You can test if your callback endpoints work using:
- **Postman** or **curl** to send test POST requests
- **ngrok web interface** to see incoming requests

### 3. Monitor Logs
Check your server logs for:
- API request/response details
- Callback/webhook received data
- Error messages

---

## 📚 Additional Resources

- **MTN Documentation**: [https://momodeveloper.mtn.com/api-documentation](https://momodeveloper.mtn.com/api-documentation)
- **Airtel Documentation**: [https://developers.airtel.africa/documentation/getting-started/1.0](https://developers.airtel.africa/documentation/getting-started/1.0)

---

## ❓ Common Issues

### "Invalid API Key"
- Make sure you're using the correct environment (sandbox vs production)
- Regenerate access token if it expired
- Check if API Key and Secret are correct

### "Callback URL not accessible"
- Ensure URL is HTTPS (not HTTP)
- Make sure server is running and publicly accessible
- Check firewall/security settings

### "Subscription Key Invalid"
- Verify you're using the correct subscription key for the product (Collection)
- Check if subscription is active in MTN portal

---

## 🚀 Next Steps

1. Get all credentials from both portals
2. Add them to your `.env` file
3. Set up callback endpoints (webhook handlers)
4. Test with sandbox environment
5. Request production access when ready
