document.addEventListener('DOMContentLoaded', () => {
    const API_URL = "http://localhost:5000/api/search"; // Using POST as per original spec

    // Views
    const initialView = document.getElementById('initial-view');
    const resultsView = document.getElementById('results-view');

    // Initial Search Elements
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const demoQueryButtons = document.querySelectorAll('.demo-query-btn');

    // Results View Elements
    const searchInputSticky = document.getElementById('search-input-sticky');
    const searchButtonSticky = document.getElementById('search-button-sticky');
    const resultsSection = document.getElementById('results-section');
    const systemInfoPanel = document.getElementById('system-info-panel');
    const skeletonLoader = document.getElementById('skeleton-loader');
    const errorMessage = document.getElementById('error-message');

    const performSearch = async (query) => {
        if (!query.trim()) {
            alert('Please enter a search query.');
            return;
        }

        // Transition UI
        initialView.style.display = 'none';
        resultsView.style.display = 'block';
        searchInput.disabled = true;
        searchButton.disabled = true;
        searchButton.textContent = 'Searching...';
        searchInputSticky.value = query;

        // Reset state
        resultsSection.innerHTML = '';
        errorMessage.innerHTML = '';
        systemInfoPanel.innerHTML = '';
        showSkeletonLoader(true);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            renderResults(data);
            renderSystemInfo(data.metadata);

        } catch (error) {
            console.error('Search error:', error);
            showError('Backend service unavailable. Please try again later.');
        } finally {
            showSkeletonLoader(false);
            searchInput.disabled = false;
            searchButton.disabled = false;
            searchButton.textContent = 'Search';
        }
    };

    const renderResults = (data) => {
        if (!data.results || data.results.length === 0) {
            showError('No results found for this query.');
            return;
        }

        data.results.forEach((result, index) => {
            const resultCard = document.createElement('div');
            resultCard.className = 'result-card';
            resultCard.style.animationDelay = `${index * 100}ms`; // Staggered animation
            const snippetHTML = highlightTerms(result.snippet, data.query);
            resultCard.innerHTML = `
                <h3>${result.doc_id}</h3>
                <p class="score">Score: ${result.score.toFixed(3)}</p>
                <p class="snippet">${snippetHTML}</p>
            `;
            resultsSection.appendChild(resultCard);
        });
    };

    const renderSystemInfo = (metadata) => {
        if (!metadata) return;
        const cacheClass = metadata.cache === 'HIT' ? 'cache-hit' : 'cache-miss';
        systemInfoPanel.innerHTML = `
            <h4>Engine Info</h4>
            <div class="info-item">
                <i data-feather="clock"></i>
                <span>Query Time</span>
                <strong>${metadata.query_time_ms}ms</strong>
            </div>
            <div class="info-item">
                <i data-feather="zap"></i>
                <span>Cache Status</span>
                <strong class="${cacheClass}">${metadata.cache}</strong>
            </div>
            <div class="info-item">
                <i data-feather="hash"></i>
                <span>Total Results</span>
                <strong>${metadata.total_results}</strong>
            </div>
        `;
        feather.replace(); // Re-initialize icons
    };

    const highlightTerms = (text, query) => {
        if (!query) return text;
        const terms = query.split(/\s+/).filter(term => term.length > 0);
        let highlightedText = text;
        terms.forEach(term => {
            const regex = new RegExp(`(${term})`, 'gi');
            highlightedText = highlightedText.replace(regex, '<strong>$1</strong>');
        });
        return highlightedText;
    };

    const showSkeletonLoader = (isLoading) => {
        if (isLoading) {
            let skeletons = '';
            for (let i = 0; i < 3; i++) {
                skeletons += '<div class="skeleton-card"><div class="skeleton-line title"></div><div class="skeleton-line"></div><div class="skeleton-line"></div></div>';
            }
            skeletonLoader.innerHTML = skeletons;
        } else {
            skeletonLoader.innerHTML = '';
        }
    };

    const showError = (message) => {
        resultsSection.innerHTML = '';
        errorMessage.innerHTML = `<p>${message}</p>`;
    };

    // Event Listeners
    searchButton.addEventListener('click', () => performSearch(searchInput.value));
    searchInput.addEventListener('keyup', (e) => e.key === 'Enter' && performSearch(searchInput.value));
    searchButtonSticky.addEventListener('click', () => performSearch(searchInputSticky.value));
    searchInputSticky.addEventListener('keyup', (e) => e.key === 'Enter' && performSearch(searchInputSticky.value));

    demoQueryButtons.forEach(button => {
        button.addEventListener('click', () => {
            const query = button.textContent;
            searchInput.value = query;
            performSearch(query);
        });
    });
});
