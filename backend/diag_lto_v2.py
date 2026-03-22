import asyncio
import ocr_service
from id_parsers.lto import LTOParser
from pprint import pprint

async def debug():
    sim_text = "REPUBLIC OF THE PHILIPPINES DEPARTMENT OF TRANSPORTATION LAND TRANSPORTATION OFFICE DRIVER'S LICENSE LAST NAME, FIRST NAME, MIDDLE NAME TABIOS, GENE GANGE DOB: 2005/06/13 SEX: M ADDRESS BLK 9 LOT 30, RUBY ST CELINA HOMES 3 BAGUMBONG, BARANGAY 171, CALOOCAN CITY, NCR, THIRD DISTRICT, 1421"
    
    lines = [line.strip() for line in sim_text.split('\n') if len(line.strip()) > 1]
    parser = LTOParser()
    res = parser.extract(sim_text, lines)
    
    print(f"FN: '{res['first_name']}'")
    print(f"MN: '{res['middle_name']}'")
    print(f"LN: '{res['last_name']}'")
    print(f"Barangay: '{res['barangay']}'")
    print(f"City: '{res['city']}'")
    print(f"Postal: '{res['postal_code']}'")

if __name__ == "__main__":
    asyncio.run(debug())
