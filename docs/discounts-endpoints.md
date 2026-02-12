# Discounts API Documentation

This document describes the Discounts API endpoints for managing discount codes and automatic discounts in the Mommy First application.

## Overview

The Discounts API allows you to:
- Apply discount codes to carts
- Remove discount codes from carts
- Validate discount codes before applying
- View automatic discounts applied to a cart
- Get detailed discount information for cart items

## Discount Types

### 1. Discount Codes
Manual discount codes that customers enter at checkout. These can be:
- Percentage discounts (e.g., 10% off)
- Fixed amount discounts (e.g., ₹100 off)
- Free shipping
- Buy X Get Y offers

### 2. Automatic Discounts
Discounts that are automatically applied when certain conditions are met (e.g., cart value above ₹500, specific products in cart). These are configured in Shopify and applied automatically.

---

## Base URL

```
https://your-api-domain.com
```

---

## Authentication

- **Guest endpoints** (`/discounts/apply`, `/discounts/cart/:cartId`, etc.) - No authentication required
- **User endpoints** (`/discounts/user/:userId/*`) - Requires `Authorization: Bearer <sessionToken>` header

---

## Endpoints

### 1. Apply Discount Codes

Apply one or more discount codes to a cart.

**Endpoint:** `POST /discounts/apply`

**Authentication:** None required

**Request Body:**
```json
{
  "cartId": "gid://shopify/Cart/c1-abc123def456",
  "discountCodes": ["SUMMER20", "FREESHIPING"]
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Discount code(s) applied successfully",
  "data": {
    "cartId": "gid://shopify/Cart/c1-abc123def456",
    "checkoutUrl": "https://store.myshopify.com/cart/c/c1-abc123def456",
    "totalQuantity": 2,
    "items": [...],
    "cost": {
      "subtotal": { "amount": 1000, "currencyCode": "INR" },
      "total": { "amount": 800, "currencyCode": "INR" },
      "totalTax": null
    },
    "discounts": {
      "codes": [
        { "code": "SUMMER20", "applicable": true }
      ],
      "allocations": [
        {
          "type": "code",
          "title": null,
          "code": "SUMMER20",
          "discountedAmount": { "amount": 200, "currencyCode": "INR" }
        }
      ],
      "automaticDiscounts": [],
      "codeDiscounts": [...],
      "totalDiscount": { "amount": 200, "currencyCode": "INR" }
    }
  }
}
```

**Response (Failure - Invalid Code):**
```json
{
  "success": false,
  "message": "Failed to apply discount code(s)",
  "errors": [
    { "field": ["discountCodes"], "message": "Discount code is invalid", "code": "INVALID" }
  ],
  "data": null
}
```

---

### 2. Apply Single Discount Code

Convenience endpoint to apply a single discount code while preserving existing codes.

**Endpoint:** `POST /discounts/apply-single`

**Authentication:** None required

**Request Body:**
```json
{
  "cartId": "gid://shopify/Cart/c1-abc123def456",
  "discountCode": "SUMMER20"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Discount code applied successfully",
  "applicable": true,
  "data": {
    "cartId": "gid://shopify/Cart/c1-abc123def456",
    ...
  }
}
```

**Note:** If the code is valid but not applicable to the current cart (e.g., minimum purchase not met), the response will be:
```json
{
  "success": true,
  "message": "Discount code added but not applicable to current cart",
  "applicable": false,
  "data": {...}
}
```

---

### 3. Remove All Discount Codes

Remove all discount codes from a cart.

**Endpoint:** `DELETE /discounts/remove`

**Authentication:** None required

**Request Body:**
```json
{
  "cartId": "gid://shopify/Cart/c1-abc123def456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Discount codes removed successfully",
  "data": {
    "cartId": "gid://shopify/Cart/c1-abc123def456",
    ...
    "discounts": {
      "codes": [],
      "allocations": [],
      ...
    }
  }
}
```

---

### 4. Remove Single Discount Code

Remove a specific discount code from the cart while keeping other codes.

**Endpoint:** `DELETE /discounts/remove-single`

**Authentication:** None required

**Request Body:**
```json
{
  "cartId": "gid://shopify/Cart/c1-abc123def456",
  "discountCode": "SUMMER20"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Discount code removed successfully",
  "data": {...}
}
```

---

### 5. Validate Discount Code

Check if a discount code is valid and applicable without permanently applying it.

**Endpoint:** `POST /discounts/validate`

**Authentication:** None required

