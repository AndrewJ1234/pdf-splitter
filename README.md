# PDF Problem Splitter Extension

A Chrome browser extension that splits PDFs and images into separate problem images.

## Features

- 📄 Upload PDF or image files
- ✂️ Automatically detect problem boundaries or manually divide
- 🎯 Specify number of problems to extract
- 💾 Download individual problem images or all at once
- 🔍 Preview before processing

## Installation

### Chrome/Edge/Brave

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the `pdf-problem-splitter` folder
6. The extension icon will appear in your toolbar

## Usage

1. **Click the extension icon** in your browser toolbar
2. **Upload a file**:
   - Click the upload box or drag and drop
   - Supports PDF and image files (PNG, JPG, etc.)
3. **Configure settings**:
   - Set the number of problems you want to extract
   - Choose split method:
     - **Auto-detect**: Automatically finds problem boundaries using whitespace detection
     - **Manual division**: Divides the document into equal sections
4. **Click "Split into Problems"** to process
5. **Download**:
   - Download individual problems one by one
   - Or click "Download All" to get all problems at once

## How It Works

### Auto-detect Mode
The extension analyzes the document to find whitespace gaps between problems. It looks for rows with high whitespace content (>90% white pixels) and uses these as natural boundaries between problems.

### Manual Division Mode
Simply divides the document into equal-height sections based on the number of problems specified.

## Technical Details

- Built with vanilla JavaScript
- Uses PDF.js for PDF rendering
- Canvas API for image manipulation
- No external server needed - all processing happens in your browser

## File Structure

```
pdf-problem-splitter/
├── manifest.json       # Extension configuration
├── popup.html         # Main UI
├── popup.js           # Core logic
├── styles.css         # Styling
├── icon16.png         # Extension icon (16x16)
├── icon48.png         # Extension icon (48x48)
├── icon128.png        # Extension icon (128x128)
└── README.md          # This file
```

## Limitations

- Auto-detect works best with documents that have clear whitespace between problems
- For documents without clear separation, use manual division mode
- Large PDFs may take longer to process

## Privacy

All processing happens locally in your browser. No data is sent to any server.

## Future Enhancements

- Manual boundary adjustment with drag handles
- Support for multi-column layouts
- OCR to detect problem numbers
- Batch processing multiple files
- Custom naming for output files

## License

MIT License - feel free to modify and use as needed!
