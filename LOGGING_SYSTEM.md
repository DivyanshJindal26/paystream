# PayStream Logging System

## Overview

The PayStream backend includes a comprehensive logging system that captures all system activities, HTTP requests, database operations, blockchain interactions, security events, and business logic operations in MongoDB. The logs are accessible only to the admin wallet address through a powerful frontend interface.

## Features

- **Comprehensive Logging**: Captures HTTP requests, database operations, blockchain transactions, security events, and business logic
- **MongoDB Storage**: All logs are stored in MongoDB with efficient indexing for fast querying
- **Admin-Only Access**: Logs are only accessible to the wallet address configured as `ADMIN_ADDRESS`
- **Advanced Filtering**: Filter by level, category, date range, user address, endpoint, and more
- **Real-time Updates**: Auto-refresh capability for monitoring live system activity
- **Export Functionality**: Export filtered logs as JSON for offline analysis
- **Performance Metrics**: Track request durations, error rates, and other statistics
- **Security Logging**: Track unauthorized access attempts and security events
- **Detailed Context**: Captures request/response bodies, headers, query params, and error stack traces

## Log Levels

- **info**: General informational messages
- **success**: Successful operations
- **warn**: Warning messages
- **error**: Error messages
- **debug**: Debugging information
- **security**: Security-related events

## Log Categories

- **http**: HTTP requests and responses
- **database**: Database operations
- **blockchain**: Blockchain interactions
- **auth**: Authentication and authorization events
- **system**: System events (startup, shutdown, etc.)
- **business**: Business logic operations

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install uuid
```

### 2. Configure Admin Address

Edit `backend/.env`:

```env
# Admin wallet address for accessing logs (lowercase)
ADMIN_ADDRESS=0xYourAdminWalletAddress
```

**Important**: Use lowercase for the address.

### 3. Database Collections

The logging system creates a `logs` collection in MongoDB with the following indexes:

- `timestamp` (descending)
- `level + timestamp`
- `category + timestamp`
- `userAddress + timestamp`
- `endpoint + timestamp`
- `tags`
- Text index on `message` and `details`

## Frontend Setup

### 1. Configure Admin Address

Edit `frontend/.env`:

```env
# Admin wallet address for accessing system logs (lowercase)
VITE_ADMIN_ADDRESS=0xYourAdminWalletAddress
```

**Important**: This should match the `ADMIN_ADDRESS` in `backend/.env`.

### 2. Access the Logs

1. Connect your wallet
2. If your wallet address matches the admin address, a "Logs" link will appear in the navbar
3. Click the "Logs" link to access the logging dashboard

## API Endpoints

All endpoints require the admin wallet address in the `X-Wallet-Address` header or as query parameter `walletAddress`.

### GET /api/logs

Query logs with filters.

**Query Parameters:**
- `level` (string): Filter by log level (comma-separated for multiple)
- `category` (string): Filter by category (comma-separated for multiple)
- `startDate` (ISO8601): Start date/time
- `endDate` (ISO8601): End date/time
- `userAddress` (string): Filter by user address
- `endpoint` (string): Filter by endpoint
- `search` (string): Full-text search in messages and details
- `tags` (string): Filter by tags (comma-separated)
- `page` (number): Page number (default: 1)
- `limit` (number): Results per page (default: 50, max: 500)
- `sortBy` (string): Field to sort by (default: timestamp)
- `sortOrder` (string): asc or desc (default: desc)

**Example:**
```
GET /api/logs?level=error,warn&startDate=2024-01-01&page=1&limit=50
Headers: X-Wallet-Address: 0xAdminAddress
```

### GET /api/logs/stats

Get log statistics.

**Query Parameters:**
- `startDate` (ISO8601): Start date/time
- `endDate` (ISO8601): End date/time

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 1234,
    "errors": 45,
    "avgDuration": 123.45,
    "byLevel": {
      "info": 800,
      "warn": 234,
      "error": 45,
      "success": 155
    },
    "byCategory": {
      "http": 900,
      "database": 200,
      "business": 134
    }
  }
}
```

### GET /api/logs/export

Export logs as JSON file.

**Query Parameters:**
Same as GET /api/logs, plus:
- `limit` (number): Max results to export (default: 1000, max: 10000)

**Response:**
Downloads a JSON file with the filtered logs.

### DELETE /api/logs/cleanup

Delete old logs.

**Query Parameters:**
- `daysToKeep` (number): Number of days to keep (default: 90, max: 365)

**Response:**
```json
{
  "success": true,
  "deletedCount": 523,
  "message": "Deleted 523 logs older than 90 days"
}
```

### GET /api/logs/levels

Get available log levels.

**Response:**
```json
{
  "success": true,
  "levels": ["info", "warn", "error", "debug", "success", "security"]
}
```

### GET /api/logs/categories

Get available log categories.

**Response:**
```json
{
  "success": true,
  "categories": ["http", "database", "blockchain", "auth", "system", "business"]
}
```

