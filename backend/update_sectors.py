import json
import os

file_path = 'c:/Apache24/htdocs/PULSO/backend/caloocan_border.json'

with open(file_path, 'r') as f:
    data = json.load(f)

for feature in data['features']:
    props = feature.get('properties', {})
    brgy_num = props.get('brgy_num')
    
    # Per user request: North Caloocan is Brgy 164 to 188
    # South Caloocan is Brgy 1 to 163
    
    if brgy_num is not None:
        try:
            num = int(brgy_num)
            if 164 <= num <= 188:
                props['sector'] = 'North'
                # Also ensure display_name is correct
                if 'display_name' not in props or not props['display_name'].startswith('Brgy.'):
                   props['display_name'] = f"Brgy. {num}"
            elif 1 <= num <= 163:
                props['sector'] = 'South'
                if 'display_name' not in props or not props['display_name'].startswith('Brgy.'):
                   props['display_name'] = f"Brgy. {num}"
            else:
                # Outside Caloocan limits? Keep current or mark as Unknown
                props['sector'] = 'Unknown'
        except (ValueError, TypeError):
            pass

with open(file_path, 'w') as f:
    json.dump(data, f, indent=2)

print("GeoJSON sectors updated successfully.")
