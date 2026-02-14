# PayStream Backend

Express.js + MongoDB backend for PayStream salary streaming platform.

## Features

- **Employee Management**: CRUD operations for employee records
- **Stream Tracking**: Monitor blockchain stream status
- **Data Persistence**: MongoDB storage for employee lists and stream metadata
- **RESTful API**: JSON endpoints for frontend integration

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup MongoDB

**Option A: MongoDB Atlas (Recommended for hackathon/demo)**

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (M0 Free Tier)
4. Click "Connect" → "Connect your application"
5. Copy the connection string
6. Update `.env` file:

```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/paystream?retryWrites=true&w=majority
```

Replace `username`, `password`, and cluster URL with your actual credentials.

**Option B: Local MongoDB**

1. Download MongoDB Community Server from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Install and start MongoDB:

```bash
# Windows (as Administrator)
net start MongoDB

# Or run manually
mongod --dbpath C:\data\db
```

3. Keep default `.env` setting:

```env
MONGODB_URI=mongodb://localhost:27017/paystream
```

### 3. Configure Environment

Update `.env` file with your settings:

```env
PORT=5000
MONGODB_URI=<your-mongodb-uri>
CORS_ORIGIN=http://localhost:5173
```

### 4. Start Server

**Development mode (auto-restart on changes):**

```bash
npm run dev
```

**Production mode:**

```bash
npm start
```

Server will run on `http://localhost:5000`

## API Endpoints

### Health Check

```http
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected"
}
```

### Employees

#### Get all employees for employer

```http
GET /api/employees?employerAddress=0x...
```

#### Add employee

```http
POST /api/employees
Content-Type: application/json

{
  "employerAddress": "0x...",
  "walletAddress": "0x...",
  "name": "John Doe",
  "email": "john@example.com",
  "department": "Engineering",
  "notes": "Senior developer",
  "tags": ["full-time", "senior"]
}
```

#### Bulk add employees

```http
POST /api/employees/bulk
Content-Type: application/json

{
  "employerAddress": "0x...",
  "employees": [
    {"walletAddress": "0x...", "name": "Alice"},
    {"walletAddress": "0x...", "name": "Bob"}
  ]
}
```

#### Update employee

```http
PUT /api/employees/:id
Content-Type: application/json

{
  "name": "John Smith",
  "department": "Management"
}
```

#### Delete employee

```http
DELETE /api/employees/:id
```

### Streams

#### Get all streams for employer

```http
GET /api/streams?employerAddress=0x...
```

#### Get streams for employee

```http
GET /api/streams?employeeAddress=0x...
```

#### Create stream

```http
POST /api/streams
Content-Type: application/json

{
  "employeeAddress": "0x...",
  "employerAddress": "0x...",
  "monthlySalary": "1000000000000000000000",
  "durationMonths": "12",
  "taxPercent": "10",
  "creationTxHash": "0x..."
}
```

#### Update stream status

```http
PUT /api/streams/:id/status
Content-Type: application/json

{
  "status": "paused",
  "statusTxHash": "0x..."
}
```

Status values: `active`, `paused`, `cancelled`, `completed`

#### Cancel stream

```http
POST /api/streams/cancel
Content-Type: application/json

{
  "employeeAddress": "0x...",
  "employerAddress": "0x...",
  "cancelTxHash": "0x..."
}
```

## Database Schema

### Employee Model

```javascript
{
  walletAddress: String,      // Ethereum address
  employerAddress: String,    // Employer's address
  name: String,               // Optional display name
  email: String,              // Optional email
  department: String,         // Optional department
  notes: String,              // Optional notes
  tags: [String],             // Optional tags
  createdAt: Date,
  updatedAt: Date
}
```

Unique index: `(employerAddress, walletAddress)`

### Stream Model

```javascript
{
  employeeAddress: String,    // Employee's address
  employerAddress: String,    // Employer's address
  monthlySalary: String,      // Wei format (use BigInt)
  ratePerSecond: String,      // Calculated from salary
  taxPercent: Number,         // 0-100
  durationMonths: Number,
  status: String,             // active|paused|cancelled|completed
  creationTxHash: String,     // Blockchain tx hash
  statusTxHash: String,       // Latest status update tx
  cancelTxHash: String,       // Cancel transaction hash
  createdAt: Date,
  updatedAt: Date
}
```

Unique index: `(employerAddress, employeeAddress)`

## Error Handling

All endpoints return consistent error format:

```json
{
  "error": "Error message description"
}
```

HTTP Status Codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `404`: Not Found
- `500`: Server Error

## Development

### File Structure

```
backend/
├── server.js           # Express server setup
├── config/
│   └── db.js          # MongoDB connection
├── models/
│   ├── Employee.js    # Employee schema
│   └── Stream.js      # Stream schema
├── routes/
│   ├── employees.js   # Employee endpoints
│   └── streams.js     # Stream endpoints
├── .env               # Environment variables
└── package.json
```

### Testing with cURL

```bash
# Health check
curl http://localhost:5000/api/health

# Get employees
curl http://localhost:5000/api/employees?employerAddress=0x...

# Add employee
curl -X POST http://localhost:5000/api/employees \
  -H "Content-Type: application/json" \
  -d '{"employerAddress":"0x...","walletAddress":"0x..."}'
```

## Troubleshooting

### MongoDB Connection Failed

**Error**: `MongooseServerSelectionError: connect ECONNREFUSED`

**Solution**: 
1. Verify MongoDB is running: `mongod --version`
2. Check `.env` has correct `MONGODB_URI`
3. For Atlas, ensure IP whitelist includes your IP (or use `0.0.0.0/0` for development)

### CORS Errors

**Error**: `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solution**: Update `CORS_ORIGIN` in `.env` to match frontend URL

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::5000`

**Solution**: 
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Change PORT in .env
PORT=5001
```

## Production Deployment

### Environment Variables

Set these on your hosting platform:

```env
PORT=5000
MONGODB_URI=mongodb+srv://...
CORS_ORIGIN=https://yourfrontend.com
NODE_ENV=production
```

### Hosting Options

- **Render.com**: Free tier, auto-deploy from Git
- **Railway.app**: Generous free tier, simple setup
- **Heroku**: Well-documented, easy MongoDB add-on
- **Vercel**: Backend as serverless functions

### Database Backups

For Atlas:
1. Dashboard → Clusters → ... → "View Monitoring"
2. "Backup" tab → Enable Cloud Backup

For local MongoDB:
```bash
mongodump --uri="mongodb://localhost:27017/paystream" --out=backup/
```

## License

MIT - Built for Krack Hack 3 Hackathon
