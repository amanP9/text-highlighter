# Marky - Persistent Text Highlighter

A privacy-first Chrome extension that lets you highlight text on any webpage with **5 beautiful, light colors** and add notes to your highlights. All your highlights are stored locally and persistently using `chrome.storage.local` - no data ever leaves your machine. Marky is your simple and secure highlighting companion.

## Features

- 🖍️ **Persistent Highlighting**: Highlights survive browser restarts and page reloads
- 🎨 **5 Light Colors**: Yellow, Green, Blue, Pink, and Orange highlights
- 📝 **Notes Support**: Add, edit, and view notes on your highlights
- 🔒 **Privacy-First**: All data stored locally, never sent to external servers
- 🎯 **Minimal Permissions**: Only requests essential permissions for security
- 🖱️ **Context Menu Integration**: Right-click selected text for a color submenu
- ⌨️ **Enhanced Keyboard Shortcuts**: Use shortcuts for your favorite colors (works even when Chrome's shortcuts don't)
- 🗑️ **Click to Remove**: Click any highlight to remove it or add/edit notes
- 📊 **Color Statistics**: See a breakdown of highlights by color in the popup
- 📥 **Export/Import**: Backup and restore highlights as JSON files
- 🌙 **Dark Mode Support**: Adapts to your system's color scheme
- 🔧 **Developer Friendly**: Clean, modular codebase for easy customization
- ⚡ **Smart Restoration**: Improved highlight persistence with multiple storage keys and dynamic content handling

## Installation

