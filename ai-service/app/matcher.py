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


def find_best_matches_batch(queries: list, candidates: list, limit: int = 3) -> list:
    """
    Batch version of find_best_matches. Processes multiple queries against the same
    candidate list in one call, avoiding repeated list construction overhead.
    
    queries: list of strings to match
    candidates: list of dicts [{"id": 1, "name": "..."}]
    
    Returns a list of results in the same order as queries:
    [{"query": "...", "matches": [...]}, ...]
    """
    if not candidates:
        return [{"query": q, "matches": []} for q in queries]

    # Pre-build names list once — shared across all queries
    names = [c["name"] for c in candidates]

    results_out = []
    for query in queries:
        raw = process.extract(query, names, scorer=fuzz.token_sort_ratio, limit=limit)
        matches = []
        for _matched_name, score, index in raw:
            if score > 40:
                matches.append({
                    "candidate": candidates[index],
                    "score": float(score)
                })
        matches.sort(key=lambda x: x["score"], reverse=True)
        results_out.append({"query": query, "matches": matches})

    return results_out