## Programmatic Logging

### HTTP Logging

HTTP requests are automatically logged by the `requestLogger` middleware. No manual logging needed.

### Database Logging

```javascript
import LoggerService from '../services/loggerService.js';

await LoggerService.logDatabase({
  level: 'info',
  operation: 'create',
  collection: 'employees',
  documentId: employee._id,
  message: 'Employee created',
  details: { name: employee.name },
  userAddress: employerAddress,
});
```

### Blockchain Logging

```javascript
await LoggerService.logBlockchain({
  level: 'success',
  message: 'Transaction confirmed',
  transactionHash: tx.hash,
  blockNumber: receipt.blockNumber,
  contractAddress: contract.address,
  gasUsed: receipt.gasUsed.toString(),
  userAddress: account,
  details: { /* additional data */ },
});
```

### Security Logging

```javascript
await LoggerService.logSecurity({
  level: 'warn',
  message: 'Unauthorized access attempt',
  userAddress: req.body.walletAddress,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  details: { attemptedEndpoint: req.path },
  tags: ['unauthorized', 'security'],
});
```

### Business Logic Logging

```javascript
await LoggerService.logBusiness({
  level: 'success',
  message: 'Salary stream created',
  employerAddress,
  employeeAddress,
  details: {
    monthlySalary: stream.monthlySalary,
    durationMonths: stream.durationMonths,
  },
  tags: ['stream', 'create', 'payroll'],
});
```

### System Logging

```javascript
await LoggerService.logSystem({
  level: 'info',
  message: 'Server started',
  details: {
    port: PORT,
    nodeVersion: process.version,
  },
  tags: ['startup'],
});
```

## Frontend Usage

### Filters

The frontend provides comprehensive filtering options:

1. **Level Filter**: Select one or more log levels
2. **Category Filter**: Select one or more categories
3. **Date Range**: Filter by start and end date/time
4. **User Address**: Filter by wallet address
5. **Endpoint**: Filter by API endpoint
6. **Search**: Full-text search in messages and details

### Features

1. **Auto-refresh**: Enable auto-refresh to monitor logs in real-time
2. **Export**: Export filtered logs as JSON
3. **Cleanup**: Delete old logs (90+ days)
4. **Detail View**: Click any log row to view full details including:
   - Request/response bodies
   - Query parameters
   - Headers
   - Error stack traces
   - All additional metadata

### Statistics Dashboard

The dashboard shows:
- Total log count
- Error count
- Average request duration
- Breakdown by level and category

## Security Considerations

1. **Admin-Only Access**: Only the wallet address configured as `ADMIN_ADDRESS` can access logs
2. **Sensitive Data Redaction**: Passwords, private keys, secrets, and tokens are automatically redacted
3. **Security Event Logging**: All unauthorized access attempts are logged with IP and user agent
4. **Request ID Tracking**: Each request is assigned a unique ID for correlation

## Performance

- **Indexed Queries**: All common query patterns are indexed for fast retrieval
- **Pagination**: Large result sets are paginated to prevent memory issues
- **Limit Controls**: Maximum limits prevent excessive data transfer
- **Async Logging**: Logging operations are non-blocking

## Data Retention

By default, logs are kept indefinitely. Use the cleanup endpoint to delete old logs:

```javascript
// Delete logs older than 90 days
DELETE /api/logs/cleanup?daysToKeep=90
```

You can also set up automatic cleanup with a cron job or scheduled task.

## Troubleshooting

### Logs not appearing in frontend

1. Verify `VITE_ADMIN_ADDRESS` in frontend `.env` matches your wallet address (lowercase)
2. Verify `ADMIN_ADDRESS` in backend `.env` is set correctly (lowercase)
3. Check browser console for errors
4. Verify MongoDB connection is working

### "Unauthorized" error when accessing logs

1. Ensure your wallet is connected
2. Verify your wallet address matches the admin address exactly (case-insensitive)
3. Check that the frontend is sending the wallet address in headers

### Missing logs

1. Verify MongoDB connection
2. Check if logging middleware is registered in server.js
3. Ensure LoggerService is imported in route handlers
4. Check MongoDB logs collection exists

## Example Queries

### Find all errors in the last 24 hours

```
GET /api/logs?level=error&startDate=2024-02-14T00:00:00Z&endDate=2024-02-15T00:00:00Z
```

### Find all requests from a specific user

```
GET /api/logs?userAddress=0x1234...&category=http
```

### Search for specific text

```
GET /api/logs?search=stream+created
```

### Get all security events

```
GET /api/logs?level=security&category=auth
```

## Contributing

When adding new features, ensure proper logging:

1. Log all HTTP requests (automatic via middleware)
2. Log database operations (create, update, delete)
3. Log blockchain transactions
4. Log security events (authentication, authorization)
5. Log business logic events (stream creation, payments, etc.)

Use appropriate log levels and include relevant context in the `details` field.
