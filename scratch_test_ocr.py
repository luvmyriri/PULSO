import sys, os
sys.path.append(os.getcwd())
from backend.ocr_service import extract_barangay
text = 'CELINA HOMES 3 BAGUMBONG, BARANGAY 171'
print('EXTRACT:', extract_barangay(text.upper()))
