# Authentication Flow Documentation

This document explains all the authentication methods available in the Mommy First API using Descope as the authentication provider and Shopify for customer management.

---

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Email OTP Login](#email-otp-login)
3. [Mobile OTP Login](#mobile-otp-login)
4. [Google Login](#google-login)
5. [Facebook Login](#facebook-login)
6. [Apple Login](#apple-login)
7. [Session Management](#session-management)
8. [Customer Data](#customer-data)
9. [Error Handling](#error-handling)

---

## Environment Setup

Add the following environment variables to your `.env` file:

```env
# Descope Authentication
DESCOPE_PROJECT_ID=your_descope_project_id
DESCOPE_MANAGEMENT_KEY=your_descope_management_key

# Shopify Admin API (for customer management)
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=your_admin_access_token
```

You can obtain Descope credentials from your [Descope Console](https://app.descope.com).

For Shopify Admin API token:
1. Go to Shopify Admin → Settings → Apps and sales channels
2. Click "Develop apps" → Create a new app
3. Configure Admin API scopes: `read_customers`, `write_customers`
4. Install the app and copy the Admin API access token

---

## Email OTP Login

Email OTP provides passwordless authentication by sending a one-time password to the user's email. On successful verification, a Shopify customer is automatically created or fetched.

### Flow Diagram

```
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
│  User   │ ──▶  │   API   │ ──▶  │ Descope │ ──▶  │  Email  │
│         │      │ /email  │      │         │      │  Inbox  │
└─────────┘      └─────────┘      └─────────┘      └─────────┘
     │                                                   │
     │◀──────────────── OTP Code ────────────────────────│
     │                                                   
     ▼                                                   
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
│  User   │ ──▶  │   API   │ ──▶  │ Descope │ ──▶  │ Shopify │
│ Verify  │      │ /verify │      │         │      │Customer │
└─────────┘      └─────────┘      └─────────┘      └─────────┘
     │                                                   │
     │◀────────── Session Tokens + Customer Data ────────│
```

### Step 1: Send OTP to Email

**Endpoint:** `POST /login/email/send`

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "OTP sent to email successfully",
  "maskedEmail": "u***@example.com"
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Email is required"
}
```

### Step 2: Verify Email OTP

**Endpoint:** `POST /login/email/verify`

**Request:**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "firstName": "John",
  "lastName": "Doe"
}
```

> **Note:** `firstName` and `lastName` are optional. They are used when creating a new customer in Shopify.

**Response (Success - 200 - New Customer):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "sessionToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "U2abc123def456",
    "email": "user@example.com",
    "name": "John Doe",
    "verifiedEmail": true
  },
  "customer": {
    "id": 7654321098765,
    "email": "user@example.com",
    "phone": null,
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "createdAt": "2026-01-20T10:30:00Z",
    "updatedAt": "2026-01-20T10:30:00Z",
    "ordersCount": 0,
    "totalSpent": "0.00",
    "verifiedEmail": true,
    "acceptsMarketing": false,
    "defaultAddress": null
  },
  "isNewCustomer": true
}
```

**Response (Success - 200 - Existing Customer):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "sessionToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "U2abc123def456",
    "email": "user@example.com",
    "name": "John Doe",
    "verifiedEmail": true
  },
  "customer": {
    "id": 7654321098765,
    "email": "user@example.com",
    "phone": "+919876543210",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "createdAt": "2025-06-15T08:20:00Z",
    "updatedAt": "2026-01-20T10:30:00Z",
    "ordersCount": 5,
    "totalSpent": "2500.00",
    "verifiedEmail": true,
    "acceptsMarketing": true,
    "defaultAddress": {
      "address1": "123 Main Street",
      "city": "Mumbai",
      "province": "Maharashtra",
      "country": "India",
      "zip": "400001"
    }
  },
  "isNewCustomer": false
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

---

## Mobile OTP Login

Mobile OTP provides passwordless authentication by sending a one-time password via SMS. On successful verification, a Shopify customer is automatically created or fetched.

### Flow Diagram

```
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
│  User   │ ──▶  │   API   │ ──▶  │ Descope │ ──▶  │   SMS   │
│         │      │ /mobile │      │         │      │ Provider│
└─────────┘      └─────────┘      └─────────┘      └─────────┘
     │                                                   │
     │◀──────────────── OTP Code ────────────────────────│
     │                                                   
     ▼                                                   
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
│  User   │ ──▶  │   API   │ ──▶  │ Descope │ ──▶  │ Shopify │
│ Verify  │      │ /verify │      │         │      │Customer │
└─────────┘      └─────────┘      └─────────┘      └─────────┘
     │                                                   │
     │◀────────── Session Tokens + Customer Data ────────│
```

### Step 1: Send OTP to Mobile

**Endpoint:** `POST /login/mobile/send`

**Request:**
```json
{
  "phone": "+919876543210"
}
```

> **Important:** Phone number must be in E.164 format

**Phone Number Format Examples:**

| Country | Format |
|---------|--------|
| India | `+919876543210` |
| USA | `+14155551234` |
| UK | `+447911123456` |
| UAE | `+971501234567` |
| Australia | `+61412345678` |

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "OTP sent to mobile successfully",
  "maskedPhone": "+91*****3210"
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Phone number is required"
}
```

### Step 2: Verify Mobile OTP

**Endpoint:** `POST /login/mobile/verify`

**Request:**
```json
{
  "phone": "+919876543210",
  "code": "123456",
  "firstName": "John",
  "lastName": "Doe"
}
```

> **Note:** `firstName` and `lastName` are optional. They are used when creating a new customer in Shopify.

**Response (Success - 200 - New Customer):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "sessionToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "U2abc123def456",
    "phone": "+919876543210",
    "name": "John Doe",
    "verifiedPhone": true
  },
  "customer": {
    "id": 7654321098765,
    "email": null,
    "phone": "+919876543210",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "createdAt": "2026-01-20T10:30:00Z",
    "updatedAt": "2026-01-20T10:30:00Z",
    "ordersCount": 0,
    "totalSpent": "0.00",
    "verifiedEmail": false,
    "acceptsMarketing": false,
    "defaultAddress": null
  },
  "isNewCustomer": true
}
```

**Response (Success - 200 - Existing Customer):**
```json
{
  "success": true,
  "message": "Mobile verified successfully",
  "sessionToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "U2abc123def456",
    "phone": "+919876543210",
    "name": "John Doe",
    "verifiedPhone": true
  },
  "customer": {
    "id": 7654321098765,
    "email": "john@example.com",
    "phone": "+919876543210",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "createdAt": "2025-06-15T08:20:00Z",
    "updatedAt": "2026-01-20T10:30:00Z",
    "ordersCount": 3,
    "totalSpent": "1500.00",
    "verifiedEmail": true,
    "acceptsMarketing": false,
    "defaultAddress": {
      "address1": "456 Park Avenue",
      "city": "Delhi",
      "province": "Delhi",
      "country": "India",
      "zip": "110001"
    }
  },
  "isNewCustomer": false
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

---

## Google Login

Google OAuth allows users to sign in using their Google/Gmail account. On successful authentication, a Shopify customer is automatically created or fetched using the Google account email.

### Flow Diagram

```
┌─────────┐      ┌─────────┐      ┌─────────┐
│  User   │ ──▶  │   API   │ ──▶  │ Descope │
│         │      │ /start  │      │         │
└─────────┘      └─────────┘      └─────────┘
     │                                 │
     │◀────────── Auth URL ────────────│
     │
     ▼
┌─────────┐      ┌─────────┐
│  User   │ ──▶  │ Google  │
│Redirect │      │  Login  │
└─────────┘      └─────────┘
     │                 │
     │◀─── Redirect ───│
     │    with code
     ▼
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
│  User   │ ──▶  │   API   │ ──▶  │ Descope │ ──▶  │ Shopify │
│         │      │/exchange│      │         │      │Customer │
└─────────┘      └─────────┘      └─────────┘      └─────────┘
     │                                                   │
     │◀────────── Session Tokens + Customer Data ────────│
```

### Step 1: Start Google OAuth

**Endpoint:** `POST /login/google/start`

**Request:**
```json
{
  "redirectUrl": "https://yourapp.com/auth/callback"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Google OAuth started",
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&scope=..."
}
```

### Step 2: Redirect User to Google

Redirect the user to the `authUrl` received in Step 1:

```javascript
window.location.href = authUrl;
```

The user will:
1. See Google's login page
2. Select their Google account
3. Grant permissions
4. Get redirected to your `redirectUrl` with a `code` parameter

### Step 3: Exchange Code for Tokens

After Google redirects to: `https://yourapp.com/auth/callback?code=4/0AfJohXn...`

**Endpoint:** `POST /login/google/exchange`

**Request:**
```json
{
  "code": "4/0AfJohXnKxyz123...",
  "firstName": "John",
  "lastName": "Doe"
}
```

> **Note:** `firstName` and `lastName` are optional. If not provided, the name from Google profile will be used.

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Google login successful",
  "sessionToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "U2abc123def456",
    "email": "user@gmail.com",
    "name": "John Doe",
    "picture": "https://lh3.googleusercontent.com/...",
    "verifiedEmail": true
  },
  "customer": {
    "id": 7654321098765,
    "email": "user@gmail.com",
    "phone": null,
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "createdAt": "2026-01-20T10:30:00Z",
    "updatedAt": "2026-01-20T10:30:00Z",
    "ordersCount": 0,
    "totalSpent": "0.00",
    "verifiedEmail": true,
    "acceptsMarketing": false,
    "defaultAddress": null
  },
  "isNewCustomer": true
}
```

### Frontend Implementation Example

```javascript
// Start OAuth
async function loginWithGoogle() {
  const response = await fetch('/login/google/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      redirectUrl: window.location.origin + '/auth/callback'
    })
  });
  
  const data = await response.json();
  window.location.href = data.authUrl;
}

