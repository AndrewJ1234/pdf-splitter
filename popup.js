// PDF.js — local worker (Chrome MV3 CSP requirement)
pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.js');

// ── State ─────────────────────────────────────────────────────────────────────
let processedImages = [];  // [{canvas, name, notes?}]
let renderedPages   = [];  // [{canvas, textItems}]
let sessionFilename = '';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const fileInput        = document.getElementById('fileInput');
const uploadBox        = document.getElementById('uploadBox');
const numProblemsInput = document.getElementById('numProblems');
const numProblemsGroup = document.getElementById('numProblemsGroup');

const uploadScreen    = document.getElementById('uploadScreen');
const loadingScreen   = document.getElementById('loadingScreen');
const worksheetScreen = document.getElementById('worksheetScreen');
const worksheetBody   = document.getElementById('worksheetBody');
const wsTitle         = document.getElementById('wsTitle');
const backBtn         = document.getElementById('backBtn');
const wsPrint         = document.getElementById('wsPrint');
const wsDownloadAll   = document.getElementById('wsDownloadAll');
const wsNew           = document.getElementById('wsNew');

const qlModal  = document.getElementById('quickLookModal');
const qlCanvas = document.getElementById('qlCanvas');
const qlClose  = document.getElementById('qlClose');
const qlTitle  = document.getElementById('qlTitle');

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadSession);

// ── Upload handlers ───────────────────────────────────────────────────────────
fileInput.addEventListener('change', e => { if (e.target.files[0]) startProcessing(e.target.files[0]); });
uploadBox.addEventListener('click', () => fileInput.click());
uploadBox.addEventListener('dragover',  e => { e.preventDefault(); uploadBox.classList.add('drag-over'); });
uploadBox.addEventListener('dragleave', e => { e.preventDefault(); uploadBox.classList.remove('drag-over'); });
uploadBox.addEventListener('drop', e => {
  e.preventDefault();
  uploadBox.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) startProcessing(e.dataTransfer.files[0]);
});

// Split method toggle
document.querySelectorAll('input[name="splitMethod"]').forEach(r =>
  r.addEventListener('change', () => {
    numProblemsGroup.style.display =
      document.querySelector('input[name="splitMethod"]:checked').value === 'manual'
        ? 'flex' : 'none';
  })
);

// Top bar buttons
backBtn.addEventListener('click', () => showScreen(uploadScreen));
wsNew.addEventListener('click', () => {
  if (confirm('Start a new session? Current work will be cleared.')) {
    chrome.storage.local.remove('worksheet_session', () => showScreen(uploadScreen));
  }
});

wsDownloadAll.addEventListener('click', () => {
  processedImages.forEach((img, i) =>
    setTimeout(() => downloadImage(img.canvas, img.name), i * 200)
  );
});

wsPrint.addEventListener('click', exportToPDF);

// Quick Look
qlClose.addEventListener('click', closeQL);
qlModal.addEventListener('click', e => { if (e.target === qlModal) closeQL(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeQL(); });

// ── Screen management ─────────────────────────────────────────────────────────
function showScreen(screen) {
  [uploadScreen, loadingScreen, worksheetScreen].forEach(s => s.style.display = 'none');
  screen.style.display = 'flex';
}

// ── Persistence ───────────────────────────────────────────────────────────────
async function saveSession() {
  const imagesData = processedImages.map(img => ({
    name: img.name,
    dataUrl: img.canvas.toDataURL('image/png'),
    notes: img.notes || ''
  }));

  const session = {
    filename: sessionFilename,
    images: imagesData,
    timestamp: Date.now()
  };

  chrome.storage.local.set({ 'worksheet_session': session });
}

function loadSession() {
  chrome.storage.local.get('worksheet_session', async (result) => {
    const session = result.worksheet_session;
    if (!session || !session.images || session.images.length === 0) return;

    sessionFilename = session.filename;
    processedImages = [];

    // Reconstruct canvases from dataURLs
    for (const item of session.images) {
      const img = new Image();
      await new Promise(r => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          canvas.getContext('2d').drawImage(img, 0, 0);
          processedImages.push({ canvas, name: item.name, notes: item.notes });
          r();
        };
        img.src = item.dataUrl;
      });
    }

    buildWorksheet(sessionFilename);
    showScreen(worksheetScreen);
  });
}

