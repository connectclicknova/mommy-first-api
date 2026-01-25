# Cart API Documentation

This document describes the Cart API endpoints for managing shopping carts in the Mommy First application.

## Overview

The Cart API supports two modes of operation:
1. **Guest Mode** - For users who are not logged in (cart stored by cartId)
2. **User Mode** - For logged-in users (cart persisted in user profile)

When a guest user logs in, their guest cart can be merged with their user cart.

---

## Cart Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        GUEST USER                               │
│                    (Not Logged In)                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   POST /cart    │
                    │  Create Cart    │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Store cartId   │
                    │  in localStorage│
                    └─────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  POST /cart/:cartId/items     │
              │  Add items to guest cart      │
              └───────────────────────────────┘
                              │
                              │
         ┌────────────────────┴────────────────────┐
         │                                         │
         ▼                                         ▼
┌─────────────────┐                    ┌─────────────────────────┐
│  Continue as    │                    │      USER LOGS IN       │
│  Guest          │                    │  (Any login method)     │
└─────────────────┘                    └─────────────────────────┘
                                                   │
                                                   ▼
                                       ┌─────────────────────────┐
                                       │    POST /cart/merge     │
                                       │  Merge guest cart with  │
                                       │  user's existing cart   │
                                       └─────────────────────────┘
                                                   │
                                                   ▼
                                       ┌─────────────────────────┐
                                       │  Clear localStorage     │
                                       │  cartId                 │
                                       └─────────────────────────┘
                                                   │
                                                   ▼
                                       ┌─────────────────────────┐
                                       │  Use user-specific      │
                                       │  cart endpoints:        │
                                       │  /cart/user/:userId     │
                                       └─────────────────────────┘
