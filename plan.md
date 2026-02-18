# PDF Problem Splitter - Project Plan

## Project Overview
A browser extension that allows users to upload PDFs or images and automatically split them into individual problem images, facilitating easier problem-by-problem review and sharing.

## Project Goals
1. Enable users to quickly extract individual problems from PDF worksheets, exams, or problem sets
2. Provide both automatic detection and manual control over problem boundaries
3. Make the extraction process simple and intuitive with minimal clicks
4. Allow batch downloading of all extracted problems
5. Ensure all processing happens client-side for privacy and speed

## Target Users
- Students working on problem sets who want to share specific problems
- Teachers creating problem banks from existing materials
- Tutors organizing practice problems for students
- Anyone needing to extract sections from documents

## Core Features

### Phase 1 - MVP (Current)
- [x] File upload (PDF and images)
- [x] PDF rendering and preview
- [x] Basic manual splitting (equal division)
- [x] Auto-detection using whitespace analysis
- [x] Individual problem preview
- [x] Download single problems
- [x] Download all problems at once
- [x] Chrome extension packaging

### Phase 2 - Enhanced Detection
- [ ] Improved auto-detection algorithm
  - [ ] Detect problem numbers (1., 2., a), b), etc.)
  - [ ] Handle multi-column layouts
  - [ ] Recognize section headers
  - [ ] Machine learning-based boundary detection
- [ ] Manual boundary adjustment
  - [ ] Visual markers on preview
  - [ ] Drag handles to adjust split lines
  - [ ] Add/remove boundaries dynamically
- [ ] Confidence scoring for auto-detected boundaries

### Phase 3 - Advanced Features
- [ ] Batch processing multiple files
- [ ] Custom naming conventions for output files
  - [ ] Pattern-based naming (e.g., "Chapter3_Problem{n}")
  - [ ] Auto-numbering options
- [ ] Multiple export formats
  - [ ] Individual images (PNG, JPG)
  - [ ] Combined PDF with one problem per page
  - [ ] ZIP archive of all problems
- [ ] OCR integration
  - [ ] Extract problem text
  - [ ] Search within extracted problems
  - [ ] Auto-categorization based on content

### Phase 4 - Collaboration & Cloud
- [ ] Save extraction templates for repeated use
- [ ] Share extraction settings with others
- [ ] Cloud storage integration (Google Drive, Dropbox)
- [ ] Browser sync for settings across devices

## Technical Approach

### Current Implementation
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **PDF Processing**: PDF.js library
- **Image Processing**: Canvas API
- **Storage**: Local (no backend required)

### Future Considerations
- **ML Model**: TensorFlow.js for advanced problem detection
- **OCR**: Tesseract.js for text extraction
- **State Management**: Consider React/Vue if UI complexity increases
- **Testing**: Jest for unit tests, Puppeteer for E2E tests

## Success Metrics
- User can upload and split a document in < 30 seconds
- Auto-detection accuracy > 85% for standard formatted documents
- Extension remains under 5MB in size
- Zero server dependencies (fully client-side)
- Works offline after installation

## Timeline

### Week 1-2: Foundation ✅
- Set up extension structure
- Implement file upload
- PDF rendering
- Basic splitting logic

### Week 3-4: Enhanced Detection
- Improve auto-detection algorithm
- Add manual boundary adjustment UI
- Test with various document formats

### Week 5-6: User Experience
- Polish UI/UX
- Add keyboard shortcuts
- Implement batch processing
- User testing and feedback

### Week 7-8: Advanced Features
- OCR integration
- Export format options
- Performance optimization

## Risks & Mitigation

### Risk 1: Auto-detection accuracy
- **Impact**: High - Core feature
- **Mitigation**: Provide manual override, collect user feedback, improve algorithm iteratively

### Risk 2: Performance with large PDFs
- **Impact**: Medium - User experience
- **Mitigation**: Implement progressive rendering, web workers for processing, file size limits

### Risk 3: Browser compatibility
- **Impact**: Medium - User reach
- **Mitigation**: Test on Chrome, Edge, Firefox, provide fallbacks for unsupported features

### Risk 4: Complex document layouts
- **Impact**: High - Usability
- **Mitigation**: Support multiple detection methods, manual adjustment tools, clear documentation

## User Feedback Loop
1. Release MVP to small test group
2. Collect feedback on detection accuracy
3. Identify common document formats/layouts
4. Iterate on algorithm improvements
5. Public beta release
6. Continuous improvement based on usage patterns

## Future Expansion Ideas
- Mobile app version (iOS/Android)
- Desktop application for offline use
- API for integration with other tools
- Educational platform integration (Canvas, Blackboard)
- Problem database and sharing community