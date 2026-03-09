# ESG Disclosure Analyzer

## Deployment

This repo is a monorepo:
- `frontend/` = Next.js app for Vercel
- `backend/` = FastAPI app for Render

### 1. Deploy backend to Render

Create a Render Web Service with:

```text
Root Directory: backend
Environment: Python
Build Command: pip install -r requirements.txt
Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Required backend environment variables:

```env
CORS_ALLOW_ORIGINS=https://your-frontend.vercel.app
```

Optional LLM / RAG environment variables:

```env
LLM_ENABLED=true
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.5-flash
GEMINI_API_KEY=your_gemini_api_key
LLM_TIMEOUT_SECONDS=30
RAG_TOP_K=5
```

If you do not want LLM enabled:

```env
LLM_ENABLED=false
```

### 2. Deploy frontend to Vercel

Create a Vercel project with:

```text
Root Directory: frontend
Framework Preset: Next.js
Install Command: npm install
Build Command: next build
```

Required frontend environment variable:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend.onrender.com
```

### 3. Recommended deployment order

1. Deploy the backend to Render.
2. Copy the Render service URL.
3. Deploy the frontend to Vercel with `NEXT_PUBLIC_API_BASE_URL` set to that Render URL.
4. Update Render `CORS_ALLOW_ORIGINS` to your final Vercel production URL.
5. Redeploy if needed so both sides use the final production URLs.

### 4. Connect frontend and backend in production

Frontend should use:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend.onrender.com
```

Backend should allow the frontend origin:

```env
CORS_ALLOW_ORIGINS=https://your-frontend.vercel.app
```

If needed, you can allow multiple origins:

```env
CORS_ALLOW_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000
```

### 5. LLM setup notes

- The backend supports Gemini-based RAG.
- LLM is optional. If `LLM_ENABLED=false` or `GEMINI_API_KEY` is missing, the backend falls back gracefully.
- Do not store API keys in code. Set them only in Render environment variables or local `backend/.env`.

### 6. Deployment caveats

- Backend analysis state is currently stored in memory, so `/ask` depends on a prior `/analyze` call on the same running instance.
- Uploaded files are stored on Render's ephemeral filesystem and will not persist across restarts.
- The backend includes heavy ML dependencies like `torch`, `sentence-transformers`, and `faiss-cpu`, so cold starts and builds may take longer than a typical FastAPI service.
