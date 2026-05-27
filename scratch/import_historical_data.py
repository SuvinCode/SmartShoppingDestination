#!/usr/bin/env python3
import os
import sys
import csv
import json
import sqlite3
import re

def log(msg):
    print(f"[*] {msg}")

def error(msg):
    print(f"[ERROR] {msg}", file=sys.stderr)

def extract_size_and_unit(name):
    """
    Fuzzy regex extraction of package size and unit quantity.
    E.g. 'Coles Penne Pasta 500g' -> package_size='500g', unit_type='g', unit_qty=500
    E.g. 'Woolworths Milk 2L' -> package_size='2L', unit_type='ml', unit_qty=2000
    """
    name = name.strip()
    # Try finding patterns like '500g', '500 g', '1.2kg', '2L', '900ml', '750ml'
    match = re.search(r'(\d+(?:\.\d+)?)\s*(g|kg|l|l|ml|pack|pk|each)', name, re.IGNORECASE)
    if match:
        qty_val = float(match.group(1))
        unit = match.group(2).lower()
        
        # Standardize units
        if unit in ('g', 'kg'):
            qty = qty_val * 1000 if unit == 'kg' else qty_val
            return match.group(0), "g", qty
        elif unit in ('l', 'ml'):
            qty = qty_val * 1000 if unit == 'l' else qty_val
            return match.group(0), "ml", qty
        else:
            return match.group(0), "count", qty_val
            
    return "", "count", 1.0

def normalize_row(row):
    """
    Normalizes a CSV row or JSON object to map to the Docket CatalogItem schema.
    """
    # 1. Lowercase keys for flexible matching
    normalized_row = {str(k).lower().strip(): v for k, v in row.items()}
    
    # 2. Extract product name
    name = ""
    for name_key in ('name', 'product_name', 'title', 'description', 'product'):
        if name_key in normalized_row and normalized_row[name_key]:
            name = str(normalized_row[name_key]).strip()
            break
    if not name:
        return None
        
    # 3. Extract store & normalize to docket stores
    store_raw = ""
    for store_key in ('store', 'store_name', 'supermarket', 'retailer'):
        if store_key in normalized_row and normalized_row[store_key]:
            store_raw = str(normalized_row[store_key]).lower().strip()
            break
            
    if 'coles' in store_raw:
        store = "Coles"
    elif 'woolworths' in store_raw or 'woolies' in store_raw:
        store = "Woolworths"
    elif 'aldi' in store_raw:
        store = "Aldi"
    elif 'iga' in store_raw:
        store = "IGA"
    elif 'costco' in store_raw:
        store = "Costco"
    else:
        # Default or skip if not matched
        store = "Coles" if "coles" in name.lower() else ("Woolworths" if "woolworths" in name.lower() else "Coles")
        
    # 4. Extract Category
    category = "Groceries"
    for cat_key in ('category', 'department', 'dept', 'section'):
        if cat_key in normalized_row and normalized_row[cat_key]:
            category = str(normalized_row[cat_key]).strip()
            break
            
    # 5. Extract Price
    shelf_price = 0.0
    for price_key in ('price', 'shelf_price', 'current_price', 'shelfprice'):
        if price_key in normalized_row and normalized_row[price_key]:
            try:
                shelf_price = float(str(normalized_row[price_key]).replace('$', '').strip())
                break
            except ValueError:
                pass
                
    # 6. Normal Price
    normal_price = shelf_price
    for norm_key in ('normal_price', 'normalprice', 'was_price', 'wasprice', 'original_price'):
        if norm_key in normalized_row and normalized_row[norm_key]:
            try:
                normal_price = float(str(normalized_row[norm_key]).replace('$', '').strip())
                break
            except ValueError:
                pass
                
    # 7. Special flags
    is_special = False
    for spec_key in ('is_special', 'special', 'on_special', 'is_promo', 'promo'):
        if spec_key in normalized_row and normalized_row[spec_key]:
            val = str(normalized_row[spec_key]).lower().strip()
            is_special = val in ('true', '1', 'yes', 'y')
            break
            
    # If not explicitly specified, calculate based on prices
    if not is_special and normal_price > shelf_price:
        is_special = True
        
    special_details = ""
    for details_key in ('special_details', 'specialdetails', 'promo_details', 'discount_text', 'badge'):
        if details_key in normalized_row and normalized_row[details_key]:
            special_details = str(normalized_row[details_key]).strip()
            break
    if is_special and not special_details:
        savings = normal_price - shelf_price
        if savings > 0:
            special_details = f"Save ${savings:.2f}"
        else:
            special_details = "Special"
            
    # 8. Package size & Unit Quantities
    extracted_size, extracted_unit, extracted_qty = extract_size_and_unit(name)
    
    package_size = extracted_size
    for size_key in ('package_size', 'packagesize', 'size', 'volume', 'weight'):
        if size_key in normalized_row and normalized_row[size_key]:
            package_size = str(normalized_row[size_key]).strip()
            break
            
    unit_type = extracted_unit
    for unit_key in ('unit_type', 'unittype', 'unit'):
        if unit_key in normalized_row and normalized_row[unit_key]:
            unit_type = str(normalized_row[unit_key]).strip()
            break
            
    unit_quantity = extracted_qty
    for qty_key in ('unit_quantity', 'unitquantity', 'quantity'):
        if qty_key in normalized_row and normalized_row[qty_key]:
            try:
                unit_quantity = float(str(normalized_row[qty_key]).strip())
                break
            except ValueError:
                pass
                
    # 9. Out of stock probability
    out_of_stock_probability = 0.02
    for oos_key in ('out_of_stock_probability', 'out_of_stock', 'oos_probability', 'oos'):
        if oos_key in normalized_row and normalized_row[oos_key]:
            try:
                out_of_stock_probability = float(str(normalized_row[oos_key]).strip())
                break
            except ValueError:
                pass
                
    # Price Per 100 Unit (C# Model calculation)
    # price_per_100_unit = (shelf_price / unit_quantity) * 100
    price_per_100_unit = shelf_price
    if unit_quantity > 0:
        price_per_100_unit = (shelf_price / unit_quantity) * 100.0
        
    return {
        "Store": store,
        "Name": name,
        "Category": category,
        "ShelfPrice": shelf_price,
        "NormalPrice": normal_price,
        "IsSpecial": is_special,
        "SpecialDetails": special_details,
        "PackageSize": package_size,
        "UnitType": unit_type,
        "UnitQuantity": unit_quantity,
        "PricePer100Unit": price_per_100_unit,
        "OutOfStockProbability": out_of_stock_probability
    }

