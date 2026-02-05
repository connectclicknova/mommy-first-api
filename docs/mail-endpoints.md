# Mail Endpoints

## POST /mail/send
Send an email using Mailjet. Requires a Bearer token.

### Authentication
Include an Authorization header:

- Authorization: Bearer <token>

Get a token from POST /auth/token.

### Request Body

```json
{
  "toEmail": "recipient@example.com",
  "toName": "Recipient Name",
  "subject": "Test email",
  "text": "Hello from Mailjet",
  "html": "<p>Hello from <b>Mailjet</b></p>",
  "fromEmail": "sender@yourdomain.com",
  "fromName": "Your Brand"
}
```

#### Required fields
- `toEmail`
- `subject`
- `text` or `html` (at least one)

#### Optional fields
- `toName`
- `fromEmail` (defaults to `MAILJET_FROM_EMAIL`)
- `fromName` (defaults to `MAILJET_FROM_NAME` or "Mommy First")

### Success Response

```json
{
  "success": true,
  "message": "Email sent",
  "data": {
    "Messages": [
      {
        "Status": "success",
        "To": [
          {
            "Email": "recipient@example.com",
            "MessageID": 1234567890,
            "MessageUUID": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          }
        ]
      }
    ]
  }
}
```

### Error Responses

#### Missing required fields

```json
{
  "success": false,
  "message": "toEmail, subject, and either text or html are required"
}
```

#### Missing Mailjet credentials

```json
{
  "success": false,
  "message": "Mailjet credentials are not configured"
}
```

#### Mailjet API error

```json
{
  "success": false,
  "message": "Failed to send email",
  "error": "<error message>",
  "details": { "...": "..." }
}
```

### Environment Variables

- `MAILJET_API_KEY`
- `MAILJET_API_SECRET`
- `MAILJET_FROM_EMAIL` (optional default sender)
- `MAILJET_FROM_NAME` (optional default sender name)
