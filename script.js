document.addEventListener('DOMContentLoaded', () => {
    // ---- Backend endpoint configuration (planned APIs) ----
    const API_CONFIG = {
        baseUrl: '',
        search: '/api/search',
        suggest: '/api/suggest',
        document: (id) => `/api/document/${encodeURIComponent(id)}`,
        analyticsSearch: '/api/analytics/search',
        health: '/api/health',
    };

    // ---- Application state ----
    const state = {
        query: '',
        filter: 'all', // all | article | pdf | recent
        page: 1,
        limit: 10,
        totalResults: 0,
        executionTime: null,
        results: [],
        loading: false,
        error: null,
        lastRequest: null,
    };

    // ---- DOM references ----
    const homeView = document.getElementById('home-view');
    const resultsView = document.getElementById('results-view');

    const searchInputHero = document.getElementById('search-input');
    const searchButtonHero = document.getElementById('search-button');
    const autocompleteHero = document.getElementById('autocomplete-list');

    const searchInputInline = document.getElementById('search-input-inline');
    const searchButtonInline = document.getElementById('search-button-inline');
    const autocompleteInline = document.getElementById('autocomplete-list-inline');

    const sampleChips = document.querySelectorAll('.sample-chip');
    const brandHome = document.getElementById('brand-home');

    const filterTabs = document.querySelectorAll('.filter-tab');

    const resultsMeta = document.getElementById('results-meta');
    const resultsList = document.getElementById('results-list');
    const resultsEmpty = document.getElementById('results-empty');
    const resultsError = document.getElementById('results-error');
    const resultsLoading = document.getElementById('results-loading');

    const pagination = document.getElementById('pagination');
    const paginationLabel = document.getElementById('pagination-label');
    const paginationButtons = pagination.querySelectorAll('.pagination-button');

    const retryButton = document.getElementById('retry-button');

    // ---- API abstraction (backend-ready, mocked for now) ----

    async function apiSearch(params) {
        const url = new URL(API_CONFIG.search, API_CONFIG.baseUrl || window.location.origin);
        url.searchParams.set('q', params.q);
        url.searchParams.set('page', String(params.page ?? 1));
        url.searchParams.set('limit', String(params.limit ?? 10));
        if (params.filter && params.filter !== 'all') {
            url.searchParams.set('filter', params.filter);
        }

        // Placeholder: use mock results instead of real network call for now.
        // To integrate backend: uncomment the fetch below and remove mockSearch().
        /*
        const res = await fetch(url.toString());
        if (!res.ok) {
            throw new Error(`Search failed with status ${res.status}`);
        }
        return res.json();
        */

        return mockSearch(params);
    }

    async function apiSuggest(query) {
        if (!query.trim()) return [];
        const url = new URL(API_CONFIG.suggest, API_CONFIG.baseUrl || window.location.origin);
        url.searchParams.set('q', query);

        // Placeholder: mock suggestions
        /*
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`Suggest failed with status ${res.status}`);
        const data = await res.json();
        return data.suggestions || [];
        */

        return mockSuggest(query);
    }

    // ---- Mock data layer (can be deleted when backend is ready) ----

    function mockSearch({ q, page = 1, limit = 10, filter }) {
        const allMockResults = buildMockResults(q);
        const filtered = filterResults(allMockResults, filter);
        const start = (page - 1) * limit;
        const paged = filtered.slice(start, start + limit);

        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    query: q,
                    results: paged,
                    totalResults: filtered.length,
                    page,
                    limit,
                    executionTime: 42, // ms, placeholder
                });
            }, 550);
        });
    }

    function mockSuggest(q) {
        const base = q.trim();
        if (!base) return [];
        const samples = [
            `${base} review`,
            `${base} survey paper`,
            `${base} applications`,
            `${base} datasets`,
            `${base} limitations`,
        ];
        return new Promise((resolve) => {
            setTimeout(() => resolve(samples), 160);
        });
    }

    function buildMockResults(q) {
        const keyword = q || 'sample';
        const now = new Date();
        return [
            {
                id: 'doc-1',
                title: `An empirical study of ${keyword} in modern information retrieval`,
                url: 'https://example.edu/papers/empirical-study',
                snippet: `We investigate how ${keyword} impacts ranking quality across multiple academic domains, with a particular focus on reproducibility and real‑world deployment settings.`,
                type: 'article',
                year: now.getFullYear() - 1,
            },
            {
                id: 'doc-2',
                title: `${keyword} for scientific document understanding`,
                url: 'https://arxiv.org/abs/0000.00000',
                snippet: `This work proposes a unified architecture for handling PDFs, figures, and tables, demonstrating that ${keyword} can reduce annotation effort while preserving accuracy.`,
                type: 'pdf',
                year: now.getFullYear(),
            },
            {
                id: 'doc-3',
                title: `Limitations of ${keyword} in low‑resource settings`,
                url: 'https://journals.example.org/limitations',
                snippet: `Despite strong aggregate metrics, we show that ${keyword} underperforms on long‑tail academic queries and propose evaluation protocols better suited for research workflows.`,
                type: 'article',
                year: now.getFullYear() - 3,
            },
        ];
    }

    function filterResults(results, filter) {
        if (!filter || filter === 'all') return results;
        if (filter === 'recent') {
            const cutoffYear = new Date().getFullYear() - 2;
            return results.filter((r) => r.year >= cutoffYear);
        }
        return results.filter((r) => r.type === filter);
    }

    // ---- Rendering helpers ----

    function setView(isResults) {
        if (isResults) {
            homeView.hidden = true;
            resultsView.hidden = false;
        } else {
            homeView.hidden = false;
            resultsView.hidden = true;
        }
    }

    function setLoading(isLoading) {
        state.loading = isLoading;
        resultsLoading.hidden = !isLoading;
        resultsView.setAttribute('aria-busy', String(isLoading));
        searchButtonHero.disabled = isLoading;
        searchButtonInline.disabled = isLoading;
    }

    function setError(message) {
        state.error = message;
        if (message) {
            resultsError.hidden = false;
            resultsEmpty.hidden = true;
            resultsError.querySelector('p').textContent = message;
        } else {
            resultsError.hidden = true;
        }
    }

    function renderResultsView() {
        const hasResults = state.results && state.results.length > 0;

        if (!hasResults && !state.loading && !state.error) {
            resultsEmpty.hidden = false;
        } else {
            resultsEmpty.hidden = true;
        }

        // Meta
        if (state.query) {
            const timeLabel = state.executionTime != null ? `${state.executionTime} ms` : '–';
            const total = state.totalResults ?? 0;
            const page = state.page ?? 1;

            resultsMeta.innerHTML = `
                Showing results for <span class="query">"${escapeHtml(state.query)}"</span> ·
                <span>${total} results</span> ·
                <span>Page ${page}</span> ·
                <span>~${timeLabel}</span>
            `;
        } else {
            resultsMeta.textContent = '';
        }

        // Results list
        resultsList.innerHTML = '';
        if (hasResults) {
            state.results.forEach((item) => {
                const card = document.createElement('article');
                card.className = 'result-card';
                const highlightedSnippet = highlightTerms(item.snippet || '', state.query);
                card.innerHTML = `
                    <h2 class="result-title">
                        <a href="${escapeAttribute(item.url || '#')}" target="_blank" rel="noopener noreferrer">
                            ${escapeHtml(item.title || 'Untitled document')}
                        </a>
                    </h2>
                    <div class="result-url">${escapeHtml(item.url || '')}</div>
                    <p class="result-snippet">${highlightedSnippet}</p>
                    <div class="result-meta-row">
                        ${item.type ? `<span class="chip chip-variant-soft">${escapeHtml(item.type)}</span>` : ''}
                        ${item.year ? `<span class="chip">${escapeHtml(String(item.year))}</span>` : ''}
                    </div>
                `;
                resultsList.appendChild(card);
            });
        }

        // Pagination
        const totalPages = state.totalResults && state.limit ? Math.ceil(state.totalResults / state.limit) : 1;
        if (totalPages > 1) {
            pagination.hidden = false;
            paginationLabel.textContent = `Page ${state.page} of ${totalPages}`;
            paginationButtons.forEach((btn) => {
                const dir = btn.dataset.page;
                if (dir === 'prev') {
                    btn.disabled = state.page <= 1;
                } else if (dir === 'next') {
                    btn.disabled = state.page >= totalPages;
                }
            });
        } else {
            pagination.hidden = true;
        }
    }

    function highlightTerms(text, query) {
        if (!query || !text) return escapeHtml(text);
        const terms = query.split(/\s+/).filter((term) => term.length > 1);
        if (!terms.length) return escapeHtml(text);

        let highlighted = escapeHtml(text);
        terms.forEach((term) => {
            const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
            highlighted = highlighted.replace(regex, '<strong>$1</strong>');
        });
        return highlighted;
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function escapeAttribute(str) {
        return escapeHtml(str).replace(/"/g, '&quot;');
    }

    function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // ---- Search flow ----

    async function runSearch(newQuery, options = {}) {
        const trimmed = (newQuery ?? '').trim();
        if (!trimmed) {
            // Keep user on home if empty
            return;
        }

        state.query = trimmed;
        if (!options.keepPage) {
            state.page = 1;
        }

        setView(true);
        syncInputs(trimmed);
        setError(null);
        setLoading(true);

        const requestSnapshot = {
            query: state.query,
            filter: state.filter,
            page: state.page,
            limit: state.limit,
        };
        state.lastRequest = requestSnapshot;

        try {
            const data = await apiSearch({
                q: requestSnapshot.query,
                filter: requestSnapshot.filter,
                page: requestSnapshot.page,
                limit: requestSnapshot.limit,
            });

            // Ignore stale responses
            if (state.lastRequest !== requestSnapshot) return;

            state.results = data.results || [];
            state.totalResults = data.totalResults ?? state.results.length;
            state.executionTime = data.executionTime ?? null;
            state.page = data.page ?? requestSnapshot.page;
            state.limit = data.limit ?? requestSnapshot.limit;

            renderResultsView();
        } catch (error) {
            console.error('Search error:', error);
            setError('Backend service is not available yet. Once the research API is deployed, this screen will show a more detailed error and retry guidance.');
            renderResultsView();
        } finally {
            setLoading(false);
        }
    }

    function syncInputs(value) {
        searchInputHero.value = value;
        searchInputInline.value = value;
    }

    // ---- Autocomplete behaviour ----

    let autocompleteActiveIndex = -1;

    async function handleAutocomplete(inputEl, listEl) {
        const query = inputEl.value;
        if (!query.trim()) {
            renderSuggestions(listEl, []);
            return;
        }
        try {
            const suggestions = await apiSuggest(query);
            renderSuggestions(listEl, suggestions);
        } catch (e) {
            // Autocomplete failures are silent in UI
            renderSuggestions(listEl, []);
        }
    }

    function renderSuggestions(listEl, suggestions) {
        listEl.innerHTML = '';
        autocompleteActiveIndex = -1;

        if (!suggestions || suggestions.length === 0) {
            listEl.classList.remove('is-visible');
            return;
        }

        suggestions.forEach((s, index) => {
            const li = document.createElement('li');
            li.className = 'autocomplete-item';
            li.innerHTML = `<span class="query">${escapeHtml(s)}</span>`;
            li.addEventListener('mousedown', (e) => {
                e.preventDefault();
                applySuggestion(listEl, index);
            });
            listEl.appendChild(li);
        });

        listEl.classList.add('is-visible');
    }

    function moveAutocomplete(listEl, direction) {
        const items = Array.from(listEl.querySelectorAll('.autocomplete-item'));
        if (!items.length) return;

        autocompleteActiveIndex += direction;
        if (autocompleteActiveIndex < 0) autocompleteActiveIndex = items.length - 1;
        if (autocompleteActiveIndex >= items.length) autocompleteActiveIndex = 0;

        items.forEach((item, index) => {
            item.classList.toggle('is-active', index === autocompleteActiveIndex);
        });
    }

    function applySuggestion(listEl, index) {
        const items = Array.from(listEl.querySelectorAll('.autocomplete-item'));
        if (!items.length) return;
        const targetIndex = index != null ? index : autocompleteActiveIndex;
        if (targetIndex < 0 || targetIndex >= items.length) return;

        const value = items[targetIndex].textContent || '';
        syncInputs(value);
        listEl.classList.remove('is-visible');
        runSearch(value);
    }

    function closeSuggestions(listEl) {
        listEl.classList.remove('is-visible');
        listEl.innerHTML = '';
        autocompleteActiveIndex = -1;
    }

    // ---- Event listeners ----

    searchButtonHero.addEventListener('click', () => runSearch(searchInputHero.value));
    searchButtonInline.addEventListener('click', () => runSearch(searchInputInline.value));

    searchInputHero.addEventListener('input', () => handleAutocomplete(searchInputHero, autocompleteHero));
    searchInputInline.addEventListener('input', () => handleAutocomplete(searchInputInline, autocompleteInline));

    searchInputHero.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            runSearch(searchInputHero.value);
        } else if (e.key === 'ArrowDown') {
            moveAutocomplete(autocompleteHero, 1);
        } else if (e.key === 'ArrowUp') {
            moveAutocomplete(autocompleteHero, -1);
        } else if (e.key === 'Escape') {
            closeSuggestions(autocompleteHero);
        }
    });

    searchInputInline.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            runSearch(searchInputInline.value);
        } else if (e.key === 'ArrowDown') {
            moveAutocomplete(autocompleteInline, 1);
        } else if (e.key === 'ArrowUp') {
            moveAutocomplete(autocompleteInline, -1);
        } else if (e.key === 'Escape') {
            closeSuggestions(autocompleteInline);
        }
    });

    sampleChips.forEach((chip) => {
        chip.addEventListener('click', () => {
            const q = chip.dataset.query || chip.textContent;
            syncInputs(q);
            runSearch(q);
        });
    });

    brandHome.addEventListener('click', () => {
        setView(false);
        state.results = [];
        state.totalResults = 0;
        state.page = 1;
        state.error = null;
        resultsMeta.textContent = '';
        resultsList.innerHTML = '';
        resultsEmpty.hidden = true;
        resultsError.hidden = true;
        pagination.hidden = true;
    });

    filterTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const value = tab.dataset.filter || 'all';
            if (state.filter === value) return;

            state.filter = value;
            filterTabs.forEach((t) => t.classList.toggle('is-active', t === tab));

            // Re-run search with same query, reset to first page.
            if (state.query) {
                state.page = 1;
                runSearch(state.query, { keepPage: false });
            }
        });
    });

    paginationButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const dir = btn.dataset.page;
            const totalPages = state.totalResults && state.limit ? Math.ceil(state.totalResults / state.limit) : 1;

            if (dir === 'prev' && state.page > 1) {
                state.page -= 1;
            } else if (dir === 'next' && state.page < totalPages) {
                state.page += 1;
            }

            runSearch(state.query, { keepPage: true });
        });
    });

    retryButton.addEventListener('click', () => {
        if (state.query) {
            runSearch(state.query, { keepPage: true });
        }
    });

    document.addEventListener('click', (e) => {
        if (!autocompleteHero.contains(e.target) && e.target !== searchInputHero) {
            closeSuggestions(autocompleteHero);
        }
        if (!autocompleteInline.contains(e.target) && e.target !== searchInputInline) {
            closeSuggestions(autocompleteInline);
        }
    });

    // Initial view
    setView(false);
});
