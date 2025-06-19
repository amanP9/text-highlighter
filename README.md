# Marky - Persistent Text Highlighter

A privacy-first Chrome extension that lets you highlight text on any webpage with **5 beautiful, light colors**. All your highlights are stored locally and persistently using `chrome.storage.local` - no data ever leaves your machine. Marky is your simple and secure highlighting companion.

## Features

- 🖍️ **Persistent Highlighting**: Highlights survive browser restarts and page reloads
- 🎨 **5 Light Colors**: Yellow, Green, Blue, Pink, and Orange highlights
- 🔒 **Privacy-First**: All data stored locally, never sent to external servers
- 🎯 **Minimal Permissions**: Only requests essential permissions for security
- 🖱️ **Context Menu Integration**: Right-click selected text for a color submenu
- ⌨️ **Keyboard Shortcuts**: Use shortcuts for your favorite colors
- 🗑️ **Click to Remove**: Click any highlight to remove it
- 📊 **Color Statistics**: See a breakdown of highlights by color in the popup
- 📥 **Export/Import**: Backup and restore highlights as JSON files
- 🌙 **Dark Mode Support**: Adapts to your system's color scheme
- 🔧 **Developer Friendly**: Clean, modular codebase for easy customization

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
  - `Cmd/Ctrl+Shift+O` - Orange

### Removing Highlights
- Click on any highlighted text.
- Confirm the removal in the color-coded dialog.

### Managing Highlights
Click the Marky icon in your toolbar to open the popup with options to:

- **View Statistics**: See the total number of highlights and a count for each color.
- **Export**: Download all highlights for the current page as a JSON file.
- **Import**: Upload a JSON file to restore highlights.
- **Clear All**: Remove all highlights from the current page.

### Keyboard Shortcuts
**Default shortcuts:**
- `Cmd/Ctrl+Shift+Y` - Yellow
- `Cmd/Ctrl+Shift+K` - Green
- `Cmd/Ctrl+Shift+U` - Blue
- `Cmd/Ctrl+Shift+O` - Orange

**To customize:**
1. Go to `chrome://extensions/shortcuts`
2. Find "Marky"
3. Set your preferred key combinations.

## Technical Details

### Storage Format
Highlights are stored using XPath + character offsets for precise text location:

```json
{
  "id": "highlight_1703123456789_abc123def",
  "text": "Selected text content",
  "color": "yellow",
  "xpath": "/html/body/div[1]/p[2]",
  "startOffset": 15,
  "endOffset": 30,
  "startContainerXPath": "/html/body/div[1]/p[2]/text()",
  "endContainerXPath": "/html/body/div[1]/p[2]/text()",
  "timestamp": 1703123456789
}
```

### Storage Key Format
Each page's highlights are stored under:
`highlights_{origin}{pathname}`

Example: `highlights_https://example.com/articles/page1`

### Permissions Used
- `storage`: Save highlights locally.
- `activeTab`: Access current page content.
- `scripting`: Inject highlighting functionality.
- `contextMenus`: Add the right-click menu option.

## File Structure
```
marky-highlighter/
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
├── popup.css
├── styles.css
├── icons/
└── README.md
```

## Customization

### Changing Highlight Color
Edit `styles.css` and modify the RGBA values for the color classes (e.g., `.text-highlighter-yellow`).

### Adding More Colors
1. Add the new color to the `HIGHLIGHT_COLORS` object in `background.js`.
2. Add a corresponding CSS class in `styles.css`.
3. Add the color to the `colors` object in `popup.js` to ensure stats are displayed correctly.
4. (Optional) Add a new keyboard shortcut in `manifest.json` and handle it in `background.js`.

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

### Export/Import Issues  
- Ensure JSON file format matches expected structure
- Check browser's download/upload permissions
- Try exporting first to verify the format

### Performance Issues
- Large numbers of highlights (>1000 per page) may slow performance
- Consider clearing old highlights periodically
- Complex XPath expressions may take longer to resolve

## Contributing

This extension is designed to be easily extensible. Some ideas for contributions:

- Multiple highlight colors/categories
- Highlight notes/annotations  
- Cross-device sync (with user's cloud storage)
- Advanced search within highlights
- Highlight statistics and analytics
- Integration with note-taking apps

## License

Open source - feel free to modify and redistribute according to the license terms.

## Support

For issues, feature requests, or questions:
1. Check the troubleshooting section above
2. Review the code for customization possibilities  
3. Create an issue in the project repository

---

**Built with privacy in mind. Your highlights, your data, your control.** 🔒