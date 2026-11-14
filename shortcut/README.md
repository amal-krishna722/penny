# Itemize iPhone Shortcut

Double-tap the back of your iPhone, photograph a receipt, and it's added to Itemize.

## Install
1. Scan the install QR code shown in the Itemize app, or ask the team for the iCloud link. The link isn't posted here because it contains the API key.
2. Tap **Add Shortcut**. You don't need Back Tap to try it: tap the Shortcut in the Shortcuts app and photograph a receipt.

## Or build it yourself (6 actions)
1. **Take Photo** (Show Camera Preview on)
2. **Convert Image** → JPEG (Preserve Metadata off)
3. **Resize Image** → width 1500, Auto Height
4. **Get Contents of URL**
   - URL: `<server URL>/receipt?source=shortcut`
   - Method: POST
   - Headers: `X-API-Key` = your key, `ngrok-skip-browser-warning` = `1`
   - Request Body: **Form**, add a **File** field named `file` = Resized Image
   - Do not add a Content-Type header (Shortcuts sets it, with the multipart boundary)
5. **Get Dictionary Value** → key `summary`
6. **Show Notification** → Dictionary Value

## Back Tap
Settings → Accessibility → Touch → Back Tap → Double Tap → **Itemize**

## Sharing it safely
A shared Shortcut contains everything in it, including headers. Before creating an iCloud link:
open the Shortcut → ⓘ → **Setup** → **Import Questions** → add a question for the `X-API-Key` value.
The shared copy then asks the installer for the key instead of including yours.

## Troubleshooting
- **Blank notification:** the server didn't return JSON. Check the URL and that the server and ngrok are running.
- **"Bad or missing X-API-Key":** the key is wrong or has a trailing space.
- **Couldn't read the receipt (422):** retake the photo flat, in good light.
- **Scanned the same receipt twice:** you get the existing one back. That's on purpose, to avoid double counting.
- Test the server without the phone: `curl -X POST "<server URL>/receipt" -H "X-API-Key: $KEY" -F "file=@receipt.jpg"`
