from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from app.ocr_engine import extract_receipt_items
from app.matcher import find_best_matches, find_best_matches_batch

app = FastAPI(title="Docket AI Service", version="1.0.0")

class CandidateItem(BaseModel):
    id: int
    name: str

class MatchRequest(BaseModel):
    query: str
    candidates: List[CandidateItem]
    limit: Optional[int] = 5

class BatchMatchRequest(BaseModel):
    queries: List[str]
    candidates: List[CandidateItem]
    limit: Optional[int] = 3

@app.api_route("/", methods=["GET", "HEAD"])
def read_root():
    return {
        "status": "healthy",
        "service": "Docket AI Service",
        "features": ["receipt-ocr", "fuzzy-catalog-matching", "batch-catalog-matching"]
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

@app.post("/api/match/batch")
def match_items_batch(request: BatchMatchRequest):
    """
    Batch fuzzy match — accepts multiple queries in a single request and returns all
    results at once. This replaces the N serial /api/match calls that caused OCR slowness:
    one receipt with N items now needs only 1 OCR call + 1 batch match call instead of
    1 OCR call + N individual match calls.
    """
    candidates_dict = [{"id": c.id, "name": c.name} for c in request.candidates]
    results = find_best_matches_batch(request.queries, candidates_dict, limit=request.limit)
    return {"results": results}

