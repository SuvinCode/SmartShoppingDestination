from rapidfuzz import process, fuzz
from functools import lru_cache
import hashlib
import json

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

    Results are cached using an LRU cache keyed on a hash of the inputs. Since the
    catalog candidate list is static between app restarts and the same OCR item names
    recur across similar receipts, this avoids redundant RapidFuzz computation.

    queries: list of strings to match
    candidates: list of dicts [{"id": 1, "name": "..."}]

    Returns a list of results in the same order as queries:
    [{"query": "...", "matches": [...]}, ...]
    """
    if not candidates:
        return [{"query": q, "matches": []} for q in queries]

    # Build a stable cache key from the inputs
    cache_key = _make_cache_key(tuple(queries), tuple(c["name"] for c in candidates), limit)
    cached = _batch_match_cache(cache_key, tuple(queries), tuple(c["name"] for c in candidates), limit)

    # Re-map candidate dicts (the cache stores names only for hashability; re-attach ids)
    name_to_candidate = {c["name"]: c for c in candidates}
    results_out = []
    for item in cached:
        matches = []
        for m in item["matches"]:
            name = m["name"]
            if name in name_to_candidate:
                matches.append({"candidate": name_to_candidate[name], "score": m["score"]})
        results_out.append({"query": item["query"], "matches": matches})

    return results_out


def _make_cache_key(queries_tuple, names_tuple, limit):
    """Build a compact cache key string from the inputs."""
    raw = json.dumps([list(queries_tuple), list(names_tuple), limit], sort_keys=True)
    return hashlib.md5(raw.encode()).hexdigest()


@lru_cache(maxsize=256)
def _batch_match_cache(cache_key: str, queries_tuple: tuple, names_tuple: tuple, limit: int) -> tuple:
    """
    LRU-cached inner function. Stores results as a tuple of dicts (with names only,
    not full candidate dicts, for hashability). Keyed on cache_key for fast lookup.
    maxsize=256 covers ~256 distinct query+candidate set combinations in memory.
    """
    names = list(names_tuple)
    results_out = []
    for query in queries_tuple:
        raw = process.extract(query, names, scorer=fuzz.token_sort_ratio, limit=limit)
        matches = []
        for matched_name, score, _index in raw:
            if score > 40:
                matches.append({"name": matched_name, "score": float(score)})
        matches.sort(key=lambda x: x["score"], reverse=True)
        results_out.append({"query": query, "matches": matches})

    # Return as a tuple so it's hashable and cacheable by lru_cache
    return tuple({"query": r["query"], "matches": r["matches"]} for r in results_out)

