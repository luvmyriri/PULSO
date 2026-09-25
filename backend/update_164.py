import json

file_path = 'c:/Apache24/htdocs/PULSO/backend/caloocan_border.json'

with open(file_path, 'r') as f:
    data = json.load(f)

for feature in data['features']:
    props = feature.get('properties', {})
    brgy_num = props.get('brgy_num')
    
    # Per user Latest request: Brgy 164 is now South Caloocan
    if str(brgy_num) == '164':
        props['sector'] = 'South'
        print(f"Brgy 164 updated to South")
    
    # North: 165 - 188
    # South: 1 - 164 (including 164)

with open(file_path, 'w') as f:
    json.dump(data, f, indent=2)

print("GeoJSON sectors updated for Brgy 164 -> South.")
