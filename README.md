# BFHL — SRM Full Stack Engineering Challenge

A REST API that processes hierarchical node relationships and returns structured tree insights. Includes a polished single-page frontend.

## ⚡ Quick Start

```bash
npm install
npm start
# Server running on http://localhost:3000
```

## 📌 Before Deploying

Edit `index.js` lines 9–11 and replace the placeholder credentials:

```js
const USER_ID          = "yourname_ddmmyyyy";   // e.g. johndoe_17091999
const EMAIL_ID         = "your.email@college.edu";
const COLLEGE_ROLL     = "21XXXXXXX";
```

## 🔌 API

**POST** `/bfhl`

```json
// Request
{ "data": ["A->B", "A->C", "B->D", "X->Y", "Y->Z", "Z->X"] }

// Response
{
  "user_id": "...",
  "email_id": "...",
  "college_roll_number": "...",
  "hierarchies": [...],
  "invalid_entries": [...],
  "duplicate_edges": [...],
  "summary": { "total_trees": 1, "total_cycles": 1, "largest_tree_root": "A" }
}
```

## 🚀 Deploy to Render

1. Push this repo to GitHub (public)
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo → Build cmd: `npm install` → Start cmd: `npm start`
4. Done — copy the URL as your API base URL

## 🚀 Deploy to Vercel (alternative)

```bash
npm i -g vercel
vercel
```
