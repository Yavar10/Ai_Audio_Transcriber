# AI Audio Transcriber

A modern web application that transcribes audio files using Google's Gemini AI. Built with Next.js 16, Better Auth, and Drizzle ORM.

## 🌐 Live Demo

**Production URL:** https://aiaudiotranscriber-production.up.railway.app

### Login Credentials
- **Email:** admin@example.com
- **Password:** password123

## ✨ Features

- 🎙️ **Audio Transcription** — Upload audio files and get accurate transcriptions powered by Gemini 2.5 Flash
- 🔐 **Secure Authentication** — User login system with session management
- 📝 **Transcript History** — All transcriptions are saved to your personal history
- 🎨 **Modern UI** — Clean, responsive interface built with React 19 and Tailwind CSS
- 🚀 **Deployed on Railway** — Production-ready deployment with PostgreSQL database

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 |
| Authentication | Better Auth |
| Database | PostgreSQL (Railway) + Drizzle ORM |
| AI | Google Gemini 2.5 Flash |
| Styling | Tailwind CSS |
| Deployment | Railway |

## 🚀 Getting Started (Local Development)

### Prerequisites

- Node.js 20+
- PostgreSQL database (local or remote)
- Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ai-transcriber
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env.local` file:
   ```env
   DATABASE_URL=postgresql://user:password@host:port/database
   GEMINI_API_KEY=your_gemini_api_key
   AUTH_SECRET=your_secure_random_secret
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Set up the database**
   ```bash
   npx drizzle-kit push
   ```

5. **Seed the admin account**
   ```bash
   npm run seed
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000)

## 📖 Usage

1. **Log in** with your credentials at `/login`
2. **Upload an audio file** (MP3, M4A, WAV, AAC, or WebM)
3. **Wait for transcription** — the AI processes your audio and returns text
4. **View history** — all your transcriptions are saved automatically

## 📁 Project Structure

```
ai-transcriber/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── transcribe/    # Transcription API
│   │   └── transcripts/   # Transcript CRUD
│   └── login/             # Login page
├── lib/
│   ├── auth.js            # Auth configuration
│   └── db/                # Database schema & connection
├── drizzle/               # Database migrations
└── public/                # Static assets
```

## 🔧 API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/transcribe` | POST | Transcribe an audio file |
| `/api/transcripts` | GET | List user's transcripts |
| `/api/auth/*` | * | Authentication routes |

## 📄 License

MIT License — feel free to use this project for learning or commercial purposes.

---

Built with ❤️ using Next.js and Google Gemini AI