**Request Body:**
```json
{
  "cartId": "gid://shopify/Cart/c1-abc123def456",
  "discountCode": "SUMMER20",
  "applyIfValid": false
}
```

**Parameters:**
- `applyIfValid` (optional, default: false): If `true`, the code will be kept on the cart if valid and applicable.

**Response:**
```json
{
  "success": true,
  "valid": true,
  "applicable": true,
  "message": "Discount code is valid and applicable",
  "data": null
}
```

**Possible Messages:**
- "Discount code is valid and applicable"
- "Discount code is valid but not applicable to current cart"
- "Invalid discount code"

---

### 6. Get Cart with Discounts

Get detailed cart information including all discount details.

**Endpoint:** `GET /discounts/cart/:cartId`

**Authentication:** None required

**Response:**
```json
{
  "success": true,
  "data": {
    "cartId": "gid://shopify/Cart/c1-abc123def456",
    "checkoutUrl": "https://store.myshopify.com/cart/c/c1-abc123def456",
    "createdAt": "2026-01-25T10:30:00Z",
    "updatedAt": "2026-01-25T11:00:00Z",
    "totalQuantity": 2,
    "items": [
      {
        "lineId": "gid://shopify/CartLine/abc123",
        "quantity": 1,
        "variant": {
          "id": "gid://shopify/ProductVariant/123",
          "title": "Small / Blue",
          "price": { "amount": 500, "currencyCode": "INR" },
          "compareAtPrice": { "amount": 600, "currencyCode": "INR" },
          "image": { "url": "...", "altText": "..." }
        },
        "product": {
          "id": "gid://shopify/Product/123",
          "title": "Baby Onesie",
          "handle": "baby-onesie",
          "featuredImage": { "url": "...", "altText": "..." }
        },
        "cost": {
          "totalAmount": { "amount": 400, "currencyCode": "INR" },
          "amountPerQuantity": { "amount": 400, "currencyCode": "INR" },
          "compareAtAmountPerQuantity": { "amount": 500, "currencyCode": "INR" }
        },
        "discountAllocations": [
          {
            "type": "code",
            "title": null,
            "code": "SUMMER20",
            "discountedAmount": { "amount": 100, "currencyCode": "INR" }
          }
        ],
        "totalDiscount": { "amount": 100, "currencyCode": "INR" }
      }
    ],
    "cost": {
      "subtotal": { "amount": 1000, "currencyCode": "INR" },
      "total": { "amount": 800, "currencyCode": "INR" },
      "totalTax": null
    },
    "discounts": {
      "codes": [
        { "code": "SUMMER20", "applicable": true }
      ],
      "allocations": [
        {
          "type": "code",
          "title": null,
          "code": "SUMMER20",
          "discountedAmount": { "amount": 200, "currencyCode": "INR" }
        }
      ],
      "automaticDiscounts": [],
      "codeDiscounts": [
        {
          "type": "code",
          "title": null,
          "code": "SUMMER20",
          "discountedAmount": { "amount": 200, "currencyCode": "INR" }
        }
      ],
      "totalCartDiscount": { "amount": 200, "currencyCode": "INR" },
      "totalLineDiscount": { "amount": 0, "currencyCode": "INR" },
      "totalDiscount": { "amount": 200, "currencyCode": "INR" }
    }
  }
}
```

---

### 7. Get Automatic Discounts

Get automatic discounts currently applied to a cart.

**Endpoint:** `GET /discounts/automatic/:cartId`

**Authentication:** None required

**Response:**
```json
{
  "success": true,
  "message": "Automatic discounts retrieved successfully",
  "data": {
    "cartLevelDiscounts": [
      {
        "title": "10% off orders over ₹500",
        "discountedAmount": { "amount": 100, "currencyCode": "INR" }
      }
    ],
    "lineLevelDiscounts": [],
    "totalAutomaticDiscounts": [
      {
        "title": "10% off orders over ₹500",
        "discountedAmount": { "amount": 100, "currencyCode": "INR" }
      }
    ]
  }
}
```

---

## User-Specific Endpoints

These endpoints work with the user's persistent cart and require authentication.

### 8. Apply Discount to User's Cart

**Endpoint:** `POST /discounts/user/:userId/apply`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "discountCodes": ["SUMMER20"]
}
```

---

### 9. Apply Single Discount to User's Cart

**Endpoint:** `POST /discounts/user/:userId/apply-single`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "discountCode": "SUMMER20"
}
```

---

### 10. Remove All Discounts from User's Cart

