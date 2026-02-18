# PDF Problem Splitter - Architecture Documentation

## System Overview

The PDF Problem Splitter is a client-side browser extension built with vanilla JavaScript. All processing happens in the user's browser with no backend dependencies, ensuring privacy and fast performance.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser Extension                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │   UI Layer  │  │ Process Layer│  │  Storage Layer │ │
│  │  (popup.html│  │  (popup.js)  │  │   (Canvas/     │ │
│  │   styles.css│  │              │  │    Blob API)   │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
│         │                 │                   │          │
│         └─────────────────┴───────────────────┘          │
│                           │                              │
│                  ┌────────▼────────┐                     │
│                  │  External APIs  │                     │
│                  │   - PDF.js      │                     │
│                  │   - Canvas API  │                     │
│                  │   - File API    │                     │
│                  └─────────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. UI Layer

**Files**: `popup.html`, `styles.css`

**Responsibilities**:
- Render extension popup interface
- Handle user interactions (clicks, drag & drop)
- Display preview and results
- Manage visual states (loading, preview, results)

**Key Components**:
- **Upload Section**: File input, drag & drop zone
- **Preview Section**: Canvas preview, configuration controls
- **Results Section**: Grid of extracted problems with download buttons
- **Loading Section**: Processing indicator

**Design Patterns**:
- Component-based structure with distinct sections
- Progressive disclosure (show sections as user progresses)
- Responsive layout with CSS Grid/Flexbox

### 2. Processing Layer

**File**: `popup.js`

**Responsibilities**:
- File handling and validation
- PDF rendering with PDF.js
- Image processing and manipulation
- Problem detection and splitting algorithms
- Canvas operations
- Download generation

**Key Modules**:

#### File Handler Module
```javascript
- handleFileSelect()
- handleDragDrop()
- handleFile()
- loadPDFPreview()
- loadImagePreview()
```

#### Processing Module
```javascript
- processFile()
- processPDF()
- processImage()
- splitCanvasIntoProblems()
```

#### Detection Module
```javascript
- detectProblemBoundaries()
  ├─ analyzeRowWhitespace()
  ├─ findWhitespaceGaps()
  └─ selectOptimalBoundaries()
```

#### Export Module
```javascript
- downloadImage()
- downloadAll()
- generateBlob()
```

### 3. Storage Layer

**APIs Used**: Canvas API, Blob API, URL API

**Responsibilities**:
- Temporary storage of processed images in memory
- Canvas rendering and manipulation
- Blob generation for downloads
- URL object creation for download links

**Data Flow**:
```
File → ArrayBuffer → Canvas → ImageData → Canvas (split) → Blob → Download
```

## Data Structures

### ProcessedImage Object
```javascript
{
  canvas: HTMLCanvasElement,  // Canvas containing the image
  name: string                 // Filename for download (e.g., "problem_1")
}
```

### ProblemBoundary Object
```javascript
{
  start: number,   // Y-coordinate start
  end: number,     // Y-coordinate end
  middle: number   // Midpoint for splitting
}
```

### Configuration Object
```javascript
{
  numProblems: number,          // Number of problems to extract
  splitMethod: 'auto' | 'manual' // Detection method
}
```

## Algorithm Details

### Auto-Detection Algorithm

**Purpose**: Automatically detect problem boundaries using whitespace analysis

**Process**:
1. **Row Analysis**
   - Iterate through each row of pixels
   - Calculate percentage of white pixels per row
   - Store whiteness ratio for each row

2. **Gap Detection**
   - Identify consecutive rows with >90% whitespace
   - Filter gaps smaller than minimum threshold (10px)
   - Record gap start, end, and midpoint

3. **Boundary Selection**
   - Sort gaps by size (largest first)
   - Select top N-1 gaps (where N = number of problems)
   - Sort selected gaps by position
   - Add document boundaries (0 and height)

4. **Problem Extraction**
   - For each pair of boundaries, extract canvas region
   - Create new canvas for each problem
   - Draw extracted region onto new canvas

**Pseudocode**:
```
function detectBoundaries(canvas, numProblems):
  rowWhiteness = []
  
  for each row in canvas:
    whitePixels = countWhitePixels(row)
    rowWhiteness.append(whitePixels / rowWidth)
  
  gaps = []
  for each row in rowWhiteness:
    if row > 0.9 and not inGap:
      startGap()
    else if row <= 0.9 and inGap:
      endGap()
      if gapSize > 10:
        gaps.append(gap)
  
  sort gaps by size descending
  selectedGaps = gaps[0:numProblems-1]
  sort selectedGaps by position
  
  return [0] + selectedGaps + [height]
```

### Manual Division Algorithm

**Purpose**: Simple equal-height division

**Process**:
1. Calculate problem height = canvas height / number of problems
2. For each problem index:
   - Calculate start Y = index × problem height
   - Extract region from start Y to start Y + problem height
   - Create new canvas with extracted region

## External Dependencies

### PDF.js
**Version**: 3.11.174  
**Purpose**: PDF rendering and parsing  
**Usage**:
```javascript
pdfjsLib.getDocument({ data: arrayBuffer })
  .promise.then(pdf => {
    // Access pages, render to canvas
  })
```

**Why**: Industry-standard PDF library, actively maintained, works client-side

### Canvas API
**Purpose**: Image manipulation and rendering  
**Key Methods**:
- `getContext('2d')` - Get 2D rendering context
- `drawImage()` - Draw images/canvas onto canvas
- `getImageData()` - Access pixel data
- `toBlob()` - Generate downloadable blob

### File API
**Purpose**: Handle file uploads  
**Key Interfaces**:
- `FileReader` - Read file contents
- `File` - Represent uploaded files
- `Blob` - Binary data for downloads

## Security Considerations

### Content Security Policy (CSP)
The extension manifest specifies CSP to prevent XSS attacks:
- Only allow scripts from the extension itself
- Block inline scripts
- Restrict external resource loading

### Data Privacy
- **No network requests**: All processing happens locally
- **No data storage**: Files only in memory during session
- **No telemetry**: No tracking or analytics

### File Validation
- Check file types before processing
- Validate file size to prevent memory issues
- Sanitize filenames for downloads

## Performance Considerations

### Memory Management
- Process one page at a time for large PDFs
- Release canvas references after processing
- Use URL.revokeObjectURL() after downloads
- Limit preview canvas size to avoid memory issues

### Rendering Optimization
- Use appropriate canvas scale (2x for quality, 0.5x for previews)
- Lazy load results (only render visible items)
- Debounce user inputs to avoid excessive re-renders

### Processing Optimization
- Use requestAnimationFrame for smooth UI updates
- Consider Web Workers for heavy processing (future)
- Implement progressive rendering for large documents

## Browser Compatibility

### Target Browsers
- Chrome 90+ (primary)
- Edge 90+ (Chromium-based)
- Opera 76+
- Brave (Chromium-based)

### Required APIs
- Canvas API (supported)
- File API (supported)
- Blob API (supported)
- Chrome Extension Manifest V3 (supported)

### Polyfills
Not required - all APIs are widely supported in target browsers

## Error Handling Strategy

### Error Categories
1. **User Errors**: Invalid files, unsupported formats
2. **Processing Errors**: PDF rendering failures, canvas issues
3. **System Errors**: Out of memory, browser limitations

### Handling Approach
```javascript
try {
  await processFile()
} catch (error) {
  console.error('Processing error:', error)
  showUserFriendlyMessage(error)
  resetUIState()
}
```

### User Feedback
- Clear error messages without technical jargon
- Suggestions for resolution
- Graceful degradation where possible

## Future Architecture Improvements

### Modularization
- Split popup.js into separate modules
- Implement ES6 modules
- Better separation of concerns

### State Management
- Introduce state management library (Redux/MobX)
- Centralize application state
- Enable undo/redo functionality

### Testing Infrastructure
- Unit tests for algorithms
- Integration tests for workflow
- E2E tests with Puppeteer

### Worker Threads
- Offload heavy processing to Web Workers
- Keep UI responsive during processing
- Parallel processing for multiple pages

### Advanced Detection
- Implement ML model with TensorFlow.js
- Train on various document layouts
- Improve accuracy for edge cases