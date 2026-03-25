import asyncio
import ocr_service
from id_parsers.lto import LTOParser
from pprint import pprint

async def debug():
    # Use real newlines to reflect actual OCR results
    sim_text = "REPUBLIC OF THE PHILIPPINES\nDEPARTMENT OF TRANSPORTATION\nLAND TRANSPORTATION OFFICE\nDRIVER'S LICENSE\nLAST NAME, FIRST NAME, MIDDLE NAME\nTABIOS, GENE GANGE\nDOB: 2005/06/13 SEX: M\nADDRESS\nBLK 9 LOT 30, RUBY ST CELINA HOMES 3 BAGUMBONG,\nBARANGAY 171, CALOOCAN CITY, NCR, THIRD DISTRICT, 1421"
    
    print("--- RAW TEXT ---")
    print(sim_text)
    
    lines = [line.strip() for line in sim_text.split('\n') if len(line.strip()) > 1]
    parser = LTOParser()
    res = parser.extract(sim_text, lines)
    
    print("\n--- RESULTS ---")
    print(f"FN: '{res['first_name']}'")
    print(f"MN: '{res['middle_name']}'")
    print(f"LN: '{res['last_name']}'")
    print(f"B&L: '{res.get('block_lot')}'")
    print(f"Street: '{res.get('street')}'")
    print(f"Subdiv: '{res.get('subdivision')}'")
    print(f"Barangay: '{res['barangay']}'")
    print(f"City: '{res['city']}'")
    print(f"Postal: '{res['postal_code']}'")

if __name__ == "__main__":
    asyncio.run(debug())
