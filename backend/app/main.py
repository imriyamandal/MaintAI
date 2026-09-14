import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database.database import engine, Base, SessionLocal
from .database.seed import seed_database
from .ml.engine import MLEngine
from .api.endpoints import router as api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables and seed database
    print("[MaintAI Backend] Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    
    print("[MaintAI Backend] Preloading ML models & SHAP explainers...")
    ml = MLEngine.get_instance()
    
    print("[MaintAI Backend] Checking database seed status...")
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
        
    print("[MaintAI Backend] System Ready.")
    yield
    print("[MaintAI Backend] Shutting down.")

app = FastAPI(
    title="MaintAI — AI-Powered Equipment Health Monitoring API",
    description="Production-quality REST backend for industrial predictive maintenance, XAI root-cause analysis, and AI Copilot.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend Vite development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API router
app.include_router(api_router, prefix="/api")

@app.get("/")
def root():
    return {
        "platform": "MaintAI",
        "tagline": "Detect → Predict → Explain → Prevent",
        "status": "OPERATIONAL",
        "docs_url": "/docs",
        "api_prefix": "/api"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
