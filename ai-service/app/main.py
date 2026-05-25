from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from app.ocr_engine import extract_receipt_items
from app.matcher import find_best_matches

app = FastAPI(title="Docket AI Service", version="1.0.0")

class CandidateItem(BaseModel):
    id: int
    name: str

class MatchRequest(BaseModel):
    query: str
    candidates: List[CandidateItem]
    limit: Optional[int] = 5

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "Docket AI Service",
        "features": ["receipt-ocr", "fuzzy-catalog-matching"]
    }

@app.post("/api/ocr")
async def ocr_receipt(file: UploadFile = File(...)):
    """
    Accepts a receipt image upload and returns structured grocery items.
    """
    contents = await file.read()
    # file.filename contains the original filename which we use for simulation hints
    result = extract_receipt_items(contents, filename=file.filename)
    return result

@app.post("/api/match")
def match_item(request: MatchRequest):
    """
    Fuzzy matches a search query or OCR item name against a list of catalog items.
    """
    candidates_dict = [{"id": c.id, "name": c.name} for c in request.candidates]
    matches = find_best_matches(request.query, candidates_dict, limit=request.limit)
    return {"query": request.query, "matches": matches}
