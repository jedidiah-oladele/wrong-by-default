# Server Package

Production-grade FastAPI server for OpenAI Realtime API integration.

## Structure

```
backend/
├── __init__.py          # Package initialization
├── main.py              # FastAPI application entry point
├── config.py            # Configuration management (Pydantic settings)
├── requirements.txt     # Python dependencies
└── prompts/             # System prompts for different thinking modes
    ├── __init__.py
    ├── modes.py         # Mode mapping
    ├── devils_advocate.py
    ├── first_principles.py
    ├── edge_case.py
    └── second_order.py
```

## Features

- **Production-grade logging**: Structured logging with timestamps and log levels
- **Configuration management**: Type-safe settings using Pydantic
- **Error handling**: Comprehensive error handling with proper HTTP status codes
- **Health checks**: `/health` endpoint for monitoring
- **Structured prompts**: System prompts organized in dedicated folder
- **Async/await**: Full async support for better performance
- **CORS**: Properly configured CORS middleware
- **Request logging**: Logs all requests with client IP and mode information

## Running

### Development
```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 3000 --reload
```

### Production
```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 3000 --workers 4
```

## Configuration

All configuration is managed through environment variables (see `.env.example`):

- `PORT`: Server port (default: 3000)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:8080)
- `DEBUG`: Enable debug mode (default: False)
- `OPENAI_API_KEY`: OpenAI API key (required)
- `OPENAI_API_BASE`: OpenAI API base URL (default: https://api.openai.com)
- `OPENAI_MODEL`: OpenAI model to use (default: gpt-4o-realtime-preview-2024-12-17)
- `OPENAI_VOICE`: Voice to use for audio output (default: marin)

## API Endpoints

### POST `/api/realtime/session`
Creates a new OpenAI Realtime API session.

**Request Body:**
```json
{
  "sdp": "SDP string from WebRTC",
  "modeId": "devils-advocate"
}
```

**Response:**
- Content-Type: `application/sdp`
- Body: SDP answer from OpenAI

### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "wrong-by-default-api"
}
```

## Logging

Logs are structured with the following format:
```
YYYY-MM-DD HH:MM:SS - logger_name - LEVEL - message
```

Log levels:
- `INFO`: General information (startup, requests, successful operations)
- `WARNING`: Warning conditions (missing data, invalid requests)
- `ERROR`: Error conditions (API failures, exceptions)
- `DEBUG`: Detailed debugging information (request details)
