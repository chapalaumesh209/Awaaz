# AWAAZ आवाज

**Voice, Safety & Social Access** — A multilingual voice-first civic assistant for India.

AWAAZ empowers Indian citizens to access government entitlements, secure identity documents, obtain safe transit, and connect with panchayat volunteers — all through voice-first, vernacular-friendly interfaces across 12 Indian languages.

---

## ✨ Key Features

- **🎙️ Voice-First AI Assistant** — Conversational scheme application via voice in 12 Indian languages
- **📋 Scheme Discovery & Eligibility** — AI-powered matching to 100+ government welfare schemes (PM Vishwakarma, MNREGA, PM-KISAN, etc.)
- **📄 Document Scanner & Digital Locker** — Scan, OCR, and store Aadhaar, ration cards, caste certificates, and more
- **🛡️ Safety & SOS** — Distress alerts, safe-route indicators, and volunteer dispatch for women's safety
- **🏛️ Civic Voice & Gram Sabha Hub** — Participate in local governance, file RTI, submit grievances
- **📊 Application Tracker** — Real-time tracking of scheme applications and document requests
- **🤝 Volunteer Dashboard** — Panchayat volunteer case management and citizen support workflow
- **🔐 Identity Wallet** — For recordless and migrant workers — evidence blocks, affidavits, and digital proof
- **👨‍💼 Admin Dashboard** — Administrative oversight, analytics, and seed data management

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS 4, Vite, React Router v7 |
| **Backend** | Node.js, Express.js, TypeScript (tsx) |
| **AI / LLM** | Google Gemini API (`@google/genai`) — powers scheme matching, eligibility analysis, grievance drafting, and conversational AI |
| **OCR** | **Gemini Vision** — used for document scanning and OCR (extracting structured data from Aadhaar, ration cards, income certificates, etc.) |
| **Voice** | **Sarvam AI** — voice model for multilingual speech-to-text and text-to-speech across 12 Indian languages |
| **Database** | Google Firebase Firestore (with offline IndexedDB persistence) |
| **Auth** | Firebase Authentication (Email/Password, Google SSO, Anonymous, Guest mode) |
| **Animations** | Motion (Framer Motion) |
| **Icons** | Lucide React |
| **Deployment** | Vercel (serverless) / Firebase Hosting |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ and **npm**
- A **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/)
- A **Firebase project** with Firestore and Authentication enabled

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/Awaaz.git
cd Awaaz

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### Environment Variables

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Your Google Gemini API key |
| `APP_URL` | The URL where the app is hosted (auto-injected in AI Studio) |

### Running Locally

```bash
# Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Building for Production

```bash
# Build both frontend and backend
npm run build

# Start the production server
npm start
```

---

## 🔐 Authentication

AWAAZ supports multiple authentication methods:

| Role | Method | Credentials |
|---|---|---|
| **Citizen** | Email/Password, Google SSO, or Guest | Register or sign in |
| **Volunteer** | Pre-configured demo login | `volunteer@awaaz.org` / `volunteer123` |
| **Admin** | Pre-configured demo login | `admin@awaaz.org` / `admin123` |

Firebase Auth is integrated with Firestore security rules for role-based access control across all data collections.

---

## 🌐 Supported Languages

AWAAZ supports **12 Indian languages**: English, Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi, Odia, and Urdu.

---

## 📁 Project Structure

```
Awaaz/
├── src/
│   ├── components/       # React UI components (23 views)
│   ├── contexts/         # Translation context provider
│   ├── data/             # Languages, translations, static data
│   ├── lib/              # Firebase config, AI service, Supabase client
│   ├── types.ts          # TypeScript type definitions
│   ├── App.tsx           # Main application router
│   └── main.tsx          # Entry point
├── server.ts             # Express backend with Gemini AI integration
├── api/                  # Vercel serverless API entry
├── firestore.rules       # Firestore security rules
├── firebase-applet-config.json
├── index.html            # HTML entry point
├── vite.config.ts        # Vite build configuration
└── package.json
```

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).