// Handle callback
async function handleGoogleCallback() {
  const code = new URLSearchParams(window.location.search).get('code');
  
  if (code) {
    const response = await fetch('/login/google/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('sessionToken', data.sessionToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      window.location.href = '/dashboard';
    }
  }
}
```

---

## Facebook Login

Facebook OAuth allows users to sign in using their Facebook account.

### Step 1: Start Facebook OAuth

**Endpoint:** `POST /login/facebook/start`

**Request:**
```json
{
  "redirectUrl": "https://yourapp.com/auth/callback"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Facebook OAuth started",
  "authUrl": "https://www.facebook.com/v18.0/dialog/oauth?client_id=...&redirect_uri=..."
}
```

### Step 2: Redirect User to Facebook

```javascript
window.location.href = authUrl;
```

### Step 3: Exchange Code for Tokens

**Endpoint:** `POST /login/facebook/exchange`

**Request:**
```json
{
  "code": "AQDvC...",
  "firstName": "John",
  "lastName": "Doe"
}
```

> **Note:** `firstName` and `lastName` are optional. If not provided, the name from Facebook profile will be used.

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Facebook login successful",
  "sessionToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "U2abc123def456",
    "email": "user@facebook.com",
    "name": "John Doe",
    "picture": "https://graph.facebook.com/..."
  },
  "customer": {
    "id": 7654321098765,
    "email": "user@facebook.com",
    "phone": null,
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "createdAt": "2026-01-20T10:30:00Z",
    "updatedAt": "2026-01-20T10:30:00Z",
    "ordersCount": 0,
    "totalSpent": "0.00",
    "verifiedEmail": true,
    "acceptsMarketing": false,
    "defaultAddress": null
  },
  "isNewCustomer": true
}
```

