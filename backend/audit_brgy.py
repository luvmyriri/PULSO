
import json

with open('c:/Apache24/htdocs/PULSO/backend/caloocan_border.json', 'r') as f:
    data = json.load(f)

barangays = []
for feature in data['features']:
    props = feature['properties']
    barangays.append({
        'num': props.get('brgy_num'),
        'name': props.get('ADM4_EN'),
        'sector': props.get('sector')
    })

# Sort by number
barangays.sort(key=lambda x: x['num'] if x['num'] is not None else 999)

for i, feature in enumerate(data['features']):
    props = feature['properties']
    if props.get('brgy_num') == 165:
        print(f"Brgy 165 found at feature index {i}")
        print(json.dumps(props, indent=2))

print("\n--- North Caloocan Barangays (Currently) ---")
for i, feature in enumerate(data['features']):
    if feature.get('properties', {}).get('sector') == 'North':
        print(f"Brgy {feature['properties'].get('brgy_num')}: {feature['properties'].get('ADM4_EN')}")

print("\n--- South Caloocan Barangays (Currently) ---")
for b in barangays:
    if b['sector'] == 'South':
        print(f"Brgy {b['num']}: {b['name']}")

print("\n--- Missing or Unsectorized ---")
for b in barangays:
    if b['sector'] not in ['North', 'South']:
        print(f"Brgy {b['num']}: {b['name']} (Sector: {b['sector']})")
