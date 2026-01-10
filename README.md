# Wrong by Default

AI that pushes back on your thinking. Challenge your assumptions with different thinking modes.

## Project Structure

```
wrong-by-default/
├── frontend/          # React + TypeScript + Vite frontend
├── backend/           # Python + FastAPI backend
├── README.md          # This file
└── .env               # Environment variables (create from .env.example)
```

## Quick Start

### Prerequisites

- **Python 3.8+** (for backend)
- **Node.js 18+** (for frontend)
- **OpenAI API key** with access to the Realtime API

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wrong-by-default
   ```

2. **Set up the backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Set up the frontend**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
   
   Add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3000
   FRONTEND_URL=http://localhost:8080
   ```

### Running the Application

You need to run both servers:

**Terminal 1 - Backend:**
```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 3000 --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Then open `http://localhost:8080` in your browser.

## Thinking Modes

The application offers four different AI thinking modes:

1. **Devil's Advocate** - Argues against whatever position you take
2. **First Principles Thinker** - Strips away assumptions and rebuilds from fundamentals
3. **Edge Case Hunter** - Finds flaws, blind spots, and failure modes
4. **Second-Order Thinker** - Explores ripple effects and long-term consequences

## Technology Stack

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- WebRTC for real-time audio

### Backend
- Python 3.8+
- FastAPI
- OpenAI Realtime API
- WebRTC integration

## Development

See individual README files for more details:
- [Frontend README](frontend/README.md) - Frontend development guide
- [Backend README](backend/README.md) - Backend development guide

## License

[Your License Here]
