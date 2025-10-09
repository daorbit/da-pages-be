# DA Pages Backend - Express + MongoDB

This is the backend API for DA Dynamic Pages, built with **Express.js + MongoDB (Mongoose)**.

## 🚀 Getting Started

### Prerequisites
- Node.js (version 18 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` and configure your MongoDB connection string.

3. Start MongoDB (if running locally):
```bash
mongod
```

4. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## 📜 Available Scripts

- **`npm start`** - Start production server
- **`npm run dev`** - Start development server with nodemon

## 🗄️ Database Schema

### Page Model
```javascript
{
  title: String (required, max 200 chars),
  description: String (required, max 500 chars),
  imageUrl: String (required, valid URL),
  thumbnailUrl: String (required, valid URL),
  groups: [String] (max 10 items),
  editorType: String (required, 'markdown' | 'wysiwyg'),
  slug: String (required, unique, max 100 chars),
  content: String (required),
  createdAt: Date,
  updatedAt: Date
}
```

## 🛠️ API Endpoints

### Pages
- **GET** `/api/pages` - Get all pages (with pagination, search, filtering)
- **GET** `/api/pages/:slug` - Get page by slug
- **GET** `/api/pages/by-id/:id` - Get page by ID
- **POST** `/api/pages` - Create new page
- **PUT** `/api/pages/:id` - Update page
- **DELETE** `/api/pages/:id` - Delete page

### Health Check
- **GET** `/api/health` - Server health status

## 🔧 Features

- ✅ Full CRUD operations for pages
- ✅ Input validation with express-validator
- ✅ Automatic slug generation from title
- ✅ Pagination and search functionality
- ✅ Proper error handling and status codes
- ✅ Security middleware (helmet, CORS, rate limiting)
- ✅ Request logging with Morgan
- ✅ MongoDB connection with Mongoose