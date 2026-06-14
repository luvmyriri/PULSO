from ocr_service import parse_address_components

tests = [
    ("Marc Alexis", "Blk 40 Lot 3 Northville 2b Bagumbong, Barangay 171, City Of Caloocan, Ncr, Third District, Philippines", "Barangay 171"),
    ("Gene",        "Blk 9 Lot 30 Ruby St. Celina Homes 3 Bagumbong", "Bagumbong"),
    ("House+Street","123 Rizal Ave. Northville 14 Bagong Silang", "Bagong Silang"),
    ("Lot only",    "Lot 12 B Magsaysay St. Bagumbong Village Caloocan City", ""),
]

for name, addr, brgy in tests:
    r = parse_address_components(addr, brgy)
    print("")
    print("[" + name + "]")
    print("  Input      : " + addr)
    print("  house_no   : " + repr(r['house_no']))
    print("  block_lot  : " + repr(r['block_lot']))
    print("  subdivision: " + repr(r['subdivision']))
    print("  street     : " + repr(r['street']))
