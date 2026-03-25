from id_parsers.lto import LTOParser
import json

# Exact text from the user's latest LTO image
sample_ocr_text = """
REPUBLIC OF THE PHILIPPINES
DEPARTMENT OF TRANSPORTATION
LAND TRANSPORTATION OFFICE
DRIVER'S LICENSE

Last Name, First Name, Middle Name
TABIOS, GENE GANGE
Nationality PHL Sex M Date of Birth 2005/06/13 Weight (kg) 60 Height (m) 1.65
Address BLK 9 LOT 30, RUBY ST CELINA HOMES 3 BAGUMBONG, BARANGAY 171, CALOOCAN CITY, NCR, THIRD DISTRICT, 1421
License No. C08-25-006312 Expiration Date 2029/06/13 Agency Code C08
Blood Type O+ Eyes Color BLACK
DL Codes B Conditions NONE
"""

def test_lto_parsing():
    parser = LTOParser()
    lines = [l.strip() for l in sample_ocr_text.strip().split('\n')]
    
    print("\n=== LTO LOGIC VERIFICATION (TABIOS, GENE GANGE) ===")
    
    result = parser.extract(sample_ocr_text, lines)
    
    print(f"\nExtracted Data:")
    print(json.dumps(result, indent=4))
    
    # Verification checks
    print("\nValidation Results:")
    if result.get('first_name') == 'Gene' and result.get('middle_name') == 'Gange':
        print("✅ SUCCESS: Name 'Gene Gange' correctly split (First: Gene, Middle: Gange)")
    else:
        print(f"❌ FAILURE: Name split incorrectly. Got First: '{result.get('first_name')}', Middle: '{result.get('middle_name')}'")

    if 'RUBY ST' in result.get('address', '').upper():
        print(f"✅ SUCCESS: Address field captured correctly.")
    else:
        print(f"❌ FAILURE: Address extraction failed.")

if __name__ == "__main__":
    test_lto_parsing()