// ── Main flow ─────────────────────────────────────────────────────────────────
async function startProcessing(file) {
  processedImages = [];
  renderedPages   = [];
  sessionFilename = file.name;

  showScreen(loadingScreen);

  try {
    if (file.type === 'application/pdf') {
      await loadPDF(file);
    } else if (file.type.startsWith('image/')) {
      await loadImage(file);
    } else {
      alert('Unsupported file type. Please upload a PDF or image.');
      showScreen(uploadScreen);
      return;
    }

    const splitMethod = document.querySelector('input[name="splitMethod"]:checked').value;
    if (splitMethod === 'auto') {
      await splitByTopLevelProblems();
    } else {
      await splitManually(parseInt(numProblemsInput.value) || 5);
    }

    if (processedImages.length === 0) {
      alert('No problems found. Try switching to Manual split mode.');
      showScreen(uploadScreen);
      return;
    }

    buildWorksheet(sessionFilename);
    showScreen(worksheetScreen);
    saveSession();
  } catch (err) {
    console.error(err);
    alert('Error processing file: ' + err.message);
    showScreen(uploadScreen);
  }
}

// ── PDF loading ───────────────────────────────────────────────────────────────
async function loadPDF(file) {
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page     = await pdf.getPage(pageNum);
    const scale    = 3; // Improved resolution for better readability
    const viewport = page.getViewport({ scale });

    const canvas  = document.createElement('canvas');
    canvas.width  = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

    const textContent = await page.getTextContent();
    const textItems = textContent.items.map(item => ({
      str:    item.str,
      x:      item.transform[4] * scale,
      y:      viewport.height - item.transform[5] * scale,
      height: Math.abs(item.height) * scale,
    }));

    renderedPages.push({ canvas, textItems });
  }
}

async function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        renderedPages = [{ canvas, textItems: [] }];
        resolve();
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Splitting ─────────────────────────────────────────────────────────────────
async function splitByTopLevelProblems() {
  const topLevelRe = /^\s*(\d+)\.\s+\S/;
  const { stitched, totalWidth, totalHeight, pageOffsets } = stitchPages();

  const allItems = [];
  for (let pi = 0; pi < renderedPages.length; pi++) {
    for (const item of renderedPages[pi].textItems) {
      allItems.push({ ...item, absY: pageOffsets[pi] + item.y });
    }
  }

  const rows = groupIntoRows(allItems, 4);
  const cuts = [];

  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
    const lineText = row.map(t => t.str).join('').trim();
    
    // Ignore rows that are likely just page numbers (single digit or simple "1", "2")
    if (/^\s*\d+\s*$/.test(lineText) && row.length === 1) {
       continue;
    }

    if (topLevelRe.test(lineText)) {
      const match      = lineText.match(/^\s*(\d+)\./);
      const label      = match ? match[1] : '?';
      // Pull cut up by looking at the highest point of any character in the row, then adding a buffer
      const topOfRow   = Math.min(...row.map(t => t.absY - (t.height || 20)));
      const cutY       = Math.max(0, topOfRow - 20); // 20px buffer above the number
      cuts.push({ cutY, label });
    }
  }

  if (cuts.length === 0) {
    await splitManually(5);
    return;
  }

  const boundaries = cuts.map((cut, i) => ({
    startY: cut.cutY,
    endY:   i + 1 < cuts.length ? cuts[i + 1].cutY : totalHeight,
    label:  `Problem ${cut.label}`
  }));

  sliceAndPush(stitched, totalWidth, boundaries);
}

async function splitManually(numSections) {
  const { stitched, totalWidth, totalHeight } = stitchPages();
  const h = totalHeight / numSections;
  const boundaries = Array.from({ length: numSections }, (_, i) => ({
    startY: i * h,
    endY:   (i + 1) * h,
    label:  `Section ${i + 1}`
  }));
  sliceAndPush(stitched, totalWidth, boundaries);
}

function stitchPages() {
  const totalWidth  = Math.max(...renderedPages.map(p => p.canvas.width));
  const totalHeight = renderedPages.reduce((s, p) => s + p.canvas.height, 0);
  const stitched    = document.createElement('canvas');
  stitched.width    = totalWidth;
  stitched.height   = totalHeight;
  const ctx         = stitched.getContext('2d');
  const pageOffsets = [];
  let y = 0;
  for (const { canvas } of renderedPages) {
    ctx.drawImage(canvas, 0, y);
    pageOffsets.push(y);
    y += canvas.height;
  }
  return { stitched, totalWidth, totalHeight, pageOffsets };
}

