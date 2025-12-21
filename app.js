// Backend API configuration
const API_BASE_URL = 'http://127.0.0.1:8000';

// DOM elements
const fileInput = document.getElementById('file-input');
const uploadButton = document.getElementById('upload-button');
const uploadStatus = document.getElementById('upload-status');
const uploadSection = document.getElementById('upload-section');
const searchSection = document.getElementById('search-section');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const searchStatus = document.getElementById('search-status');
const metadataSection = document.getElementById('metadata-section');
const documentSection = document.getElementById('document-section');
const documentDisplay = document.getElementById('document-display');

// State
let uploadedDocumentText = '';
let currentHighlights = [];

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    // File input change handler
    fileInput.addEventListener('change', handleFileSelect);
    
    // Upload button click handler
    uploadButton.addEventListener('click', handleUpload);
    
    // Search button click handler
    searchButton.addEventListener('click', handleSearch);
    
    // Search input enter key handler
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
});

/**
 * Handle file selection
 */
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        if (!file.name.endsWith('.txt')) {
            showStatus(uploadStatus, 'Please select a .txt file', 'error');
            uploadButton.disabled = true;
            return;
        }
        
        // Read file content for preview (not sent to backend yet)
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedDocumentText = e.target.result;
            uploadButton.disabled = false;
            showStatus(uploadStatus, `File selected: ${file.name}`, 'info');
        };
        reader.readAsText(file);
    }
}

/**
 * Handle document upload to backend
 */
async function handleUpload() {
    const file = fileInput.files[0];
    if (!file) {
        showStatus(uploadStatus, 'Please select a file first', 'error');
        return;
    }

    uploadButton.disabled = true;
    showStatus(uploadStatus, 'Uploading...', 'info');

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Upload failed with status ${response.status}`);
        }

        const data = await response.json();
        
        // Show success message
        showStatus(uploadStatus, 
            `Document uploaded successfully. Length: ${data.doc_length} characters, Unique terms: ${data.unique_terms}`, 
            'success'
        );

        // Enable search section
        searchSection.hidden = false;
        searchInput.focus();

        // Display document
        documentDisplay.textContent = uploadedDocumentText;
        documentSection.hidden = false;
        currentHighlights = [];

    } catch (error) {
        console.error('Upload error:', error);
        showStatus(uploadStatus, `Upload failed: ${error.message}`, 'error');
        uploadButton.disabled = false;
    }
}

/**
 * Handle search request
 */
async function handleSearch() {
    const query = searchInput.value.trim();
    
    // Validate query
    if (!query) {
        showStatus(searchStatus, 'Please enter a search query', 'error');
        return;
    }

    // Check if document is uploaded
    if (!uploadedDocumentText) {
        showStatus(searchStatus, 'Please upload a document first', 'error');
        return;
    }

    searchButton.disabled = true;
    showStatus(searchStatus, 'Searching...', 'info');
    metadataSection.hidden = true;

    try {
        // Build search URL with query parameter
        const searchUrl = new URL(`${API_BASE_URL}/search`);
        searchUrl.searchParams.set('q', query);

        const response = await fetch(searchUrl.toString(), {
            method: 'GET'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Search failed with status ${response.status}`);
        }

        const data = await response.json();
        
        // Update metadata
        updateMetadata(data);
        
        // Highlight document based on backend response
        highlightDocument(data.matches, query);
        
        // Show metadata section
        metadataSection.hidden = false;
        
        // Clear status or show success
        if (data.total_matches === 0) {
            showStatus(searchStatus, 'No matches found', 'info');
        } else {
            searchStatus.hidden = true;
        }

    } catch (error) {
        console.error('Search error:', error);
        showStatus(searchStatus, `Search failed: ${error.message}`, 'error');
    } finally {
        searchButton.disabled = false;
    }
}

/**
 * Update metadata display from backend response
 */
function updateMetadata(data) {
    document.getElementById('total-matches').textContent = data.total_matches || 0;
    document.getElementById('time-taken').textContent = `${data.time_ms || 0} ms`;
    
    const cacheStatus = data.cache || 'UNKNOWN';
    const cacheElement = document.getElementById('cache-status');
    cacheElement.textContent = cacheStatus;
    
    // Style cache status
    if (cacheStatus === 'HIT') {
        cacheElement.style.color = '#059669';
    } else if (cacheStatus === 'MISS') {
        cacheElement.style.color = '#dc2626';
    } else {
        cacheElement.style.color = '#666';
    }
}

/**
 * Highlight document text based on backend response
 * Backend provides matches with term and character positions
 */
function highlightDocument(matches, query) {
    if (!matches || matches.length === 0) {
        // No matches - display plain text
        documentDisplay.textContent = uploadedDocumentText;
        currentHighlights = [];
        return;
    }

    // Collect all position ranges to highlight
    // Backend provides: [{ term: "search", positions: [15, 98, 201] }, ...]
    // Each position is the start character index of the term
    const highlightRanges = [];
    
    matches.forEach(match => {
        if (match.term && match.positions && Array.isArray(match.positions)) {
            const termLength = match.term.length;
            match.positions.forEach(pos => {
                const start = parseInt(pos);
                const end = start + termLength;
                highlightRanges.push({ start, end, term: match.term });
            });
        }
    });

    if (highlightRanges.length === 0) {
        // Fallback: if backend doesn't provide positions, highlight terms directly
        highlightByTerms(matches, query);
        return;
    }

    // Sort ranges by start position
    highlightRanges.sort((a, b) => a.start - b.start);
    
    // Merge overlapping ranges
    const mergedRanges = [];
    for (const range of highlightRanges) {
        if (mergedRanges.length === 0) {
            mergedRanges.push(range);
        } else {
            const last = mergedRanges[mergedRanges.length - 1];
            if (range.start <= last.end) {
                // Overlapping - extend the last range
                last.end = Math.max(last.end, range.end);
            } else {
                mergedRanges.push(range);
            }
        }
    }

    // Build highlighted HTML by inserting <mark> tags at positions
    let highlightedHTML = '';
    let currentPos = 0;
    const text = uploadedDocumentText;
    
    mergedRanges.forEach(range => {
        // Add text before highlight
        if (currentPos < range.start) {
            highlightedHTML += escapeHtml(text.substring(currentPos, range.start));
        }
        
        // Add highlighted text
        const highlightedText = text.substring(range.start, Math.min(range.end, text.length));
        highlightedHTML += `<mark class="highlight">${escapeHtml(highlightedText)}</mark>`;
        
        currentPos = range.end;
    });
    
    // Add remaining text after last highlight
    if (currentPos < text.length) {
        highlightedHTML += escapeHtml(text.substring(currentPos));
    }

    documentDisplay.innerHTML = highlightedHTML;
    currentHighlights = mergedRanges;
}

/**
 * Fallback highlighting by terms (if backend doesn't provide positions)
 */
function highlightByTerms(matches, query) {
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    let highlightedHTML = escapeHtml(uploadedDocumentText);
    
    terms.forEach(term => {
        const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
        highlightedHTML = highlightedHTML.replace(regex, '<mark class="highlight">$1</mark>');
    });
    
    documentDisplay.innerHTML = highlightedHTML;
}

/**
 * Utility: Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Utility: Escape regex special characters
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Show status message
 */
function showStatus(element, message, type) {
    element.textContent = message;
    element.className = `status-message ${type}`;
    element.hidden = false;
}

