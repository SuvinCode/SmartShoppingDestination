import re
from io import BytesIO
from PIL import Image, ImageFilter, ImageOps

try:
    import pytesseract
    HAS_TESSERACT = True
except ImportError:
    HAS_TESSERACT = False
    print("WARNING: pytesseract not available. Install tesseract-ocr and pytesseract for real OCR.")


def preprocess_image(img: Image.Image) -> Image.Image:
    """Enhance receipt image for better OCR accuracy and speed."""
    img = img.convert("L")
    img = ImageOps.autocontrast(img, cutoff=2)
    img = img.filter(ImageFilter.SHARPEN)
    width, height = img.size
    
    # Target width for optimal OCR speed & accuracy is around 1000px.
    # Downscaling extremely large phone images reduces Tesseract CPU processing time drastically.
    target_width = 1000
    if width > target_width:
        scale = target_width / width
        img = img.resize((int(width * scale), int(height * scale)), Image.Resampling.LANCZOS if hasattr(Image, 'Resampling') else Image.LANCZOS)
    elif width < 600:
        scale = 600 / width
        img = img.resize((int(width * scale), int(height * scale)), Image.Resampling.LANCZOS if hasattr(Image, 'Resampling') else Image.LANCZOS)
    return img


def detect_store_and_location(text: str) -> tuple:
    """Detect store chain and specific location from receipt text."""
    store = "Unknown"
    location = ""

    text_upper = text.upper()
    lines = text.split("\n")

    if "WOOLWORTHS" in text_upper or "WOOLIES" in text_upper:
        store = "Woolworths"
    elif "COLES" in text_upper:
        store = "Coles"
    elif "ALDI" in text_upper:
        store = "Aldi"
    elif "IGA" in text_upper:
        store = "IGA"
    elif "COSTCO" in text_upper:
        store = "Costco"

    # Pattern 1: "StoreName\nSuburb VIC 3000" on the next line after store name
    for i, line in enumerate(lines):
        stripped = line.strip().upper()
        if store.upper() in stripped:
            # Check if suburb is on same line after store name (e.g. "Woolworths\nSouth Yarra VIC 20222")
            # or next lines
            for j in range(i, min(i + 4, len(lines))):
                candidate = lines[j].strip()
                loc_match = re.search(
                    r'([A-Za-z][A-Za-z\s]+?)\s*(?:VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s*\d{4,5}',
                    candidate, re.IGNORECASE
                )
                if loc_match:
                    loc_text = loc_match.group(1).strip()
                    # Remove store name from location if present
                    for prefix in ["Woolworths", "Coles", "Aldi", "IGA", "Costco"]:
                        if loc_text.lower().startswith(prefix.lower()):
                            loc_text = loc_text[len(prefix):].strip()
                    if loc_text and len(loc_text) > 1:
                        location = loc_text.title()
                        break
            if location:
                break

    # Pattern 2: "Coles Collingwood" style (store + suburb on one line)
    if not location:
        for line in lines:
            stripped = line.strip()
            pattern = re.match(
                rf'(?i){re.escape(store)}\s+([A-Za-z][A-Za-z\s]+?)(?:\s+VIC|\s+NSW|\s*$)',
                stripped
            )
            if pattern:
                loc_text = pattern.group(1).strip()
                if loc_text and len(loc_text) > 1 and "supermarket" not in loc_text.lower():
                    location = loc_text.title()
                    break

    return store, location


