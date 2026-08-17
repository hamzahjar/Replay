from fastapi import FastAPI

from app.routers.auth import router as auth_router
from app.routers.conversations import router as conversations_router
from app.routers.imports import router as imports_router


app = FastAPI(
    title="Replay API",
    description="Backend API for Replay.",
    version="1.0.0",
)


app.include_router(auth_router)
app.include_router(imports_router)
app.include_router(conversations_router)


@app.get("/")
def root():
    return {
        "message": "Replay API is running."
    }