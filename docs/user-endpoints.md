# User Endpoints

This document describes the API endpoints for managing user details.

## Authentication

All user endpoints require authentication using a Bearer token in the Authorization header.

```
Authorization: Bearer <your-token>
```

---

## Endpoints

### 1. Get User Details

Retrieve all details of a user by their ID.

**Endpoint:** `GET /user/:userId`

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes | Bearer token for authentication |

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | number | Yes | The Shopify customer ID |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 123456789,
    "email": "john@example.com",
    "phone": "+1234567890",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-20T14:45:00Z",
    "ordersCount": 5,
    "totalSpent": "250.00",
    "verifiedEmail": true,
    "acceptsMarketing": false,
    "defaultAddress": {
      "address1": "123 Main St",
      "city": "New York",
      "province": "NY",
      "country": "United States",
      "zip": "10001"
    }
  }
}
```

**Error Responses:**

| Status Code | Description |
|-------------|-------------|
| 400 | Invalid user ID provided |
| 401 | Access denied / Invalid token |
| 404 | User not found |
| 500 | Server error |

**Example Error Response (404):**
```json
{
  "success": false,
  "message": "User not found"
}
```

---

### 2. Update User Details

Update the details of a user by their ID.

**Endpoint:** `PUT /user/:userId`

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes | Bearer token for authentication |
| Content-Type | Yes | application/json |

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | number | Yes | The Shopify customer ID |

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| firstName | string | No* | User's first name |
| lastName | string | No* | User's last name |
| email | string | No* | User's email address |
| phone | string | No* | User's phone number |

*At least one field must be provided for update.

**Example Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.updated@example.com",
  "phone": "+1987654321"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "User details updated successfully",
  "data": {
    "id": 123456789,
    "email": "john.updated@example.com",
    "phone": "+1987654321",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-21T09:00:00Z",
    "ordersCount": 5,
    "totalSpent": "250.00",
    "verifiedEmail": true,
    "acceptsMarketing": false,
    "defaultAddress": null
  }
}
```

**Error Responses:**

| Status Code | Description |
|-------------|-------------|
| 400 | Invalid user ID or no fields provided for update |
| 401 | Access denied / Invalid token |
| 404 | User not found |
| 422 | Invalid data provided (e.g., invalid email format) |
| 500 | Server error |

**Example Error Response (400):**
```json
{
  "success": false,
  "message": "At least one field (firstName, lastName, email, phone) is required for update"
}
```

**Example Error Response (422):**
```json
{
  "success": false,
  "message": "Invalid data provided",
  "errors": {
    "email": ["is invalid"]
  }
}
```

---

## Usage Examples

### cURL

**Get User Details:**
```bash
curl -X GET "https://your-api-url.com/user/123456789" \
  -H "Authorization: Bearer your-token-here"
```

**Update User Details:**
```bash
curl -X PUT "https://your-api-url.com/user/123456789" \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  }'
```

### JavaScript (Fetch)

**Get User Details:**
```javascript
const response = await fetch('/user/123456789', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your-token-here'
  }
});

const data = await response.json();
console.log(data);
```

**Update User Details:**
```javascript
const response = await fetch('/user/123456789', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer your-token-here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com'
  })
});

const data = await response.json();
console.log(data);
```

---

## Response Data Fields

| Field | Type | Description |
|-------|------|-------------|
| id | number | Shopify customer ID |
| email | string | Customer's email address |
| phone | string | Customer's phone number |
| firstName | string | Customer's first name |
| lastName | string | Customer's last name |
| fullName | string | Combined first and last name |
| createdAt | string | ISO 8601 timestamp of account creation |
| updatedAt | string | ISO 8601 timestamp of last update |
| ordersCount | number | Total number of orders placed |
| totalSpent | string | Total amount spent by customer |
| verifiedEmail | boolean | Whether email is verified |
| acceptsMarketing | boolean | Whether customer accepts marketing |
| defaultAddress | object/null | Customer's default shipping address |
