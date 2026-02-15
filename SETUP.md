# Docker Setup - Simple Instructions

## What You Need to Edit

### 1. Root `.env` File (THIS ONE IS IMPORTANT)

Edit `c:\Users\divya\Desktop\DJ\Projects\Krackhack3\.env`

**Only change this line:**
```
MONGODB_URI=mongodb+srv://your_actual_mongodb_atlas_connection_string
```

Get your MongoDB Atlas connection string from https://cloud.mongodb.com

**Leave everything else as is.**

---

## What You DON'T Need to Touch

❌ **DO NOT EDIT:**
- `frontend/.env` - Only for local development, not used by Docker
- `backend/.env` - Not used by Docker
- `docker-compose.yml` - Already configured
- `frontend/Dockerfile` - Already configured
- `backend/Dockerfile` - Already configured

---

## How to Deploy

```bash
# 1. Make sure you edited the root .env file with your MongoDB Atlas URI

# 2. Run this ONE command
docker compose up -d --build

# 3. Wait 2-3 minutes for everything to build

# 4. Access your app
# Frontend: http://web3.iitmandi.co.in:8351
# Backend API: http://web3.iitmandi.co.in:8352
```

---

## If Something Goes Wrong

```bash
# Stop everything
docker compose down

# Check logs
docker compose logs -f

# Try again
docker compose up -d --build
```

---

## File Guide

```
Krackhack3/
├── .env                    ← EDIT THIS (MongoDB URI only)
├── .env.example            ← Template (don't edit)
├── docker-compose.yml      ← Don't touch
├── frontend/
│   ├── .env               ← Ignore (local dev only)
│   └── Dockerfile         ← Don't touch
└── backend/
    ├── .env               ← Ignore (not used)
    └── Dockerfile         ← Don't touch
```

---

## That's It!

Just edit the root `.env` with your MongoDB Atlas connection string and run `docker compose up -d --build`.
