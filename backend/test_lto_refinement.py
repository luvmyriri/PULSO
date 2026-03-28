import asyncio
import ocr_service
from pprint import pprint

async def test():
    print("Testing Refined LTO Parsing Rules...")
    res = await ocr_service.perform_ocr(b'')
    data = res['extracted_data']
    
    print("\n[NAME RESULTS]")
    print(f"First Name:  '{data.get('first_name')}'")
    print(f"Middle Name: '{data.get('middle_name')}'")
    print(f"Last Name:   '{data.get('last_name')}'")
    
    print("\n[ADDRESS RESULTS]")
    for k in ['block_lot', 'street', 'subdivision', 'barangay', 'city', 'province', 'postal_code']:
        print(f"{k:12}: '{data.get(k)}'")
    
    # Assertions based on user expectation
    assert data.get('first_name') == 'Gene', f"Expected Gene, got {data.get('first_name')}"
    assert data.get('middle_name') == 'Gange', f"Expected Gange, got {data.get('middle_name')}"
    assert data.get('last_name') == 'Tabios', f"Expected Tabios, got {data.get('last_name')}"
    assert 'BLK 9 LOT 30' in data.get('block_lot', '').upper()
    assert 'RUBY ST' in data.get('street', '').upper()
    assert 'CELINA HOMES 3' in data.get('subdivision', '').upper()
    assert '171' in data.get('barangay', '')
    assert 'CALOOCAN' in data.get('city', '').upper()
    assert '1421' in data.get('postal_code', '')
    
    print("\n✅ ALL ASSERTIONS PASSED!")

if __name__ == "__main__":
    asyncio.run(test())