```

---

## Base URL

```
https://your-api-domain.com
```

---

## Authentication

- **Guest endpoints** (`/cart`, `/cart/:cartId/*`) - No authentication required
- **User endpoints** (`/cart/user/:userId/*`, `/cart/merge`) - Requires `Authorization: Bearer <sessionToken>` header

---

## Endpoints

### 1. Create Cart (Guest)

Creates a new shopping cart. Use this for guest users who are not logged in.

**Endpoint:** `POST /cart`

**Authentication:** None required

**Request Body:**
```json
{
  "email": "guest@example.com"  // Optional - for order notifications
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cart created successfully",
  "data": {
    "cartId": "gid://shopify/Cart/c1-abc123def456",
    "checkoutUrl": "https://store.myshopify.com/cart/c/c1-abc123def456",
    "createdAt": "2026-01-25T10:30:00Z",
    "updatedAt": "2026-01-25T10:30:00Z",
    "totalQuantity": 0,
    "items": [],
    "cost": {
      "subtotal": {
        "amount": 0,
        "currencyCode": "INR"
      },
      "total": {
        "amount": 0,
        "currencyCode": "INR"
      },
      "totalTax": null
    }
  }
}
```

**Client Implementation:**
```javascript
// Create cart and store cartId locally
const response = await fetch('/cart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});
const data = await response.json();

// Store for later use
localStorage.setItem('guestCartId', data.data.cartId);
```

---

### 2. Get Cart by ID

Retrieves a cart with all its items.

**Endpoint:** `GET /cart/:cartId`

**Authentication:** None required

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cartId` | string | Yes | The cart ID (URL encoded) |

**Response:**
```json
{
  "success": true,
  "data": {
    "cartId": "gid://shopify/Cart/c1-abc123def456",
    "checkoutUrl": "https://store.myshopify.com/cart/c/c1-abc123def456",
    "createdAt": "2026-01-25T10:30:00Z",
    "updatedAt": "2026-01-25T10:45:00Z",
    "totalQuantity": 3,
    "items": [
      {
        "lineId": "gid://shopify/CartLine/line123",
        "quantity": 2,
        "variant": {
          "id": "gid://shopify/ProductVariant/12345",
          "title": "Small / Pink",
          "price": {
            "amount": 599.00,
            "currencyCode": "INR"
          },
          "image": {
            "url": "https://cdn.shopify.com/...",
            "altText": "Baby Onesie - Small Pink"
          }
        },
        "product": {
          "id": "gid://shopify/Product/111",
          "title": "Baby Onesie",
          "handle": "baby-onesie",
          "featuredImage": {
            "url": "https://cdn.shopify.com/...",
            "altText": "Baby Onesie"
          }
        },
        "lineCost": {
          "amount": 1198.00,
          "currencyCode": "INR"
        }
      }
    ],
    "cost": {
      "subtotal": {
        "amount": 1198.00,
        "currencyCode": "INR"
      },
      "total": {
        "amount": 1198.00,
        "currencyCode": "INR"
      },
      "totalTax": {
        "amount": 0,
        "currencyCode": "INR"
      }
    }
  }
}
```

**Error Response (Cart Not Found):**
```json
{
  "success": false,
  "message": "Cart not found"
}
```

---

### 3. Add Items to Cart (by cartId)

Adds one or more items to an existing cart.

**Endpoint:** `POST /cart/:cartId/items`

**Authentication:** None required

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cartId` | string | Yes | The cart ID |

**Request Body:**
```json
{
  "items": [
    {
      "variantId": "gid://shopify/ProductVariant/12345",
      "quantity": 2
    },
    {
      "variantId": "gid://shopify/ProductVariant/67890",
      "quantity": 1
    }
  ]
}
```

**Request Body Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `items` | array | Yes | Array of items to add |
| `items[].variantId` | string | Yes | Product variant ID from Products API |
| `items[].quantity` | number | No | Quantity to add (default: 1) |

**Response:**
```json
{
  "success": true,
  "message": "Items added to cart successfully",
  "data": {
    "cartId": "gid://shopify/Cart/c1-abc123def456",
    "totalQuantity": 3,
    "items": [...],
    "cost": {...}
  }
}
```

---

### 4. Update Cart Items (by cartId)

Updates the quantity of items in the cart.

**Endpoint:** `PUT /cart/:cartId/items`

**Authentication:** None required

**Request Body:**
```json
{
  "items": [
    {
      "lineId": "gid://shopify/CartLine/line123",
      "quantity": 5
    }
  ]
}
```

**Request Body Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `items` | array | Yes | Array of items to update |
| `items[].lineId` | string | Yes | Line ID from cart items |
| `items[].quantity` | number | Yes | New quantity (0 to remove) |

**Response:**
```json
{
  "success": true,
  "message": "Cart items updated successfully",
  "data": {
    "cartId": "gid://shopify/Cart/c1-abc123def456",
    "totalQuantity": 5,
    "items": [...],
    "cost": {...}
  }
}
```

---

### 5. Remove Items from Cart (by cartId)

Removes items from the cart.

**Endpoint:** `DELETE /cart/:cartId/items`

**Authentication:** None required

**Request Body:**
```json
{
  "lineIds": [
    "gid://shopify/CartLine/line123",
    "gid://shopify/CartLine/line456"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Items removed from cart successfully",
  "data": {
    "cartId": "gid://shopify/Cart/c1-abc123def456",
    "totalQuantity": 0,
    "items": [],
    "cost": {...}
  }
}
```

---

## User-Specific Cart Endpoints

These endpoints are for logged-in users. The cart is automatically persisted in the user's profile.

### 6. Merge Cart on Login

**Call this immediately after user logs in** to merge any guest cart items with the user's existing cart.

**Endpoint:** `POST /cart/merge`

**Authentication:** Required

**Headers:**
```
Authorization: Bearer <sessionToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": 123456789,
  "guestCartId": "gid://shopify/Cart/c1-abc123def456"
}
```

**Request Body Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | number | Yes | User's customer ID |
| `guestCartId` | string | No | Guest cart ID from localStorage (if any) |

**Response (With Merge):**
```json
{
  "success": true,
  "message": "Successfully merged 3 item(s) from guest cart",
  "merged": true,
  "itemsMerged": 3,
  "data": {
    "cartId": "gid://shopify/Cart/user-cart-id",
    "totalQuantity": 5,
    "items": [...],
    "cost": {...}
  }
}
```

**Response (No Guest Cart):**
```json
{
  "success": true,
  "message": "No guest cart items to merge",
  "merged": false,
  "itemsMerged": 0,
  "data": {
    "cartId": "gid://shopify/Cart/user-cart-id",
    "totalQuantity": 2,
    "items": [...],
    "cost": {...}
  }
}
```

**Client Implementation:**
```javascript
async function onLoginSuccess(loginResponse) {
  const { sessionToken, customer } = loginResponse;
  
  // Get guest cartId from localStorage
  const guestCartId = localStorage.getItem('guestCartId');
  
  // Merge carts
  const mergeResponse = await fetch('/cart/merge', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: customer.id,
      guestCartId: guestCartId || null
    })
  });
  
  // Clear guest cartId - now using user-specific cart
  localStorage.removeItem('guestCartId');
  
  // Store userId for future cart operations
  localStorage.setItem('userId', customer.id);
}
```

---

### 7. Get User's Cart

Get or create a cart for a logged-in user. Cart is automatically persisted.

**Endpoint:** `GET /cart/user/:userId`

**Authentication:** Required

**Headers:**
```
Authorization: Bearer <sessionToken>
```

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | number | Yes | User's customer ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "cartId": "gid://shopify/Cart/user-cart-id",
    "checkoutUrl": "https://store.myshopify.com/cart/c/user-cart-id",
    "totalQuantity": 2,
    "items": [...],
    "cost": {...}
  }
}
```

---

### 8. Add Items to User's Cart

**Endpoint:** `POST /cart/user/:userId/items`

**Authentication:** Required

**Headers:**
```
Authorization: Bearer <sessionToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "items": [
    {
      "variantId": "gid://shopify/ProductVariant/12345",
      "quantity": 2
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Items added to cart successfully",
  "data": {
    "cartId": "gid://shopify/Cart/user-cart-id",
    "totalQuantity": 4,
    "items": [...],
    "cost": {...}
  }
}
```

---

### 9. Update User's Cart Items

**Endpoint:** `PUT /cart/user/:userId/items`

**Authentication:** Required

**Request Body:**
```json
{
  "items": [
    {
      "lineId": "gid://shopify/CartLine/line123",
      "quantity": 3
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cart items updated successfully",
  "data": {...}
}
```

---

### 10. Remove Items from User's Cart

**Endpoint:** `DELETE /cart/user/:userId/items`

**Authentication:** Required

**Request Body:**
```json
{
  "lineIds": [
    "gid://shopify/CartLine/line123"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Items removed from cart successfully",
  "data": {...}
}
```

---

## Data Models

### Cart Object

```json
{
  "cartId": "gid://shopify/Cart/abc123",
  "checkoutUrl": "https://store.myshopify.com/cart/c/abc123",
  "createdAt": "2026-01-25T10:30:00Z",
  "updatedAt": "2026-01-25T10:45:00Z",
  "totalQuantity": 5,
  "items": [CartLineItem],
  "cost": {
    "subtotal": { "amount": 2500.00, "currencyCode": "INR" },
    "total": { "amount": 2500.00, "currencyCode": "INR" },
    "totalTax": { "amount": 0, "currencyCode": "INR" }
  }
}
```

### CartLineItem Object

```json
{
  "lineId": "gid://shopify/CartLine/line123",
  "quantity": 2,
  "variant": {
    "id": "gid://shopify/ProductVariant/12345",
    "title": "Small / Pink",
    "price": {
      "amount": 599.00,
      "currencyCode": "INR"
    },
    "image": {
      "url": "https://cdn.shopify.com/...",
      "altText": "Product image"
    }
  },
  "product": {
    "id": "gid://shopify/Product/111",
    "title": "Baby Onesie",
    "handle": "baby-onesie",
    "featuredImage": {
      "url": "https://cdn.shopify.com/...",
      "altText": "Product image"
    }
  },
  "lineCost": {
    "amount": 1198.00,
    "currencyCode": "INR"
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Items array is required and must not be empty"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "No token provided"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Cart not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to add items to cart",
  "error": "Error details..."
}
```

---

## Quick Reference

### Guest User Flow
| Action | Method | Endpoint |
|--------|--------|----------|
| Create cart | `POST` | `/cart` |
| Get cart | `GET` | `/cart/:cartId` |
| Add items | `POST` | `/cart/:cartId/items` |
| Update items | `PUT` | `/cart/:cartId/items` |
| Remove items | `DELETE` | `/cart/:cartId/items` |

### Login Transition
| Action | Method | Endpoint |
|--------|--------|----------|
| Merge carts | `POST` | `/cart/merge` |

### Logged-in User Flow
| Action | Method | Endpoint |
|--------|--------|----------|
| Get cart | `GET` | `/cart/user/:userId` |
| Add items | `POST` | `/cart/user/:userId/items` |
| Update items | `PUT` | `/cart/user/:userId/items` |
| Remove items | `DELETE` | `/cart/user/:userId/items` |

---

## Checkout

To proceed to checkout, redirect the user to the `checkoutUrl` returned in the cart response:

```javascript
const cart = await getCart(cartId);
window.location.href = cart.checkoutUrl;
```

This will take the user to Shopify's secure checkout page where they can complete their purchase.