### Frontend Implementation Example

```javascript
// Start OAuth
async function loginWithFacebook() {
  const response = await fetch('/login/facebook/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      redirectUrl: window.location.origin + '/auth/callback'
    })
  });
  
  const data = await response.json();
  window.location.href = data.authUrl;
}

// Handle callback (same pattern as Google)
async function handleFacebookCallback() {
  const code = new URLSearchParams(window.location.search).get('code');
  
  if (code) {
    const response = await fetch('/login/facebook/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('sessionToken', data.sessionToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('customer', JSON.stringify(data.customer));
      window.location.href = '/dashboard';
    }
  }
}
```

---

## Apple Login

Apple Sign In allows users to authenticate using their Apple ID. On successful authentication, a Shopify customer is automatically created or fetched.

### Step 1: Start Apple OAuth

**Endpoint:** `POST /login/apple/start`

**Request:**
```json
{
  "redirectUrl": "https://yourapp.com/auth/callback"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Apple OAuth started",
  "authUrl": "https://appleid.apple.com/auth/authorize?client_id=...&redirect_uri=..."
}
```

### Step 2: Redirect User to Apple

```javascript
window.location.href = authUrl;
```

### Step 3: Exchange Code for Tokens

**Endpoint:** `POST /login/apple/exchange`

