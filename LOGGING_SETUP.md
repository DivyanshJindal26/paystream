# Logging System Quick Setup

## 🚀 Quick Start

### 1. Backend Configuration

```bash
cd backend
npm install  # uuid is now included
```

Edit `backend/.env`:
```env
ADMIN_ADDRESS=0xyouradminwalletaddress  # lowercase
```

### 2. Frontend Configuration

Edit `frontend/.env`:
```env
VITE_ADMIN_ADDRESS=0xyouradminwalletaddress  # lowercase, same as backend
```

### 3. Start the Services

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 4. Access Logs

1. Open the frontend (http://localhost:5173)
2. Connect your admin wallet
3. Click "📊 Logs" in the navbar (only visible to admin)

## 📋 What's Been Added

### Backend Files
- `models/Log.js` - MongoDB schema for logs
- `services/loggerService.js` - Centralized logging service
- `middleware/logger.js` - Request logging and admin verification
- `routes/logs.js` - API endpoints for querying logs

### Frontend Files
- `services/logsApi.js` - API client for logs
- `components/LogsViewer.jsx` - Main logs viewer component
- `components/LogsViewer.css` - Styling for logs viewer
- `pages/LogsPage.jsx` - Logs page with admin check

### Modified Files
- `backend/server.js` - Integrated logging middleware and routes
- `backend/routes/employees.js` - Added logging for all operations
- `backend/routes/streams.js` - Added logging for all operations
- `backend/package.json` - Added uuid dependency
- `frontend/src/App.jsx` - Added logs route
- `frontend/src/components/Navbar.jsx` - Added admin-only logs link

### Configuration Files
- `backend/.env.example` - Added ADMIN_ADDRESS
- `frontend/.env.example` - Added VITE_ADMIN_ADDRESS

## 🔒 Security Features

- ✅ Admin-only access with wallet verification
- ✅ Automatic sensitive data redaction (passwords, keys, secrets)
- ✅ Security event logging for unauthorized attempts
- ✅ IP and user agent tracking

## 📊 Log Types Captured

1. **HTTP Requests** - All API requests with timing, status codes, request/response data
2. **Database Operations** - Creates, updates, deletes with full context
3. **Blockchain Events** - Transactions, confirmations, gas usage
4. **Security Events** - Auth attempts, unauthorized access
5. **System Events** - Server startup, shutdown, errors
6. **Business Logic** - Stream creation, employee management, etc.

## 🎯 Key Features

### Advanced Filtering
- Filter by level (info, warn, error, success, debug, security)
- Filter by category (http, database, blockchain, auth, system, business)
- Date/time range filtering
- User address filtering
- Endpoint filtering
- Full-text search

### Real-time Monitoring
- Auto-refresh capability
- Live statistics dashboard
- Performance metrics (avg duration, error rate)

### Log Management
- Export filtered logs as JSON
- Cleanup old logs (90+ days)
- Paginated results for performance

### Detail View
- Click any log to see full details
- Request/response bodies
- Error stack traces
- All metadata and context

## 📖 Documentation

See [LOGGING_SYSTEM.md](./LOGGING_SYSTEM.md) for comprehensive documentation including:
- API endpoint reference
- Programmatic logging examples
- Security considerations
- Performance optimization
- Troubleshooting guide

## ⚠️ Important Notes

1. **Admin Address**: Must be lowercase in both backend and frontend .env files
2. **MongoDB**: Ensure MongoDB is running before starting the backend
3. **First Time**: Set your admin wallet address before accessing logs
4. **Data Retention**: Logs are kept indefinitely unless manually cleaned up

## 🧪 Testing

1. Connect with admin wallet
2. Navigate to /logs
3. Perform some actions (create employee, create stream)
4. Refresh logs to see your actions logged
5. Try different filters
6. View detailed log information
7. Export logs
8. Test cleanup (optional)

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify admin address matches (lowercase)
3. Check MongoDB connection
4. Review [LOGGING_SYSTEM.md](./LOGGING_SYSTEM.md) troubleshooting section
