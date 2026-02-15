# Logs Not Showing - Debug Guide

## Issues Found and Fixed

### ✅ Fixed Issues

1. **Empty Array Bug**: Empty arrays (`[]`) are truthy in JavaScript, causing empty strings to be sent to the API
   - Fixed in `logsApi.js` to check array length before sending
   
2. **Missing CSS Styles**: `page-container` and `error-message` classes were missing
   - Added to `styles.css`

3. **Added Debug Logging**: Console logs added to help identify issues
   - Check browser console (F12) for detailed logging

## How to Test

### 1. Open Browser Console (F12)

Navigate to http://localhost:5175/logs and check for console messages:

**Expected Console Output:**
```
Loading logs with account: 0x95e38e215CDe9655f6cF5E89E89d00e0BB62144a
Filters: {level: [], category: [], ...}
Logs loaded: {success: true, logs: [...], pagination: {...}}
Loading stats with account: 0x95e38e215CDe9655f6cF5E89E89d00e0BB62144a
Stats loaded: {total: 177, ...}
```

**Common Errors to Look For:**
- `Failed to fetch` - Backend not running or CORS issue
- `Unauthorized` - Admin address mismatch
- `No wallet connected` - Wallet not connected
- Network errors - API URL wrong

### 2. Verify Configuration

**Backend `.env`:**
```bash
cd C:\Users\divya\Desktop\DJ\Projects\Krackhack3\backend
Get-Content .env | Select-String "ADMIN"
```
Expected: `ADMIN_ADDRESS=0x95e38e215CDe9655f6cF5E89E89d00e0BB62144a`

**Frontend `.env`:**
```bash
cd C:\Users\divya\Desktop\DJ\Projects\Krackhack3\frontend
Get-Content .env | Select-String "ADMIN"
```
Expected: `VITE_ADMIN_ADDRESS=0x95e38e215CDe9655f6cF5E89E89d00e0BB62144a`

**Must Match** (case-insensitive)

### 3. Test Backend Directly

```powershell
$headers = @{'X-Wallet-Address'='0x95e38e215CDe9655f6cF5E89E89d00e0BB62144a'}
Invoke-RestMethod -Uri 'http://localhost:5000/api/logs?limit=5' -Headers $headers
```

If this works, backend is fine. If not:
- Check if MongoDB is running
- Check if backend server is running
- Check for errors in backend terminal

### 4. Check Wallet Connection

1. Open http://localhost:5175/logs
2. Look at the page:
   - ❌ "Wallet Not Connected" → Connect wallet
   - ❌ "Access Denied" → Wrong wallet or env mismatch
   - ❌ Shows error message → Check console for details
   - ✅ Shows logs interface → Working!

### 5. Check Network Tab

1. Open DevTools (F12) → Network tab
2. Refresh the page
3. Look for requests to `/api/logs`
4. Check:
   - Status code (should be 200)
   - Response data
   - Request headers (should include `X-Wallet-Address`)

## Common Issues

### Issue: "No logs found matching the current filters"

**Solution**: Click the "🔄 Reset" button to clear all filters

### Issue: Logs page is blank

**Solutions:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5)
3. Check console for errors

### Issue: "Access Denied"

**Solutions:**
1. Verify admin addresses match in both `.env` files
2. Ensure wallet is connected
3. Ensure you're connecting with the correct wallet

### Issue: CORS errors in console

**Solution:**
1. Verify backend CORS_ORIGIN includes frontend URL
2. Backend `.env` should have: `CORS_ORIGIN=http://localhost:5173`
3. If frontend is on different port (5175), update backend `.env`

### Issue: Network error / Failed to fetch

**Solutions:**
1. Check backend is running: `http://localhost:5000/api/health`
2. Check API_URL in frontend `.env`: `VITE_API_URL=http://localhost:5000/api`
3. Restart backend server

## Quick Fix Checklist

- [ ] Backend server is running on port 5000
- [ ] Frontend server is running  
- [ ] MongoDB is running
- [ ] Wallet is connected
- [ ] Connected wallet matches ADMIN_ADDRESS in both .env files
- [ ] Browser console shows no errors
- [ ] Network tab shows successful API calls (status 200)

## Testing Steps

1. **Restart Backend:**
   ```bash
   cd C:\Users\divya\Desktop\DJ\Projects\Krackhack3\backend
   npm start
   ```

2. **Check Health:**
   Open: http://localhost:5000/api/health
   Should see: `{"success":true,"message":"PayStream Backend API",...}`

3. **Restart Frontend:**
   ```bash
   cd C:\Users\divya\Desktop\DJ\Projects\Krackhack3\frontend
   npm run dev
   ```

4. **Open Logs Page:**
   Navigate to: http://localhost:5175/logs
   
5. **Connect Wallet:**
   Use MetaMask or wallet with address: `0x95e38e215CDe9655f6cF5E89E89d00e0BB62144a`

6. **Check Console:**
   Should see logs loading messages

7. **Verify Logs Display:**
   Should see table with log entries
   Should see statistics at top

## If Still Not Working

1. **Check browser console** - Share any error messages
2. **Check backend terminal** - Share any error output
3. **Verify API response** manually:
   ```powershell
   $headers = @{'X-Wallet-Address'='0x95e38e215CDe9655f6cF5E89E89d00e0BB62144a'}
   Invoke-RestMethod -Uri 'http://localhost:5000/api/logs?limit=1' -Headers $headers | ConvertTo-Json -Depth 5
   ```
4. **Take screenshot** of the logs page showing the issue
