import urllib.request
import os

images = {
    "water_repair.jpg": "https://picsum.photos/seed/repair/1200/800",
    "led_streetlight.jpg": "https://picsum.photos/seed/light/1200/800"
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
