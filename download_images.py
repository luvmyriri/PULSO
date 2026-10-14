import urllib.request
import os

images = {
    "water_repair.jpg": "https://images.unsplash.com/photo-1541888062887-4638703c3167?auto=format&fit=crop&q=80&w=1200",
    "asphalt.jpg": "https://images.unsplash.com/photo-1518608259424-6f97ef7ac66e?auto=format&fit=crop&q=80&w=1200",
    "job_fair.jpg": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1200",
    "night_repair.jpg": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=1200",
    "led_streetlight.jpg": "https://images.unsplash.com/photo-1508588506041-3b56a1b1510d?auto=format&fit=crop&q=80&w=1200"
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