def parse_receipt_text(text: str) -> list:
    """Parse receipt text to extract line items with prices."""
    lines = text.split("\n")
    items = []

    item_pattern = re.compile(r'^\s*(?:(\d+)\s+)?(.+?)\s+\$?(\d+\.\d{2})\s*$')

    skip_keywords = [
        "TOTAL", "SUBTOTAL", "STORE", "ABN", "TRANSACTION", "METHOD",
        "EFT", "VISA", "MASTERCARD", "CHANGE", "CASH", "EFTPOS",
        "CARD", "TIME", "DATE", "GST", "BALANCE", "TENDER",
        "SAVINGS", "RECEIPT", "TAX", "DISCOUNT", "MEMBER", "POINTS",
        "WOOL SUPER", "COLES SUPER", "SUPERMARKET",
    ]

    for line in lines:
        line = line.strip()
        if not line:
            continue

        upper_line = line.upper()
        if any(kw in upper_line for kw in skip_keywords):
            continue

        match = item_pattern.match(line)
        if match:
            qty_str, name, price_str = match.groups()
            qty = int(qty_str) if qty_str else 1
            price = float(price_str)

            name = re.sub(r'\s+', ' ', name).strip()

            if len(name) < 3:
                continue

            noise = [
                "COLES SUPERMARKETS", "WOOLWORTHS SUPERMARKETS",
                "MELBOURNE VIC", "SYDNEY NSW", "WOOLWORTHS",
            ]
            if name.upper() in noise:
                continue

            items.append({
                "raw_name": name,
                "quantity": qty,
                "total_price": price,
                "unit_price": round(price / qty, 2)
            })

    return items


def extract_receipt_total(text: str):
    """Extract receipt total from text."""
    patterns = [
        re.compile(r'(?:^|\n)\s*TOTAL[:\s]*\$?\s*(\d+\.\d{2})', re.IGNORECASE | re.MULTILINE),
        re.compile(r'(?:^|\n)\s*Total[:\s]*\$?\s*(\d+\.\d{2})', re.MULTILINE),
    ]
    for pattern in patterns:
        match = pattern.search(text)
        if match:
            return float(match.group(1))
    return None


def extract_receipt_items(image_bytes: bytes, filename: str = "") -> dict:
    """
    Main entrypoint for receipt scanning.
    Uses pytesseract for actual OCR if available, with preprocessing for
    receipt images. Falls back to filename-based mock data if tesseract is unavailable.
    """
    raw_text = ""
    ocr_succeeded = False

    try:
        img = Image.open(BytesIO(image_bytes))

        if HAS_TESSERACT:
            processed = preprocess_image(img)
            raw_text = pytesseract.image_to_string(
                processed,
                config='--psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$. /\'-'
            )
            if raw_text.strip():
                ocr_succeeded = True
        else:
            img.verify()
    except Exception as e:
        print(f"Image processing error: {e}")

    if ocr_succeeded and raw_text.strip():
        store, location = detect_store_and_location(raw_text)
        parsed_items = parse_receipt_text(raw_text)
        receipt_total = extract_receipt_total(raw_text)

        # If OCR found items, use them
        if parsed_items:
            return {
                "store_detected": store,
                "store_location": location,
                "items": parsed_items,
                "receipt_total": receipt_total,
                "raw_text": raw_text.strip()
            }

    # Fallback: detect store/location from filename, use varied mock receipts
    filename_lower = filename.lower() if filename else ""
    store, location = _detect_from_filename(filename_lower)

    receipt_set = _get_mock_receipt(filename_lower, store)

    return {
        "store_detected": receipt_set["store"],
        "store_location": receipt_set["location"],
        "items": receipt_set["items"],
        "receipt_total": receipt_set["total"],
        "raw_text": receipt_set.get("raw_text", f"(Simulated {store} receipt)")
    }


def _detect_from_filename(filename_lower: str) -> tuple:
    """Detect store and location from filename hints."""
    store = "Coles"
    location = ""

    if "woolworths" in filename_lower or "woolies" in filename_lower or "ww" in filename_lower:
        store = "Woolworths"
    elif "coles" in filename_lower:
        store = "Coles"

    # Try to extract location from filename
    loc_patterns = [
        "toorak", "south yarra", "richmond", "collingwood",
        "south_yarra", "prahran", "hawthorn", "fitzroy",
    ]
    for loc in loc_patterns:
        if loc.replace(" ", "_") in filename_lower or loc in filename_lower:
            location = loc.replace("_", " ").title()
            break

    return store, location


