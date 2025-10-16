#!/bin/bash
set -e  # stop if any command fails

echo "🚀 Starting AI Travel Itinerary Generator..."

# Build and start the docker image
echo "Fetch and build docker image"
docker rm -f ollama
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
docker exec -it ollama ollama pull deepseek-r1:1.5b
docker exec -it ollama ollama pull gemma3:1b
# docker exec -it ollama ollama pull llama3.2:1b

# --- Backend setup ---
echo "⚙️ Starting FastAPI backend..."
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# --- Frontend setup ---
echo "🌐 Starting React frontend..."
cd ../frontend
npm install
npm run dev
