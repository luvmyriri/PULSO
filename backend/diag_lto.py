import asyncio
import ocr_service
from id_parsers.lto import LTOParser
from pprint import pprint

async def debug():
    sim_text = "REPUBLIC OF THE PHILIPPINES DEPARTMENT OF TRANSPORTATION LAND TRANSPORTATION OFFICE DRIVER'S LICENSE LAST NAME, FIRST NAME, MIDDLE NAME TABIOS, GENE GANGE DOB: 2005/06/13 SEX: M ADDRESS BLK 9 LOT 30, RUBY ST CELINA HOMES 3 BAGUMBONG, BARANGAY 171, CALOOCAN CITY, NCR, THIRD DISTRICT, 1421"
    
    # Split as ocr_service does
    lines = [line.strip() for line in sim_text.split('\n') if len(line.strip()) > 1]
    print(f"Lines count: {len(lines)}")
    for i, l in enumerate(lines):
        print(f"[{i}] {l}")
        
    parser = LTOParser()
    res = parser.extract(sim_text, lines)
    pprint(res)

if __name__ == "__main__":
    asyncio.run(debug())
