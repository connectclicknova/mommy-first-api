# Wishlist Endpoints

This document describes the API endpoints for managing customer wishlists with product details.

## Authentication

All wishlist endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Get Wishlist

Retrieve all wishlist items for a specific user with complete product details.

**Endpoint:** `GET /wishlist/:userId`

**Parameters:**
- `userId` (path parameter, required): The Shopify customer ID

**Request Example:**
```http
GET /wishlist/6987654321
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "7890123456",
      "graphql_id": "gid://shopify/Product/7890123456",
      "title": "Maternity Dress",
      "handle": "maternity-dress",
      "price": "79.99",
      "currency": "USD",
      "compare_at_price": "99.99",
      "image": "https://cdn.shopify.com/s/files/1/..../maternity-dress.jpg",
      "available_for_sale": true
    },
    {
      "id": "7890123457",
      "graphql_id": "gid://shopify/Product/7890123457",
      "title": "Nursing Pillow",
      "handle": "nursing-pillow",
      "price": "49.99",
      "currency": "USD",
      "compare_at_price": null,
      "image": "https://cdn.shopify.com/s/files/1/..../nursing-pillow.jpg",
      "available_for_sale": true
    }
  ],
  "metafield": {
    "id": 123456789,
    "namespace": "custom",
    "key": "wishlist",
    "type": "json",
    "raw_value": "[\"maternity-dress\",\"nursing-pillow\"]"
  }
}
```

**Empty Wishlist Response (200 OK):**
```json
{
  "success": true,
  "count": 0,
  "data": [],
  "message": "No wishlist metafield found"
}
```

**Error Responses:**

- **400 Bad Request:** Invalid user ID
```json
{
  "success": false,
  "message": "Invalid user ID provided"
}
```

- **404 Not Found:** User not found
```json
{
  "success": false,
  "message": "User not found"
}
```

- **401 Unauthorized:** Missing or invalid token
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

---

### 2. Add Product to Wishlist

Add a single product to the user's wishlist.

**Endpoint:** `POST /wishlist/:userId/add`

**Parameters:**
- `userId` (path parameter, required): The Shopify customer ID

**Request Body:**
```json
{
  "productHandle": "maternity-dress"
}
```

**Request Example:**
```http
POST /wishlist/6987654321/add
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "productHandle": "maternity-dress"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Product added to wishlist",
  "data": {
    "wishlist_count": 3,
    "added_product": {
      "id": "7890123456",
      "graphql_id": "gid://shopify/Product/7890123456",
      "title": "Maternity Dress",
      "handle": "maternity-dress",
      "price": "79.99",
      "currency": "USD",
      "compare_at_price": "99.99",
      "image": "https://cdn.shopify.com/s/files/1/..../maternity-dress.jpg",
      "available_for_sale": true
    }
  }
}
```

**Error Responses:**

- **400 Bad Request:** Missing product handle
```json
{
  "success": false,
  "message": "Product handle is required"
}
```

- **400 Bad Request:** Product already in wishlist
```json
{
  "success": false,
  "message": "Product already in wishlist"
}
```

---

### 3. Remove Product from Wishlist

Remove a specific product from the user's wishlist.

**Endpoint:** `DELETE /wishlist/:userId/remove`

**Parameters:**
- `userId` (path parameter, required): The Shopify customer ID

**Request Body:**
```json
{
  "productHandle": "maternity-dress"
}
```

**Request Example:**
```http
DELETE /wishlist/6987654321/remove
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "productHandle": "maternity-dress"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Product removed from wishlist",
  "data": {
    "wishlist_count": 2,
    "removed_product": "maternity-dress"
  }
}
```

**Error Responses:**

- **400 Bad Request:** Missing product handle
```json
{
  "success": false,
  "message": "Product handle is required"
}
```

- **404 Not Found:** Wishlist is empty
```json
{
  "success": false,
  "message": "Wishlist is empty"
}
```

- **404 Not Found:** Product not in wishlist
```json
{
  "success": false,
  "message": "Product not found in wishlist"
}
```

---

### 4. Update Entire Wishlist

Replace the entire wishlist with a new set of products.

**Endpoint:** `PUT /wishlist/:userId`

**Parameters:**
- `userId` (path parameter, required): The Shopify customer ID

**Request Body:**
```json
{
  "productHandles": [
    "maternity-dress",
    "nursing-pillow",
    "baby-carrier"
  ]
}
```

