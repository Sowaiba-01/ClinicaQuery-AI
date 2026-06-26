# MedResearch AI

An AI-powered medical research assistant that lets you upload PDF papers and ask questions about them using Retrieval-Augmented Generation (RAG). Built with Next.js, FastAPI, ChromaDB, and Google Gemini.

![MedResearch AI](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi) ![Gemini](https://img.shields.io/badge/Google-Gemini_AI-4285F4?logo=google) ![License](https://img.shields.io/badge/license-MIT-blue)

---

## Features

- **PDF Upload & Indexing** — drag-and-drop PDFs and index them into a vector database in seconds
- **RAG-powered Q&A** — ask natural language questions and get answers grounded in the uploaded papers
- **Source Attribution** — every answer shows exactly which passages it drew from
- **Confidence Scoring** — guardrail system rates how well each answer is supported by the sources
- **Google OAuth** — secure sign-in via Google, powered by NextAuth.js (free, no billing required)
- **Markdown Rendering** — AI answers render with bold, lists, and headers for readability
- **Dark Sidebar Layout** — modern indigo/slate UI with navigation, user avatar, and sign-out

---

## Tech Stack

### Frontend
| Tech | Purpose |
|------|---------|
| Next.js 16 (App Router) | React framework |
| TypeScript | Type safety |
| Tailwind CSS v4 | Styling |
| NextAuth.js (Auth.js v5) | Google OAuth |
| Axios | API calls |
| Lucide React | Icons |

### Backend
| Tech | Purpose |
|------|---------|
| FastAPI | REST API |
| ChromaDB | Vector store |
| Google Gemini AI | LLM + embeddings |
| LangChain | PDF chunking & RAG pipeline |
| Python-dotenv | Environment config |

---

## Project Structure

```
medical-assistant/
├── backend/
│   ├── core/
│   │   ├── ingestion.py      # PDF chunking + embedding
│   │   ├── generator.py      # Gemini answer generation
│   │   └── guardrails.py     # Confidence scoring
│   ├── routes/
│   │   ├── upload.py         # POST /api/upload
│   │   └── query.py          # POST /api/query
│   ├── vectorstore/
│   │   └── chroma_store.py   # ChromaDB wrapper
│   └── main.py               # FastAPI app entry point
│
└── frontend/
    ├── app/
    │   ├── api/auth/[...nextauth]/
    │   │   └── route.ts      # NextAuth handler
    │   ├── components/
    │   │   ├── AppShell.tsx  # Auth guard + sidebar layout
    │   │   ├── Sidebar.tsx   # Dark navigation sidebar
    │   │   ├── ChatWindow.tsx# Main chat interface
    │   │   ├── SourceCard.tsx# Collapsible source snippets
    │   │   └── ConfidenceBadge.tsx
    │   ├── login/
    │   │   └── page.tsx      # Google sign-in page
    │   ├── upload/
    │   │   └── page.tsx      # Drag-and-drop PDF upload
    │   └── layout.tsx
    ├── auth.ts               # NextAuth config
    └── proxy.ts              # Route protection
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- A Google Cloud project (free tier) — for OAuth
- A Google Gemini API key — [get one free](https://aistudio.google.com/app/apikey)

---

### 1. Clone the repository

```bash
git clone https://github.com/your-username/medical-assistant.git
cd medical-assistant
```

---

### 2. Backend setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
```

Create `backend/.env`:
```env
GEMINI_API_KEY=your-gemini-api-key-here
```

Start the backend:
```bash
uvicorn main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`

---

### 3. Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local` (copy from `.env.local.example`):
```env
AUTH_SECRET=your-random-secret        # openssl rand -base64 32
AUTH_GOOGLE_ID=your-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-client-secret
AUTH_URL=http://localhost:3000
```

#### Setting up Google OAuth (free)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a project
2. **APIs & Services → OAuth consent screen** → External → fill in app name & email → Save
3. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorised redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy the Client ID and Client Secret into `.env.local`
5. **OAuth consent screen → Test users → Add users** → add your Gmail

Start the frontend:
```bash
npm run dev
```

Frontend runs at `http://localhost:3000`

---

### 4. Open the app

Navigate to `http://localhost:3000` — you'll be redirected to the Google sign-in page. After signing in you'll see the full app with the sidebar.

---

## Usage

1. **Sign in** with Google
2. Click **Upload PDF** in the sidebar
3. Drag and drop a medical paper (PDF, max 50 MB)
4. Wait for indexing to complete (progress bar shows status)
5. Go to **Chat** and ask questions about the paper
6. Each answer shows:
   - The response with markdown formatting
   - A confidence score (high / medium / low)
   - Collapsible source snippets with relevance scores

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload` | Upload and index a PDF |
| `POST` | `/api/query` | Ask a question about indexed papers |
| `GET` | `/` | Health check |

### Example query

```bash
curl -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the side effects of metformin?"}'
```

```json
{
  "answer": "According to the uploaded paper, metformin commonly causes...",
  "sources": [
    {
      "text_snippet": "Gastrointestinal side effects including nausea...",
      "source_file": "clinical_trial_2024.pdf",
      "relevance_score": 0.91
    }
  ],
  "guardrails": {
    "confidence_score": 87,
    "is_supported": true,
    "warning": null
  }
}
```

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key |

### Frontend (`frontend/.env.local`)
| Variable | Description |
|----------|-------------|
| `AUTH_SECRET` | Random secret for NextAuth session encryption |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret |
| `AUTH_URL` | App URL (http://localhost:3000 for dev) |

---

## Disclaimer

This tool is intended **for research purposes only**. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a licensed physician.

---

## License

MIT