function sliceAndPush(stitched, totalWidth, boundaries) {
  for (const { startY, endY, label } of boundaries) {
    const height = Math.max(1, Math.round(endY - startY));
    if (height < 30) continue; 

    let out = document.createElement('canvas');
    out.width  = totalWidth;
    out.height = height;
    out.getContext('2d').drawImage(
      stitched,
      0, Math.round(startY), totalWidth, height,
      0, 0,                  totalWidth, height
    );
    
    // Pre-process: Crop and Remove large white gaps
    out = preprocessCanvas(out);
    
    processedImages.push({ canvas: out, name: label, notes: '' });
  }
}

/**
 * Smarter cropping: removes outside margins AND large inner white horizontal gaps
 */
function preprocessCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // 1. Identify rows with content
  const rowHasContent = new Array(h).fill(false);
  const CONTENT_PIXEL_THRESHOLD = Math.max(5, w * 0.015); // Ignore rows with <1.5% pixels (like noise or stray page numbers)

  for (let y = 0; y < h; y++) {
    let nonWhitePixels = 0;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (data[idx] < 240 || data[idx+1] < 240 || data[idx+2] < 240) {
        nonWhitePixels++;
      }
    }
    if (nonWhitePixels > CONTENT_PIXEL_THRESHOLD) {
      rowHasContent[y] = true;
    }
  }

  // 2. Identify columns with content
  const colHasContent = new Array(w).fill(false);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      if (rowHasContent[y]) {
        const idx = (y * w + x) * 4;
        if (data[idx] < 240 || data[idx+1] < 240 || data[idx+2] < 240) {
          colHasContent[x] = true;
          break;
        }
      }
    }
  }

  // Find boundaries
  let top = 0; while (top < h && !rowHasContent[top]) top++;
  let bottom = h - 1; while (bottom > top && !rowHasContent[bottom]) bottom--;
  let left = 0; while (left < w && !colHasContent[left]) left++;
  let right = w - 1; while (right > left && !colHasContent[right]) right--;

  if (top >= bottom || left >= right) return canvas;

  // 3. Compact vertical space: Remove large gaps (>60px of white)
  const compactRows = [];
  let gapCount = 0;
  const GAP_THRESHOLD = 60; 
  
  for (let y = top; y <= bottom; y++) {
    if (!rowHasContent[y]) {
      gapCount++;
    } else {
      gapCount = 0;
    }
    // Only keep rows that aren't part of a massive gap
    if (gapCount <= GAP_THRESHOLD) {
      compactRows.push(y);
    }
  }

  if (compactRows.length === 0) return canvas;

  // 4. Final render with Padding (24px) for a premium look
  const PADDING = 24;
  const finalHeight = compactRows.length + (PADDING * 2);
  const finalWidth = (right - left + 1) + (PADDING * 2);
  
  const resCanvas = document.createElement('canvas');
  resCanvas.width = finalWidth;
  resCanvas.height = finalHeight;
  const resCtx = resCanvas.getContext('2d');
  
  // Fill white background
  resCtx.fillStyle = '#ffffff';
  resCtx.fillRect(0, 0, finalWidth, finalHeight);

  // Draw row by row to shift and skip gaps
  compactRows.forEach((oldY, newY) => {
    resCtx.drawImage(canvas, left, oldY, right - left + 1, 1, PADDING, newY + PADDING, right - left + 1, 1);
  });

  return resCanvas;
}

function groupIntoRows(items, tolerance) {
  if (!items.length) return [];
  const sorted = [...items].sort((a, b) => a.absY - b.absY);
  const rows = [];
  let row = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i].absY - sorted[i - 1].absY) <= tolerance) {
      row.push(sorted[i]);
    } else {
      rows.push(row);
      row = [sorted[i]];
    }
  }
  rows.push(row);
  return rows;
}

