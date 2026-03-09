from pathlib import Path
import shutil
import uuid

from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.services.analysis_service import analyze_document, ask_about_latest_analysis


settings = get_settings()
BASE_DIR = Path(__file__).resolve().parents[1]
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(
    title="ESG Disclosure Analyzer API",
    version="1.0.0",
    description="Backend API for ESG report analysis and AI Q&A"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_allow_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AskRequest(BaseModel):
    question: str


@app.get("/")
def root():
    return {"message": "ESG Disclosure Analyzer API is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze_report(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    unique_name = f"{uuid.uuid4()}_{file.filename}"
    saved_path = UPLOAD_DIR / unique_name

    try:
        with saved_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = analyze_document(str(saved_path), report_name=file.filename)

        return {
            "report_name": file.filename,
            "metrics": result["metrics"],
            "claims": result["claims"],
            "chart_data": result["chart_data"],
            "page_preview": result["pages"][:3],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/ask")
async def ask_question(payload: AskRequest):
    try:
        result = ask_about_latest_analysis(payload.question)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Question answering failed: {str(e)}")
