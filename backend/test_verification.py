import asyncio
import ocr_service
from pprint import pprint

async def test():
    print("Testing Updated Barangay Detection Logic...")
    res = await ocr_service.perform_ocr(b'')
    print("\nEXTRACTED DATA:")
    pprint(res['extracted_data'])
    
    if res['extracted_data']['is_north_caloocan']:
        print("\n✅ VERIFICATION SUCCESS: Resident is from North Caloocan!")
    else:
        print("\n❌ VERIFICATION FAILED: " + res['extracted_data']['verification_message'])

if __name__ == "__main__":
    asyncio.run(test())
