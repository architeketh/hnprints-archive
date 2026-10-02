"""
Downloads every image listed in data/listings.json into the images/ folder.

How to run (from inside the hnprints-archive folder):
    python3 download_images.py        (Mac)
    python download_images.py         (Windows)

Safe to run again: images already downloaded are skipped.
Uses only built-in Python, nothing to install.
"""
import json
import os
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
listings = json.load(open(os.path.join(HERE, "data", "listings.json"), encoding="utf-8"))
os.makedirs(os.path.join(HERE, "images"), exist_ok=True)

jobs = [(img["url"], os.path.join(HERE, img["local"])) for l in listings for img in l["images"]]
print(f"{len(jobs)} images to check")

done = skipped = 0
failed = []
for n, (url, path) in enumerate(jobs, 1):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        skipped += 1
        continue
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as r, open(path, "wb") as f:
            f.write(r.read())
        done += 1
        print(f"[{n}/{len(jobs)}] saved {os.path.basename(path)}")
        time.sleep(0.5)  # be polite to Etsy's servers
    except Exception as e:
        failed.append((url, str(e)))
        print(f"[{n}/{len(jobs)}] FAILED {os.path.basename(path)}: {e}")

print(f"\nDownloaded {done}, already had {skipped}, failed {len(failed)}")
if failed:
    with open(os.path.join(HERE, "failed_downloads.txt"), "w") as f:
        for u, e in failed:
            f.write(f"{u}\t{e}\n")
    print("Failed ones are listed in failed_downloads.txt. Run the script again to retry them.")