// ── Build the worksheet ───────────────────────────────────────────────────────
function buildWorksheet(filename) {
  worksheetBody.innerHTML = '';
  wsTitle.textContent = `${processedImages.length} problems · ${filename}`;

  processedImages.forEach((imgObj, idx) => {
    const card = document.createElement('div');
    card.className = 'problem-card';

    const cardHeader = document.createElement('div');
    cardHeader.className = 'problem-card-header';

    const label = document.createElement('span');
    label.className = 'problem-card-label';
    label.textContent = imgObj.name;

    const dlBtn = document.createElement('button');
    dlBtn.className = 'problem-card-dl';
    dlBtn.textContent = '⬇ Save image';
    dlBtn.onclick = () => downloadImage(imgObj.canvas, imgObj.name.replace(/\s+/g, '_'));

    cardHeader.appendChild(label);
    cardHeader.appendChild(dlBtn);

    const imgArea = document.createElement('div');
    imgArea.className = 'problem-img-area';
    imgArea.title = 'Click to zoom';

    const thumb = document.createElement('canvas');
    const maxW  = 720;
    const scale = Math.min(maxW / imgObj.canvas.width, 1);
    thumb.width  = imgObj.canvas.width  * scale;
    thumb.height = imgObj.canvas.height * scale;
    thumb.getContext('2d').drawImage(imgObj.canvas, 0, 0, thumb.width, thumb.height);
    imgArea.appendChild(thumb);
    imgArea.addEventListener('click', () => openQL(imgObj));

    const workHeader = document.createElement('div');
    workHeader.className = 'work-area-header';

    const workLabel = document.createElement('span');
    workLabel.className = 'work-area-label';
    workLabel.textContent = '✏️ Work Area';

    const clearBtn = document.createElement('button');
    clearBtn.className = 'clear-btn';
    clearBtn.textContent = 'Clear';
    clearBtn.onclick = () => { textarea.value = ''; imgObj.notes = ''; saveSession(); textarea.focus(); };

    workHeader.appendChild(workLabel);
    workHeader.appendChild(clearBtn);

    const textarea = document.createElement('textarea');
    textarea.className = 'work-textarea';
    textarea.placeholder = 'Write your work, notes, or answers here…';
    textarea.value = imgObj.notes || '';

    // Debounced auto-save
    let saveTimeout;
    textarea.addEventListener('input', () => {
      imgObj.notes = textarea.value;
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveSession, 1000);
    });

    card.appendChild(cardHeader);
    card.appendChild(imgArea);
    card.appendChild(workHeader);
    card.appendChild(textarea);

    worksheetBody.appendChild(card);
  });

  worksheetBody.scrollTop = 0;
}

// ── Export to PDF (Direct Download) ───────────────────────────────────────────
async function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const usableWidth = pageWidth - (margin * 2);

  for (let i = 0; i < processedImages.length; i++) {
    const item = processedImages[i];
    if (i > 0) doc.addPage();

    // 1. Minimal Title (Problem X)
    doc.setFontSize(12);
    doc.setTextColor(67, 79, 241);
    doc.text(item.name, margin, margin + 4);

    // 2. Problem Image - Fill as much of the page as possible
    const imgData = item.canvas.toDataURL('image/jpeg', 0.95);
    const imgProps = doc.getImageProperties(imgData);
    const imgRatio = imgProps.height / imgProps.width;
    
    let drawW = usableWidth;
    let drawH = drawW * imgRatio;

    // If image is too tall, scale it down to fit the page
    const maxDrawH = pageHeight - (margin * 2.5);
    if (drawH > maxDrawH) {
      drawH = maxDrawH;
      drawW = drawH / imgRatio;
    }

    // Center horizontally
    const xPos = margin + (usableWidth - drawW) / 2;
    doc.addImage(imgData, 'JPEG', xPos, margin + 10, drawW, drawH);

    // Filtered out: "NOTES / SOLUTION AREA" and gray lines as requested
    
    // 3. Add notes text briefly at the bottom only if they exist
    if (item.notes && item.notes.trim()) {
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      const splitText = doc.splitTextToSize("Notes: " + item.notes, usableWidth);
      doc.text(splitText, margin, pageHeight - margin);
    }
  }

  const cleanName = sessionFilename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`${cleanName}_worksheet.pdf`);
}

// ── Quick Look ────────────────────────────────────────────────────────────────
function openQL(imgObj) {
  const img = imgObj.canvas;
  const maxW = 728;
  const maxH = 520;
  const scale = Math.min(maxW / img.width, maxH / img.height, 1);
  qlCanvas.width  = img.width  * scale;
  qlCanvas.height = img.height * scale;
  qlCanvas.getContext('2d').drawImage(img, 0, 0, qlCanvas.width, qlCanvas.height);
  qlTitle.textContent = imgObj.name;
  qlModal.classList.add('open');
}

function closeQL() {
  qlModal.classList.remove('open');
}

// ── Download ──────────────────────────────────────────────────────────────────
function downloadImage(canvas, name) {
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `${name}.png`;
    a.click();
    URL.revokeObjectURL(url);
  });
}
