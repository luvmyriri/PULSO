from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="PULSO Backend API")

# Configure CORS so the Vite frontend can access the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StatusResponse(BaseModel):
    status: str
    message: str

@app.get("/", response_model=StatusResponse)
async def root():
    return {"status": "online", "message": "PULSO Backend API is running."}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "PULSO Core Engine"}

if __name__ == "__main__":
    # Run the server on port 8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