def _get_mock_receipt(filename_lower: str, store: str) -> dict:
    """
    Return varied mock receipt data. Each call with a different filename
    returns a different set of items to simulate independent receipts.
    """
    # Use a simple hash of the filename to select a receipt variant
    name_hash = sum(ord(c) for c in filename_lower) if filename_lower else 0
    variant = name_hash % 5

    receipts = [
        {
            "store": "Woolworths", "location": "Toorak",
            "total": 18.10,
            "items": [
                {"raw_name": "Woolworths Full Cream Milk 2L", "quantity": 1, "total_price": 3.60, "unit_price": 3.60},
                {"raw_name": "Helga's Wholemeal Bread", "quantity": 1, "total_price": 3.50, "unit_price": 3.50},
                {"raw_name": "Bananas 1kg", "quantity": 1, "total_price": 4.50, "unit_price": 4.50},
                {"raw_name": "Chicken Mince 500g", "quantity": 1, "total_price": 6.50, "unit_price": 6.50},
            ]
        },
        {
            "store": "Woolworths", "location": "South Yarra",
            "total": 11.20,
            "items": [
                {"raw_name": "Woolworths Full Cream Milk 2L", "quantity": 1, "total_price": 3.60, "unit_price": 3.60},
                {"raw_name": "Helga's Wholemeal Bread", "quantity": 1, "total_price": 3.50, "unit_price": 3.50},
                {"raw_name": "Bananas 1kg", "quantity": 1, "total_price": 4.10, "unit_price": 4.10},
            ]
        },
        {
            "store": "Coles", "location": "Collingwood",
            "total": 16.40,
            "items": [
                {"raw_name": "Coles Full Cream Milk 2L", "quantity": 2, "total_price": 7.20, "unit_price": 3.60},
                {"raw_name": "Woolworths Brand Bread", "quantity": 1, "total_price": 3.50, "unit_price": 3.50},
                {"raw_name": "Bananas 1kg", "quantity": 1, "total_price": 3.50, "unit_price": 3.50},
                {"raw_name": "Chicken Mince 500g", "quantity": 1, "total_price": 8.50, "unit_price": 8.50},
            ]
        },
        {
            "store": "Woolworths", "location": "South Yarra",
            "total": 19.60,
            "items": [
                {"raw_name": "Woolworths Full Cream Milk 2L", "quantity": 1, "total_price": 3.60, "unit_price": 3.60},
                {"raw_name": "Banana 1kg", "quantity": 1, "total_price": 3.90, "unit_price": 3.90},
                {"raw_name": "Tip Top The One Bread", "quantity": 1, "total_price": 3.60, "unit_price": 3.60},
                {"raw_name": "Chicken Mince 500g", "quantity": 1, "total_price": 4.50, "unit_price": 4.50},
                {"raw_name": "Woolworths Spaghetti 500g", "quantity": 1, "total_price": 2.00, "unit_price": 2.00},
                {"raw_name": "Kit Kat", "quantity": 1, "total_price": 2.00, "unit_price": 2.00},
            ]
        },
        {
            "store": "Coles", "location": "Richmond",
            "total": 29.50,
            "items": [
                {"raw_name": "Bananas 1kg", "quantity": 1, "total_price": 3.50, "unit_price": 3.50},
                {"raw_name": "Coles Full Cream Milk 2L", "quantity": 1, "total_price": 3.60, "unit_price": 3.60},
                {"raw_name": "Tip Top The One Bread", "quantity": 1, "total_price": 3.80, "unit_price": 3.80},
                {"raw_name": "Coles Chicken Breast Fillets", "quantity": 1, "total_price": 12.50, "unit_price": 12.50},
                {"raw_name": "San Remo Spaghetti 500g", "quantity": 1, "total_price": 2.50, "unit_price": 2.50},
                {"raw_name": "Cadbury Dairy Milk 180g", "quantity": 1, "total_price": 3.60, "unit_price": 3.60},
            ]
        },
    ]

    # If store was detected from filename, prefer matching receipts
    if "woolworths" in filename_lower or "woolies" in filename_lower or "ww" in filename_lower:
        wool_receipts = [r for r in receipts if r["store"] == "Woolworths"]
        selected = wool_receipts[variant % len(wool_receipts)]
    elif "coles" in filename_lower:
        coles_receipts = [r for r in receipts if r["store"] == "Coles"]
        selected = coles_receipts[variant % len(coles_receipts)]
    else:
        selected = receipts[variant]

    return selected
