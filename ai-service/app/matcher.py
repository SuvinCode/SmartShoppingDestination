from rapidfuzz import process, fuzz

def find_best_matches(query: str, candidates: list, limit: int = 5):
    """
    Fuzzy match a query string against a list of candidate products.
    candidates should be a list of dictionaries: [{"id": 1, "name": "Coles Penne Pasta 500g"}]
    """
    if not candidates:
        return []
    
    names = [c["name"] for c in candidates]
    # process.extract returns a list of tuples: (matched_name, score, index)
    results = process.extract(query, names, scorer=fuzz.token_sort_ratio, limit=limit)
    
    output = []
    for matched_name, score, index in results:
        # Only return matches with a reasonable similarity score
        if score > 40:
            output.append({
                "candidate": candidates[index],
                "score": float(score)
            })
            
    # Sort by score descending
    output.sort(key=lambda x: x["score"], reverse=True)
    return output
