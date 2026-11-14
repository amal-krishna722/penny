# Owner: Person A. Manual test for gemini.py: runs extract_receipt() on photos from disk.
# Run from backend/:  python -m app.receipts.try_gemini receipt1.jpg receipt2.png
import json
import mimetypes
import os
import sys

from app.receipts.gemini import extract_receipt

if len(sys.argv) < 2:
    sys.exit("usage: python -m app.receipts.try_gemini <image> [<image> ...]")

for path in sys.argv[1:]:
    print(f"\n=== {path}")
    if not os.path.isfile(path):
        print("File not found, skipping")
        continue
    mime_type = mimetypes.guess_type(path)[0] or "image/jpeg"
    with open(path, "rb") as f:
        image_bytes = f.read()
    try:
        print(json.dumps(extract_receipt(image_bytes, mime_type), indent=2))
    except ValueError as e:
        print(f"Unreadable receipt: {e}")