def main():
    if len(sys.argv) < 2:
        # Default to scratch/test_grocery_prices.csv
        script_dir = os.path.dirname(os.path.abspath(__file__))
        data_path = os.path.join(script_dir, "test_grocery_prices.csv")
        if not os.path.exists(data_path):
            data_path = "test_grocery_prices.csv"
    else:
        data_path = sys.argv[1]
        
    if not os.path.exists(data_path):
        error(f"Data file not found at: {data_path}")
        print("Usage: python import_historical_data.py <path_to_data_file> [path_to_docket_db]")
        sys.exit(1)
        
    # Find database
    db_path = None
    if len(sys.argv) >= 3:
        db_path = sys.argv[2]
    else:
        # Search paths
        candidates = ["docket.db", "../docket.db", "backend/docket.db"]
        for cand in candidates:
            if os.path.exists(cand):
                db_path = cand
                break
        if not db_path:
            db_path = "docket.db"
            
    log(f"Reading historical pricing from: {data_path}")
    
    # Parse file
    items = []
    _, ext = os.path.splitext(data_path.lower())
    
    if ext == '.json':
        try:
            with open(data_path, 'r', encoding='utf-8') as f:
                raw_data = json.load(f)
                if isinstance(raw_data, list):
                    for idx, row in enumerate(raw_data):
                        normalized = normalize_row(row)
                        if normalized:
                            items.append(normalized)
                elif isinstance(raw_data, dict):
                    # Handle keyed products structure
                    for k, row in raw_data.items():
                        if isinstance(row, dict):
                            if 'name' not in row:
                                row['name'] = k
                            normalized = normalize_row(row)
                            if normalized:
                                items.append(normalized)
        except Exception as e:
            error(f"Failed to parse JSON file: {e}")
            sys.exit(1)
    else:
        # Assume CSV
        try:
            with open(data_path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    normalized = normalize_row(row)
                    if normalized:
                        items.append(normalized)
        except Exception as e:
            error(f"Failed to parse CSV file: {e}")
            sys.exit(1)
            
    if not items:
        error("No products could be parsed/imported from the data file.")
        sys.exit(1)
        
    log(f"Successfully parsed {len(items)} grocery item(s).")
    
    # Write to SQLite Database directly
    log(f"Connecting to database at: {db_path}")
    conn = None
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if CatalogItems table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='CatalogItems';")
        if not cursor.fetchone():
            error("Table 'CatalogItems' does not exist in target database. Please run migrations/backend project first.")
            sys.exit(1)
            
        # Delete existing entries
        log("Clearing existing entries from 'CatalogItems' table...")
        cursor.execute("DELETE FROM CatalogItems;")
        
        # Insert entries
        log("Inserting imported historical items...")
        insert_query = """
        INSERT INTO CatalogItems (
            Store, Name, Category, ShelfPrice, NormalPrice, IsSpecial,
            SpecialDetails, PackageSize, UnitType, UnitQuantity, PricePer100Unit, OutOfStockProbability
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """
        
        insert_data = [
            (
                item["Store"],
                item["Name"],
                item["Category"],
                item["ShelfPrice"],
                item["NormalPrice"],
                1 if item["IsSpecial"] else 0,
                item["SpecialDetails"],
                item["PackageSize"],
                item["UnitType"],
                item["UnitQuantity"],
                item["PricePer100Unit"],
                item["OutOfStockProbability"]
            )
            for item in items
        ]
        
        cursor.executemany(insert_query, insert_data)
        conn.commit()
        log(f"Database table 'CatalogItems' updated successfully with {len(items)} items.")
        
    except Exception as e:
        error(f"Database operation failed: {e}")
        if conn:
            conn.rollback()
        sys.exit(1)
    finally:
        if conn:
            conn.close()
            
    # Generate catalog_seed.json in root and backend folders
    seed_filename = "catalog_seed.json"
    root_seed_path = seed_filename
    backend_seed_path = os.path.join("backend", seed_filename)
    
    try:
        json_content = json.dumps(items, indent=2)
        
        # Write to root
        with open(root_seed_path, 'w', encoding='utf-8') as f:
            f.write(json_content)
        log(f"Saved seed backup file to: {root_seed_path}")
        
        # Write to backend if backend directory exists
        if os.path.exists("backend"):
            with open(backend_seed_path, 'w', encoding='utf-8') as f:
                f.write(json_content)
            log(f"Saved seed backup file to: {backend_seed_path}")
            
    except Exception as e:
        error(f"Failed to save catalog_seed.json backup: {e}")

    log("Historical data import process completed successfully!")

if __name__ == "__main__":
    main()
