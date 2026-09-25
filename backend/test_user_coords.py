import os
import sys
from dotenv import load_dotenv

# Add backend to path
sys.path.append(r'c:\Apache24\htdocs\PULSO\backend')

load_dotenv(r'c:\Apache24\htdocs\PULSO\backend\.env')

from maps_service import reverse_geocode

import asyncio

async def test_specific_coords():
    # User provided coordinates
    lat = 14.75252
    lng = 121.02629
    
    print(f"Testing Reverse Geocoding for: {lat}, {lng}")
    address = await reverse_geocode(lat, lng)
    print(f"Resolved Address: {address}")

if __name__ == "__main__":
    asyncio.run(test_specific_coords())