1. Download the latest release ZIP file from the [releases page](https://github.com/your-repo/marky/releases).
2. Unzip the file.
3. Open Chrome and navigate to `chrome://extensions/`.
4. Enable "Developer mode" in the top right.
5. Click "Load unpacked" and select the unzipped extension folder.
6. The Marky icon (🖍️) should appear in your toolbar.

## Usage

### Highlighting Text
- **🖱️ Right-Click Menu**: Select text → Right-click → "Highlight with Marky" → Choose color.
- **⌨️ Keyboard Shortcuts**: 
  - `Cmd/Ctrl+Shift+Y` - Yellow (Default)
  - `Cmd/Ctrl+Shift+K` - Green
  - `Cmd/Ctrl+Shift+U` - Blue
  - `Cmd/Ctrl+Shift+P` - Pink
  - `Cmd/Ctrl+Shift+O` - Orange

### Managing Highlights
- **Click on any highlighted text** to access the context menu with options to:
  - Add/edit notes
  - Remove the highlight
  - View highlight details

### Adding Notes to Highlights
1. Click on any highlighted text
2. Select "Add Note" or "Edit Note" from the context menu
3. Type your note in the popup dialog
4. Your note will be saved with the highlight

### Managing Highlights
Click the Marky icon in your toolbar to open the popup with options to:

- **View Statistics**: See the total number of highlights and a count for each color.
- **View Notes**: See all highlights with notes on the current page.
- **Export**: Download all highlights for the current page as a JSON file.
- **Import**: Upload a JSON file to restore highlights.
- **Clear All**: Remove all highlights from the current page.

### Keyboard Shortcuts
**Default shortcuts (work even if Chrome shortcuts fail):**
- `Cmd/Ctrl+Shift+Y` - Yellow
- `Cmd/Ctrl+Shift+K` - Green
- `Cmd/Ctrl+Shift+U` - Blue
- `Cmd/Ctrl+Shift+P` - Pink
- `Cmd/Ctrl+Shift+O` - Orange

**To customize Chrome shortcuts:**
1. Go to `chrome://extensions/shortcuts`
2. Find "Marky"
3. Set your preferred key combinations.

Note: Even if Chrome shortcuts don't work, the content script listens for these key combinations directly.

## Technical Details

### Storage Format
Highlights are stored using XPath + character offsets for precise text location:

```json
{
  "id": "highlight_1703123456789_abc123def",
  "text": "Selected text content",
  "color": "yellow",
  "note": "Optional user note",
  "xpath": "/html/body/div[1]/p[2]",
  "startOffset": 15,
  "endOffset": 30,
  "startContainerXPath": "/html/body/div[1]/p[2]/text()",
  "endContainerXPath": "/html/body/div[1]/p[2]/text()",
  "contextBefore": "Context text before highlight",
  "contextAfter": "Context text after highlight",
  "timestamp": 1703123456789
}
```

### Storage Key Format
Each page's highlights are stored under multiple keys for better persistence:
- `highlights_{base64(fullUrl)}` - Primary storage key
- `highlights_{base64(baseUrl)}` - Without search parameters
- `highlights_{origin}_{normalizedPath}` - Fallback key

Example: `highlights_aHR0cHM6Ly9leGFtcGxlLmNvbS9hcnRpY2xlcy9wYWdlMQ`

### Permissions Used
- `storage`: Save highlights locally.
- `activeTab`: Access current page content.
- `scripting`: Inject highlighting functionality.
- `contextMenus`: Add the right-click menu option.

## File Structure
```
text-highlighter/
├── manifest.json          # Extension configuration (v1.3.9)
├── background.js          # Context menu & keyboard shortcuts handler
├── content.js             # Core highlighting functionality
├── popup.html             # Extension popup interface
├── popup.js               # Popup logic (stats, export/import, notes)
├── popup.css              # Popup styling
├── styles.css             # Highlight styling
├── icon16.png             # Extension icon (16px)
├── icon48.png             # Extension icon (48px)
├── icon128.png            # Extension icon (128px)
├── README.md              # This documentation
├── INSTALLATION.md        # Installation guide
└── LICENSE                # License file
```

## Customization

### Changing Highlight Colors
Edit `styles.css` and modify the RGBA values for the color classes (e.g., `.text-highlighter-yellow`).

### Adding More Colors
1. Add the new color to the `HIGHLIGHT_COLORS` object in `background.js`.
2. Add a corresponding CSS class in `styles.css`.
3. Add the color to the `colors` object in `popup.js` to ensure stats are displayed correctly.
4. (Optional) Add a new keyboard shortcut in `manifest.json` and handle it in `background.js` and `content.js`.

### Customizing Keyboard Shortcuts
The extension supports both Chrome's command API and direct keyboard event handling for better reliability.

## Privacy & Security

- **No Network Requests**: Marky never makes external API calls.
- **Local Storage Only**: All data stays on your device.
- **Minimal Permissions**: Only requests what's absolutely necessary.
- **No Analytics/Tracking**: Zero telemetry or usage tracking.
- **Open Source**: Full code transparency for security review.

## Browser Compatibility

- Chrome 88+ (Manifest V3 support)
- Chromium-based browsers (Edge, Brave, etc.)

## Troubleshooting

### Highlights Not Appearing
- Check if the page has dynamic content that changes the DOM
- Try refreshing the page after highlighting
- Verify the extension is enabled in `chrome://extensions/`
- The extension automatically retries highlight restoration on dynamic pages

### Keyboard Shortcuts Not Working
- Chrome shortcuts may not work on some pages (extensions pages, file:// URLs, etc.)
- The extension has fallback keyboard handling that works directly in content
- Try the right-click context menu as an alternative

### Export/Import Issues  
- Ensure JSON file format matches expected structure
- Check browser's download/upload permissions
- Try exporting first to verify the format

### Performance Issues
- Large numbers of highlights (>1000 per page) may slow performance
- Consider clearing old highlights periodically
- Complex XPath expressions may take longer to resolve
- The extension uses smart restoration with debouncing to optimize performance

## Contributing

This extension is designed to be easily extensible. Some ideas for contributions:

- Additional highlight colors/categories
- Highlight search functionality
- Cross-device sync (with user's cloud storage)
- Advanced search within highlights
- Highlight statistics and analytics
- Integration with note-taking apps
- Highlight collections/folders

## License

Open source - feel free to modify and redistribute according to the license terms.

## Support

For issues, feature requests, or questions:
1. Check the troubleshooting section above
2. Review the code for customization possibilities  
3. Create an issue in the project repository

---

**Built with privacy in mind. Your highlights, your data, your control.** 🔒