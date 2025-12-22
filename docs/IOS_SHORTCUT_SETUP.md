# iOS Shortcut Quick Add Flow

This document explains how to set up an iOS Shortcut that provides a streamlined expense adding experience using the PWA.

## How It Works

1. **Share Image**: User shares a receipt image (from Photos, Camera, or Share Sheet)
2. **Shortcut Uploads**: The shortcut uploads the image to the server
3. **Opens PWA**: The shortcut opens the PWA (as a launcher - iOS limitation)
4. **Auto-Detect Session**: PWA checks for pending sessions on launch
   - If 1 session: Auto-redirects to quick-add flow
   - If multiple sessions: Shows a picker with receipt thumbnails
5. **Complete in PWA**: User selects user, merchant, and enters amount in a mobile-optimized UI

> **Note**: Due to iOS limitations, PWAs opened from Shortcuts cannot receive URL parameters. The app works around this by checking for pending sessions on every launch.

## Benefits Over Native Shortcut Flow

- **Better Merchant Selection**: Full-screen search with recent merchants, type-to-filter, easy creation of new merchants
- **Better User Selection**: Tappable cards instead of scroll picker
- **Consistent UI**: Same beautiful UI as the web app
- **Easier Maintenance**: UI changes don't require shortcut updates

## Creating the iOS Shortcut

### Step 1: Create a New Shortcut

1. Open the **Shortcuts** app on iOS
2. Tap **+** to create a new shortcut
3. Name it "Add Expense" or similar

### Step 2: Configure Input Types

1. Tap the **(i)** button at the top
2. Enable "Show in Share Sheet"
3. Under "Share Sheet Types", select only **Images**

### Step 3: Add the Upload Action

Add these actions in order:

#### Action 1: Get Contents of URL (Upload Image)

- **URL**: `https://YOUR-SERVER-URL/api/shortcut/upload`
- **Method**: POST
- **Request Body**: Form
- **Add new field**:
  - Name: `image`
  - Value: Select "Shortcut Input" (the image from share sheet)

#### Action 2: Get Dictionary Value

- **Key**: `url`
- **Dictionary**: Output from previous action

#### Action 3: Open URL

- **URL**: Output from previous action

### Complete Shortcut (JSON Export)

```json
{
  "actions": [
    {
      "name": "Get Contents of URL",
      "parameters": {
        "url": "https://YOUR-SERVER-URL/api/shortcut/upload",
        "method": "POST",
        "requestBody": {
          "type": "form",
          "fields": [
            {
              "name": "image",
              "value": "{{Shortcut Input}}"
            }
          ]
        }
      }
    },
    {
      "name": "Get Dictionary Value",
      "parameters": {
        "key": "url",
        "dictionary": "{{Result of Get Contents of URL}}"
      }
    },
    {
      "name": "Open URL",
      "parameters": {
        "url": "{{Dictionary Value}}"
      }
    }
  ]
}
```

## Testing

### Using curl (from Terminal):

```bash
# Upload a test image
curl -X POST \
  -F "image=@/path/to/receipt.jpg" \
  http://localhost:3000/api/shortcut/upload

# Response:
# {"success":true,"sessionId":"abc-123","url":"http://localhost:3000/quick-add?session=abc-123"}
```

### Check session data:

```bash
curl http://localhost:3000/api/shortcut/session/abc-123

# Response:
# {"success":true,"imageUrl":"/api/files/shortcut-sessions/abc-123.jpg","contentType":"image/jpeg","expiresIn":599000}
```

## API Endpoints

### POST /api/shortcut/upload

Upload an image and get a session URL.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `image` (File)

**Response:**
```json
{
  "success": true,
  "sessionId": "uuid",
  "url": "https://your-app.com/quick-add?session=uuid"
}
```

### GET /api/shortcut/session/:sessionId

Get session data for the PWA.

**Response:**
```json
{
  "success": true,
  "imageUrl": "/api/files/shortcut-sessions/uuid.jpg",
  "contentType": "image/jpeg",
  "expiresIn": 599000
}
```

### POST /api/shortcut/session/:sessionId/complete

Mark session as complete (auto-called after expense is saved).

## Session Lifecycle

- Sessions expire after **10 minutes**
- Sessions are automatically cleaned up on expiry
- When an expense is saved, the session is marked complete and cleaned up immediately

## Troubleshooting

### Session Not Found (404)
- The session may have expired (10 minute TTL)
- Try sharing the image again

### Image Not Loading
- Check that the server's `BUCKET_STORAGE_PATH` is writable
- Check server logs for upload errors

### Shortcut Fails to Upload
- Verify the server URL is correct and accessible
- Ensure HTTPS is used for production
- Check that the image format is supported (JPEG, PNG, HEIC)
