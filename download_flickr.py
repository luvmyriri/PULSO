import urllib.request
import os

images = {
    "water_repair.jpg": "https://loremflickr.com/1200/800/water,construction",
    "asphalt.jpg": "https://loremflickr.com/1200/800/road,construction",
    "led_streetlight.jpg": "https://loremflickr.com/1200/800/streetlight,night"
}

out_dir = os.path.join("frontend", "public", "news")
os.makedirs(out_dir, exist_ok=True)

for name, url in images.items():
    path = os.path.join(out_dir, name)
    print(f"Downloading {name}...")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response, open(path, 'wb') as out_file:
            out_file.write(response.read())
        print(f"Saved {name}")
    except Exception as e:
        print(f"Failed to download {name}: {e}")
