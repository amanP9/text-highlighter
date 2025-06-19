# Installation Guide - Marky Text Highlighter

## Quick Install

1. **Download the Extension**
   - Download `marky-highlighter-v1.2.zip` from the latest release.
   - Extract the ZIP file to a permanent folder on your computer.

2. **Install in Chrome**
   - Open Chrome and go to `chrome://extensions/`.
   - Enable "Developer mode" (toggle in the top right).
   - Click "Load unpacked".
   - Select the extracted folder (the one containing `manifest.json`).
   - The Marky extension should now appear in your extensions list. Pin it for easy access!

3. **Test the Extension**
   - Visit any webpage.
   - Select some text.
   - Right-click and choose "Highlight with Marky" → "🟡 Yellow".
   - Your text should now be highlighted with a light yellow color!

## Features Overview

- **🖱️ Right-Click Menu**: Select text → Right-click → "Highlight with Marky" → Choose color.
- **⌨️ Keyboard Shortcuts**: Use Cmd/Ctrl+Shift+Y/K/U/O for quick highlighting.
- **🗑️ Remove Highlights**: Click any highlight to remove it.
- **📊 Color Statistics**: See highlight breakdown by color in the popup.
- **📁 Manage Highlights**: Export/import/clear options in the extension popup.

## Files Included
A brief overview of the files in the bundle:
```
manifest.json       - Extension configuration
background.js       - Handles context menu and shortcuts
content.js          - The core highlighting functionality
popup.html          - The extension popup interface
popup.js            - Logic for the popup (stats, actions)
popup.css           - Styling for the popup
styles.css          - Styling for the highlights themselves
README.md           - Detailed documentation
```

## Security & Privacy

✅ **Minimal Permissions**: Only requests essential permissions.
✅ **Local Storage**: All data is stored on your device.
✅ **No Network Activity**: Never sends data to external servers.
✅ **Open Source**: Full code transparency for your peace of mind.

## Troubleshooting

**Extension not loading?**
- Make sure Developer mode is enabled
- Check that all files are in the same folder
- Refresh the extensions page

**Highlights not working?**
- Check that the extension is enabled
- Try refreshing the webpage
- Verify you have text selected before right-clicking

**Need help?**
- See the full README.md for detailed documentation
- All features are explained with examples

---

**Ready to highlight the web with Marky! 🖍️** 