**Request:**
```json
{
  "code": "c5a...",
  "firstName": "John",
  "lastName": "Doe"
}
```

> **Note:** `firstName` and `lastName` are optional. If not provided, the name from Apple profile will be used.

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Apple login successful",
  "sessionToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "U2abc123def456",
    "email": "user@privaterelay.appleid.com",
    "name": "John Doe"
  },
  "customer": {
    "id": 7654321098765,
    "email": "user@privaterelay.appleid.com",
    "phone": null,
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "createdAt": "2026-01-20T10:30:00Z",
    "updatedAt": "2026-01-20T10:30:00Z",
    "ordersCount": 0,
    "totalSpent": "0.00",
    "verifiedEmail": true,
    "acceptsMarketing": false,
    "defaultAddress": null
  },
  "isNewCustomer": true
}
```

> **Note:** Apple may provide a private relay email if the user chooses to hide their email.

### Frontend Implementation Example

```javascript
// Start OAuth
async function loginWithApple() {
  const response = await fetch('/login/apple/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      redirectUrl: window.location.origin + '/auth/callback'
    })
  });
  
  const data = await response.json();
  window.location.href = data.authUrl;
}

// Handle callback
async function handleAppleCallback() {
  const code = new URLSearchParams(window.location.search).get('code');
  
  if (code) {
    const response = await fetch('/login/apple/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('sessionToken', data.sessionToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      window.location.href = '/dashboard';
    }
  }
}
```

---

## Customer Data

All verify/exchange endpoints return a `customer` object from Shopify. This data can be used for the user profile page.

### Customer Object Structure

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Shopify customer ID |
| `email` | string | Customer email address |
| `phone` | string | Customer phone number (E.164 format) |
| `firstName` | string | Customer first name |
| `lastName` | string | Customer last name |
| `fullName` | string | Combined first and last name |
| `createdAt` | string | Account creation date (ISO 8601) |
| `updatedAt` | string | Last update date (ISO 8601) |
| `ordersCount` | number | Total number of orders |
| `totalSpent` | string | Total amount spent |
| `verifiedEmail` | boolean | Whether email is verified |
| `acceptsMarketing` | boolean | Marketing consent |
| `defaultAddress` | object | Default shipping address |

### Default Address Object

| Field | Type | Description |
|-------|------|-------------|
| `address1` | string | Street address line 1 |
| `address2` | string | Street address line 2 |
| `city` | string | City name |
| `province` | string | State/Province |
| `country` | string | Country name |
| `zip` | string | Postal/ZIP code |
| `phone` | string | Address phone number |

### Storing Customer Data (Frontend)

```javascript
// After successful login
if (data.success) {
  localStorage.setItem('sessionToken', data.sessionToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('customer', JSON.stringify(data.customer));
  localStorage.setItem('isNewCustomer', data.isNewCustomer);
}

// Retrieving customer data
function getCustomer() {
  const customerStr = localStorage.getItem('customer');
  return customerStr ? JSON.parse(customerStr) : null;
}

// For profile page
const customer = getCustomer();
if (customer) {
  console.log(`Welcome, ${customer.fullName}!`);
  console.log(`Orders: ${customer.ordersCount}`);
  console.log(`Total Spent: $${customer.totalSpent}`);
}
```

---

## Session Management

### Using Session Tokens

After successful authentication, include the session token in all authenticated API requests:

```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Validate Session

Check if a session token is still valid.

**Endpoint:** `POST /login/validate`

**Request:**
```json
{
  "sessionToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Session is valid",
  "token": {
    "sub": "U2abc123def456",
    "exp": 1737500000,
    "iat": 1737400000
  }
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "Invalid or expired session"
}
```

### Refresh Session

Get a new session token using the refresh token.

**Endpoint:** `POST /login/refresh`

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Session refreshed successfully",
  "sessionToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Logout

Invalidate the current session.

**Endpoint:** `POST /login/logout`

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Token Management Best Practices

```javascript
class TokenManager {
  static getSessionToken() {
    return localStorage.getItem('sessionToken');
  }
  
  static getRefreshToken() {
    return localStorage.getItem('refreshToken');
  }
  
  static setTokens(sessionToken, refreshToken) {
    localStorage.setItem('sessionToken', sessionToken);
    localStorage.setItem('refreshToken', refreshToken);
  }
  
  static clearTokens() {
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('refreshToken');
  }
  
  static async refreshSession() {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await fetch('/login/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    
    const data = await response.json();
    
    if (data.success) {
      this.setTokens(data.sessionToken, data.refreshToken);
      return data.sessionToken;
    }
    
    throw new Error('Failed to refresh session');
  }
  
  static async logout() {
    const refreshToken = this.getRefreshToken();
    
    if (refreshToken) {
      await fetch('/login/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
    }
    
    this.clearTokens();
  }
}
```

---

## Error Handling

### Common Error Responses

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Missing required fields |
| 401 | Unauthorized - Invalid credentials or expired token |
| 500 | Internal Server Error - Server-side error |

### Error Response Format

```json
{
  "success": false,
  "message": "Error description"
}
```

### Descope Error Codes

| Code | Description |
|------|-------------|
| `E061102` | Wrong OTP code |
| `E061103` | Too many OTP attempts |
| `E062108` | User not found |
| `E011001` | Bad request |
| `E011002` | Missing arguments |

### Handling Errors in Frontend

```javascript
async function handleAuthError(response) {
  const data = await response.json();
  
  switch (response.status) {
    case 400:
      // Show validation error
      showError('Please fill in all required fields');
      break;
    case 401:
      // Invalid credentials or expired session
      if (data.message.includes('expired')) {
        // Try to refresh token
        await TokenManager.refreshSession();
      } else {
        showError('Invalid credentials. Please try again.');
      }
      break;
    case 500:
      showError('Something went wrong. Please try again later.');
      break;
    default:
      showError(data.message || 'An error occurred');
  }
}
```

---

## API Endpoints Summary

| Endpoint | Method | Description | Returns Customer |
|----------|--------|-------------|------------------|
| `/login/email/send` | POST | Send OTP to email | No |
| `/login/email/verify` | POST | Verify email OTP & get/create customer | ✅ Yes |
| `/login/mobile/send` | POST | Send OTP to mobile | No |
| `/login/mobile/verify` | POST | Verify mobile OTP & get/create customer | ✅ Yes |
| `/login/google/start` | POST | Start Google OAuth | No |
| `/login/google/exchange` | POST | Exchange Google auth code & get/create customer | ✅ Yes |
| `/login/facebook/start` | POST | Start Facebook OAuth | No |
| `/login/facebook/exchange` | POST | Exchange Facebook auth code & get/create customer | ✅ Yes |
| `/login/apple/start` | POST | Start Apple OAuth | No |
| `/login/apple/exchange` | POST | Exchange Apple auth code & get/create customer | ✅ Yes |
| `/login/validate` | POST | Validate session token | No |
| `/login/refresh` | POST | Refresh session token | No |
| `/login/logout` | POST | Logout user | No |

### Request Parameters Summary

**Verify/Exchange Endpoints (Optional Parameters):**

| Parameter | Type | Description |
|-----------|------|-------------|
| `firstName` | string | Customer first name (used for new customer creation) |
| `lastName` | string | Customer last name (used for new customer creation) |

> **Note:** For OAuth logins (Google, Facebook, Apple), if `firstName` and `lastName` are not provided, the name from the social profile will be used.

---

## Descope Console Setup

### Enable Authentication Methods

1. Go to [Descope Console](https://app.descope.com)
2. Navigate to **Authentication Methods**
3. Enable the methods you want to use:
   - **OTP** → Enable Email and/or SMS
   - **Social Login** → Enable Google, Facebook, and/or Apple

### Configure Social Providers

#### Google
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs
4. Copy Client ID and Secret to Descope

#### Facebook
1. Go to [Facebook Developers](https://developers.facebook.com)
2. Create a new app
3. Configure Facebook Login
4. Copy App ID and Secret to Descope

#### Apple
1. Go to [Apple Developer](https://developer.apple.com)
2. Create an App ID with Sign In with Apple
3. Create a Service ID
4. Generate a key for Sign In with Apple
5. Configure in Descope

---

## Security Best Practices

1. **Always use HTTPS** in production
2. **Store tokens securely** - Use HttpOnly cookies for web or secure storage for mobile
3. **Implement token refresh** before session expires
4. **Validate tokens server-side** for protected routes
5. **Set appropriate token expiry** times in Descope Console
6. **Use environment variables** for sensitive credentials
7. **Never expose management keys** to the client-side

---

*Last Updated: January 2026*
