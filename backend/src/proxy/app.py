"""GuardianAI Proxy — OpenAI-compatible HTTP proxy on port 8001."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.proxy.routes import router

app = FastAPI(title="GuardianAI Proxy", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/v1")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "guardianai-proxy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
