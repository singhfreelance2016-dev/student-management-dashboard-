# Student Management API Backend

RESTful API for Student Management with full CRUD operations.

## Tech Stack
- [**Node.js**](https://nodejs.org/) - JavaScript runtime
- [**Express.js**](https://expressjs.com/) - Web framework
- [**MongoDB Atlas**](https://www.mongodb.com/cloud/atlas) - Cloud database
- [**Railway**](https://railway.app/) - Deployment platform

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/records` | Create new student |
| GET | `/api/records` | Get all students |
| GET | `/api/records/:id` | Get single student |
| PUT | `/api/records/:id` | Update student |
| DELETE | `/api/records/:id` | Delete student |

## Local Development

1. Install dependencies:
   ```bash
   npm install