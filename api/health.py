from fastapi import FastAPI
app = FastAPI()
@app.get("/api/health")
def health():
    return {"ok": True, "service": "ark-ielts-python", "version": "1.0.0"}
