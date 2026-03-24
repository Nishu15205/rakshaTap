# 🚀 Vercel Deployment Guide

## ✅ Database Setup (Required)

This app uses **PostgreSQL** for Vercel deployment. Choose one:

### Option 1: Vercel Postgres (Easiest - Free)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Open your project → **Storage** tab
3. Click **Create Database** → **Postgres**
4. Choose region closest to your users
5. Vercel will auto-add `DATABASE_URL` to your environment variables

### Option 2: Supabase (Free - Recommended)

1. Go to [supabase.com](https://supabase.com) and create free account
2. Create new project
3. Go to **Project Settings** → **Database**
4. Copy **Connection string** (URI format)
5. Add as `DATABASE_URL` in Vercel environment variables

### Option 3: Neon (Free)

1. Go to [neon.tech](https://neon.tech) and create free account
2. Create new project
3. Copy connection string
4. Add as `DATABASE_URL` in Vercel environment variables

---

## 📋 Step-by-Step Deployment

### 1. Fork/Clone this repo to your GitHub

### 2. Import to Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Vercel will auto-detect Next.js settings

### 3. Add Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ Yes |
| `NEXTAUTH_SECRET` | Random 32+ char string | ✅ Yes |
| `NEXTAUTH_URL` | Your Vercel app URL | ✅ Yes |

Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### 4. Deploy!
Click **Deploy** and wait for build to complete.

---

## 🔧 Environment Variables Template

Copy to Vercel environment variables:

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
NEXTAUTH_SECRET=your-random-secret-key-here
NEXTAUTH_URL=https://your-app.vercel.app
```

---

## ✅ What Works on Vercel

| Feature | Status | Notes |
|---------|--------|-------|
| Next.js 16 App Router | ✅ | Full support |
| PWA + Service Worker | ✅ | Works in browser |
| WebLLM AI | ✅ | Runs in browser |
| Tesseract.js OCR | ✅ | Runs in browser |
| Whisper / Web Speech | ✅ | Runs in browser |
| PostgreSQL Database | ✅ | Vercel Postgres / Supabase |
| Emergency Contacts | ✅ | Stored in database |
| SOS Alerts | ✅ | Full functionality |

---

## 🐛 Troubleshooting

### Build Error: "Prisma Client could not be generated"
- Make sure `DATABASE_URL` is set correctly
- Database must be accessible from Vercel

### Runtime Error: "Can't reach database server"
- Check if database allows connections from Vercel IPs
- For Supabase: Ensure IPv4 is enabled

### PWA not installing
- Must be deployed with HTTPS (Vercel does this automatically)
- Clear browser cache and reload

---

## 📱 After Deployment

1. Open your Vercel app URL
2. Test SOS button
3. Add emergency contacts
4. Test AI chat
5. Install PWA (Add to Home Screen)

---

## 🔗 Useful Links

- [Vercel Postgres Docs](https://vercel.com/docs/storage/vercel-postgres)
- [Supabase Docs](https://supabase.com/docs)
- [Prisma PostgreSQL](https://www.prisma.io/docs/concepts/database-connectors/postgresql)

---

**Need help? Create an issue on GitHub!**
