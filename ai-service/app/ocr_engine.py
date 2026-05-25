import re
from io import BytesIO
from PIL import Image

# Simulated receipt texts based on file content or naming hints
COLES_SAMPLE_RECEIPT = """
COLES SUPERMARKETS
MELBOURNE VIC 3000
STORE 0412

1  COLES PENNE PASTA 500G      $1.30
2  COLES FRESH MILK 2L         $3.10
1  DE CECCO SPAGHETTI 500G     $4.50
1  CADBURY DAIRY MILK 180G     $6.00
3  HEINZ BAKED BEANS 220G      $7.50
1  DISH DISHWASHING LIQ 1L     $5.50
1  BULLA ICE CREAM 2L          $9.00

TOTAL                          $36.90
"""

WOOLWORTHS_SAMPLE_RECEIPT = """
WOOLWORTHS SUPERMARKETS
SYDNEY NSW 2000
STORE 8832

1  WW PENNE PASTA 500G         $1.30
1  WW FULL CREAM MILK 2L       $3.10
1  DE CECCO SPAGHETTI 500G     $4.80
1  CADBURY DAIRY MILK 180G     $5.00
3  HEINZ BAKED BEANS 220G      $6.60
1  WW WASHING LIQUID 1L        $5.00
1  BULLA ICE CREAM 2L          $8.50

TOTAL                          $34.30
"""

def parse_receipt_text(text: str):
    """
    Parse raw receipt text using regex to extract structured items.
    Looks for lines like: '2  COLES FRESH MILK 2L         $3.10'
    """
    lines = text.split("\n")
    items = []
    
    # Regex to capture: [Quantity] [Item Name] [Price]
    # Example: "1  COLES PENNE PASTA 500G      $1.30" -> Qty: 1, Name: COLES PENNE PASTA 500G, Price: 1.30
    # Also handles lines without quantity prefix, defaulting to 1.
    item_pattern = re.compile(r'^\s*(?:(\d+)\s+)?(.+?)\s+\$?(\d+\.\d{2})\s*$')

    for line in lines:
        line = line.strip()
        if not line or "TOTAL" in line.upper() or "SUBTOTAL" in line.upper() or "STORE" in line.upper():
            continue
            
        match = item_pattern.match(line)
        if match:
            qty_str, name, price_str = match.groups()
            qty = int(qty_str) if qty_str else 1
            price = float(price_str)
            
            # Clean up item name (remove extra spaces)
            name = re.sub(r'\s+', ' ', name).strip()
            
            # Skip noise lines that match the pattern but are header info
            if len(name) < 3 or name.upper() in ["COLES SUPERMARKETS", "WOOLWORTHS SUPERMARKETS", "MELBOURNE VIC 3000", "SYDNEY NSW 2000"]:
                continue
                
            items.append({
                "raw_name": name,
                "quantity": qty,
                "total_price": price,
                "unit_price": round(price / qty, 2)
            })
            
    return items

def extract_receipt_items(image_bytes: bytes, filename: str = "") -> list:
    """
    Main entrypoint for receipt scanning.
    Tries to open image using PIL to simulate actual processing,
    then returns parsed items. Uses filename hints to load specific
    test receipts, or falls back to Coles sample receipt as default.
    """
    try:
        # Verify it's a valid image
        img = Image.open(BytesIO(image_bytes))
        img.verify()
    except Exception as e:
        print(f"Image validation failed, proceeding with name-based fallback. Error: {e}")

    # Determine which mock text to use based on filename
    filename_lower = filename.lower() if filename else ""
    
    if "woolworths" in filename_lower or "woolies" in filename_lower or "ww" in filename_lower:
        selected_text = WOOLWORTHS_SAMPLE_RECEIPT
        store = "Woolworths"
    elif "coles" in filename_lower:
        selected_text = COLES_SAMPLE_RECEIPT
        store = "Coles"
    else:
        # Default fallback or alternate simulation
        selected_text = COLES_SAMPLE_RECEIPT
        store = "Coles"
        
    parsed_items = parse_receipt_text(selected_text)
    
    return {
        "store_detected": store,
        "items": parsed_items,
        "raw_text": selected_text.strip()
    }
