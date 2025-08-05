# Xion Showcase Backend

This is the backend server for the Xion Showcase Buddy application.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the server directory with:
   ```
   PORT=3001
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   NODE_ENV=development
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Content Management
- `GET /api/content` - Get all content items
- `POST /api/content` - Submit new content (with file upload)
- `PUT /api/content/:id/status` - Update content status (admin only)
- `DELETE /api/content/:id` - Delete content (admin only)

### Authentication
- `POST /api/admin/login` - Admin login

### Chat
- `POST /api/chat` - Chat assistant endpoint

### Health Check
- `GET /api/health` - Server health check

## Default Admin Credentials
- Username: `admin`
- Password: `password`

## File Upload
- Supported formats: Images and videos
- Maximum file size: 10MB
- Files are stored in the `uploads/` directory 