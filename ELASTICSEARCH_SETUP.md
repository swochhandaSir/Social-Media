# Elasticsearch Setup Guide

## Prerequisites
- Elasticsearch Cloud account (already configured with the provided endpoint)
- API Key for authentication

## Configuration

### 1. Add Elasticsearch API Key to .env

Add the following to your `backend/.env` file:

```env
ELASTICSEARCH_API_KEY=your_api_key_here
```

Replace `your_api_key_here` with your actual Elasticsearch API key.

### 2. Index Existing Users

After setting up the API key, run the following command to index all existing users:

```bash
cd backend
node index-users.js
```

This will:
- Initialize the Elasticsearch index with proper field mappings
- Bulk index all existing users from MongoDB into Elasticsearch

## Field Mappings

The following fields are indexed for user search:

```javascript
{
  "userName": {
    "type": "text",
    "fields": {
      "keyword": { "type": "keyword" }
    }
  },
  "email": {
    "type": "text",
    "fields": {
      "keyword": { "type": "keyword" }
    }
  },
  "bio": {
    "type": "text"
  }
}
```

## Search Features

### Multi-field Search
The search queries across:
- `userName` (with 2x boost for relevance)
- `email`
- `bio`

### Fuzzy Matching
Automatic fuzzy matching is enabled to handle typos and similar spellings.

### Fallback
If Elasticsearch fails, the system automatically falls back to MongoDB regex search.

## API Endpoints

### Search Users
```
GET /api/users/search?q=searchQuery
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "_id": "userId",
    "userName": "john_doe",
    "email": "john@example.com",
    "bio": "Software developer",
    "score": 1.5
  }
]
```

## Automatic Indexing

New users are automatically indexed when they register, so no manual intervention is needed for new sign-ups.

## Testing

1. Start your backend server:
   ```bash
   cd backend
   npm start
   ```

2. The search bar will appear in the navigation when logged in

3. Type a username or email to search for users

4. Click on a user to view their profile

## Troubleshooting

### Elasticsearch Connection Issues
- Verify your API key is correct in `.env`
- Check that the Elasticsearch endpoint is accessible
- Review backend console logs for detailed error messages

### Users Not Appearing in Search
- Run `node index-users.js` to re-index all users
- Check that new users are being indexed on registration (check console logs)

### Search Not Working
- The system will fall back to MongoDB search if Elasticsearch fails
- Check browser console and backend logs for errors
