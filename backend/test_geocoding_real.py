import os
import httpx
import asyncio
from dotenv import load_dotenv
import sys

load_dotenv() # Load before importing maps_service

# Add current dir to path to import maps_service
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import maps_service

async def test():
    lat, lng = 14.75252, 121.02629
    address = await maps_service.reverse_geocode(lat, lng)
    print(f"Resulting Address for {lat}, {lng}:")
    print(address)

if __name__ == "__main__":
    asyncio.run(test())