**Endpoint:** `DELETE /discounts/user/:userId/remove`

**Authentication:** Required (Bearer token)

---

### 11. Remove Single Discount from User's Cart

**Endpoint:** `DELETE /discounts/user/:userId/remove-single`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "discountCode": "SUMMER20"
}
```

---

### 12. Get User Cart with Discounts

**Endpoint:** `GET /discounts/user/:userId`

**Authentication:** Required (Bearer token)

---

### 13. Get Automatic Discounts for User's Cart

**Endpoint:** `GET /discounts/user/:userId/automatic`

**Authentication:** Required (Bearer token)

---

## Cart Response Structure with Discounts

When you fetch a cart or apply discounts, the response now includes comprehensive discount information:

```json
{
  "cartId": "...",
  "checkoutUrl": "...",
  "items": [
    {
      "lineId": "...",
      "quantity": 1,
      "variant": {...},
      "product": {...},
      "cost": {
        "totalAmount": {...},
        "amountPerQuantity": {...},
        "compareAtAmountPerQuantity": {...}
      },
      "discountAllocations": [
        {
          "type": "automatic | code",
          "title": "Discount Title (for automatic)",
          "code": "DISCOUNT_CODE (for code)",
          "discountedAmount": {...}
        }
      ],
      "totalDiscount": {...}
    }
  ],
  "cost": {
    "subtotal": {...},
    "total": {...},
    "totalTax": {...}
  },
  "discounts": {
    "codes": [
      { "code": "SUMMER20", "applicable": true }
    ],
    "allocations": [...],
    "automaticDiscounts": [...],
    "codeDiscounts": [...],
    "totalCartDiscount": {...},
    "totalLineDiscount": {...},
    "totalDiscount": {...}
  }
}
```

---

## Client Implementation Examples

### Apply Discount Code (React/JavaScript)

```javascript
const applyDiscount = async (cartId, discountCode) => {
  const response = await fetch('/discounts/apply-single', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cartId, discountCode })
  });
  
  const data = await response.json();
  
  if (data.success) {
    if (data.applicable) {
      // Code applied and working
      console.log('Discount applied!', data.data.discounts.totalDiscount);
    } else {
      // Code valid but not applicable
      alert('This code cannot be applied to your current cart');
    }
  } else {
    // Code invalid or error
    alert(data.errors?.[0]?.message || 'Invalid discount code');
  }
  
  return data;
};
```

### Display Discounts in Cart

```javascript
const CartSummary = ({ cart }) => {
  const { cost, discounts } = cart;
  
  return (
    <div>
      <p>Subtotal: ₹{cost.subtotal.amount}</p>
      
      {discounts.totalDiscount.amount > 0 && (
        <div>
          <p style={{ color: 'green' }}>
            Discount: -₹{discounts.totalDiscount.amount}
          </p>
          
          {discounts.codes.map(code => (
            <span key={code.code}>
              {code.code} {code.applicable ? '✓' : '(not applicable)'}
            </span>
          ))}
          
          {discounts.automaticDiscounts.map(disc => (
            <span key={disc.title}>{disc.title}</span>
          ))}
        </div>
      )}
      
      <p><strong>Total: ₹{cost.total.amount}</strong></p>
    </div>
  );
};
```

### Validate Before Applying

```javascript
const handleDiscountSubmit = async (discountCode) => {
  // First validate
  const validation = await fetch('/discounts/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cartId,
      discountCode,
      applyIfValid: true  // Apply immediately if valid
    })
  }).then(r => r.json());
  
  if (!validation.valid) {
    showError('Invalid discount code');
  } else if (!validation.applicable) {
    showWarning('Code is valid but cannot be applied to your cart');
  } else {
    showSuccess('Discount applied!');
    refreshCart();
  }
};
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID` | The discount code is invalid or doesn't exist |
| `EXPIRED` | The discount code has expired |
| `USAGE_LIMIT_REACHED` | The discount code has reached its usage limit |
| `MINIMUM_NOT_MET` | Cart doesn't meet the minimum purchase requirement |
| `NOT_COMBINABLE` | This code cannot be combined with other discounts |

---

## Best Practices

1. **Always validate first** - Use the `/validate` endpoint before showing success to users
2. **Handle non-applicable codes gracefully** - A valid code might not apply to the current cart
3. **Display automatic discounts** - Show users when automatic discounts are applied
4. **Show discount breakdown** - Display both line-level and cart-level discounts
5. **Update UI after changes** - Always refresh the cart display after applying/removing discounts