**Request Example:**
```http
PUT /wishlist/6987654321
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "productHandles": ["maternity-dress", "nursing-pillow", "baby-carrier"]
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Wishlist updated successfully",
  "count": 3,
  "data": [
    {
      "id": "7890123456",
      "graphql_id": "gid://shopify/Product/7890123456",
      "title": "Maternity Dress",
      "handle": "maternity-dress",
      "price": "79.99",
      "currency": "USD",
      "compare_at_price": "99.99",
      "image": "https://cdn.shopify.com/...",
      "available_for_sale": true
    },
    {
      "id": "7890123457",
      "graphql_id": "gid://shopify/Product/7890123457",
      "title": "Nursing Pillow",
      "handle": "nursing-pillow",
      "price": "49.99",
      "currency": "USD",
      "compare_at_price": null,
      "image": "https://cdn.shopify.com/...",
      "available_for_sale": true
    },
    {
      "id": "7890123458",
      "graphql_id": "gid://shopify/Product/7890123458",
      "title": "Baby Carrier",
      "handle": "baby-carrier",
      "price": "89.99",
      "currency": "USD",
      "compare_at_price": "119.99",
      "image": "https://cdn.shopify.com/...",
      "available_for_sale": true
    }
  ]
}
```

**Error Responses:**

- **400 Bad Request:** Invalid productHandles format
```json
{
  "success": false,
  "message": "productHandles must be an array"
}
```

---

### 5. Clear Wishlist

Remove all products from the user's wishlist.

**Endpoint:** `DELETE /wishlist/:userId/clear`

**Parameters:**
- `userId` (path parameter, required): The Shopify customer ID

**Request Example:**
```http
DELETE /wishlist/6987654321/clear
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Wishlist cleared successfully",
  "data": []
}
```

**Already Empty Response (200 OK):**
```json
{
  "success": true,
  "message": "Wishlist is already empty",
  "data": []
}
```

---

## Product Data Fields

Each product in the wishlist includes:

- `id`: Numeric product ID
- `graphql_id`: Shopify GraphQL ID (full GID)
- `title`: Product name/title
- `handle`: Product URL handle
- `price`: Current product price
- `currency`: Currency code (e.g., "USD")
- `compare_at_price`: Original price (if on sale, otherwise null)
- `image`: URL to the first product image
- `available_for_sale`: Boolean indicating product availability

---

## Notes

1. **Authentication Required**: All endpoints require a valid JWT token
2. **Duplicate Prevention**: The add endpoint prevents adding the same product twice
3. **Metafield Storage**: Wishlist is stored as a JSON array in the customer's metafield
4. **Flexible Metafield Detection**: Automatically detects wishlist metafields with various namespace/key combinations:
   - `custom.wishlist`
   - `custom.wishlist_items`
   - `wishlist.wishlist`
   - `custom.favorite_products`
5. **Product Validation**: When adding products, the system validates that the product exists and is available
6. **Empty Wishlist**: Returns empty array when no wishlist metafield exists or when wishlist is empty
7. **Product Details**: All endpoints that return products fetch real-time product details from Shopify

---

## Common Use Cases

### 1. Display User's Wishlist
```javascript
const response = await fetch('https://your-api.com/wishlist/6987654321', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});
const { data: products } = await response.json();
// Display products in UI
```

### 2. Toggle Product in Wishlist
```javascript
// Check if product is in wishlist
const wishlist = await fetchWishlist(userId);
const isInWishlist = wishlist.data.some(p => p.handle === productHandle);

if (isInWishlist) {
  // Remove from wishlist
  await fetch(`https://your-api.com/wishlist/${userId}/remove`, {
    method: 'DELETE',
    headers: {
      'Authorization': 'Bearer YOUR_JWT_TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ productHandle })
  });
} else {
  // Add to wishlist
  await fetch(`https://your-api.com/wishlist/${userId}/add`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_JWT_TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ productHandle })
  });
}
```

### 3. Bulk Update Wishlist
```javascript
// Sync wishlist from local state
const localWishlist = ['product-1', 'product-2', 'product-3'];

await fetch(`https://your-api.com/wishlist/${userId}`, {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ productHandles: localWishlist })
});
```

### 4. Clear Wishlist After Checkout
```javascript
await fetch(`https://your-api.com/wishlist/${userId}/clear`, {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});
```

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (in development)"
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `400`: Bad Request (invalid input)
- `401`: Unauthorized (missing/invalid token)
- `404`: Not Found (user or product not found)
- `500`: Internal Server Error

---

## Best Practices

1. **Check Authentication**: Always ensure the user is authenticated before accessing wishlist
2. **Handle Empty States**: Display appropriate UI when wishlist is empty
3. **Optimistic Updates**: Update UI optimistically, then sync with server
4. **Error Recovery**: Handle network errors gracefully and allow retry
5. **Cache Product Details**: Consider caching product details to reduce API calls
6. **Pagination**: For large wishlists, consider implementing pagination in your frontend
7. **Real-time Sync**: Keep wishlist in sync across multiple devices/sessions
