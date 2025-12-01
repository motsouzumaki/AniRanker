document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const searchResults = document.getElementById('searchResults');
    const searchType = document.getElementById('searchType');
    const rankedList = document.getElementById('rankedList');

    const usernameInput = document.getElementById('usernameInput');
    const statusFilter = document.getElementById('statusFilter');
    const importType = document.getElementById('importType');
    const fetchUserListButton = document.getElementById('fetchUserListButton');
    const userListResults = document.getElementById('userListResults');

    // --- New UI Elements ---
    const darkModeToggle = document.getElementById('darkModeToggle');
    const filterControls = document.getElementById('filterControls');
    const sortFilter = document.getElementById('sortFilter');
    const orderFilter = document.getElementById('orderFilter');
    const formatFilter = document.getElementById('formatFilter');
    const scoreFilter = document.getElementById('scoreFilter');
    const saveListButton = document.getElementById('saveListButton');
    const exportListButton = document.getElementById('exportListButton');
    const clearListButton = document.getElementById('clearListButton');
    const rankingGrid = document.getElementById('rankingGrid');
    const downloadGridButton = document.getElementById('downloadGridButton');

    // --- State & Constants ---
    const ANILIST_API_URL = 'https://graphql.anilist.co';
    const API_HEADERS = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };
    const FALLBACK_SQUARE = 'https://placehold.co/600x600/00d1ff/ffffff?text=Ani';

    let rankedAnime = [];
    let draggedItem = null;
    let pointerDraggedItem = null;
    let pointerDragging = false;
    let currentUserEntries = []; // Stores the raw fetched entries for local filtering

    // ----------------------------------------------------------------------
    // ## Dark Mode Implementation
    // ----------------------------------------------------------------------

    function applyDarkMode(isDark) {
        document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
        darkModeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i> Light Mode' : '<i class="fas fa-moon"></i> Dark Mode';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    function initDarkMode() {
        const savedMode = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        // Default to system preference if no saved setting
        const initialMode = savedMode ? savedMode === 'dark' : prefersDark;
        applyDarkMode(initialMode);
    }

    darkModeToggle.addEventListener('click', () => {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        applyDarkMode(!isDark);
    });

    // ----------------------------------------------------------------------
    // ## AniList API Functions
    // ----------------------------------------------------------------------

    /**
     * Searches for anime on AniList
     */
    async function searchAniList(query, type = 'ANIME') {
        if (!query) return;

        searchResults.innerHTML = '<p class="loading-message">Searching...</p>';

        const graphqlQuery = `
            query ($search: String, $perPage: Int, $type: MediaType) {
                Page (perPage: $perPage) {
                    media (search: $search, type: $type, isAdult: false) {
                        id
                        title {
                            romaji
                            english
                        }
                        coverImage {
                            large
                        }
                        startDate {
                            year
                        }
                        format
                    }
                }
            }
        `;

        const variables = {
            search: query,
            perPage: 20,
            type: type
        };

        try {
            const response = await fetch(ANILIST_API_URL, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-store',
                headers: API_HEADERS,
                body: JSON.stringify({ query: graphqlQuery, variables: variables })
            });

            if (!response.ok) {
                let detail = '';
                try {
                    const ct = response.headers.get('content-type') || '';
                    detail = ct.includes('application/json') ? JSON.stringify(await response.json()) : await response.text();
                } catch { }
                throw new Error(`Network error: ${response.status} ${response.statusText}${detail ? ' - ' + detail.slice(0, 200) : ''}`);
            }
            const data = await response.json();

            if (data.errors) {
                throw new Error(data.errors[0].message);
            }

            const media = data.data.Page.media;
            displaySearchResults(media);
        } catch (error) {
            console.error("Error searching AniList:", error);
            searchResults.innerHTML = `<p class="error-message">Error: ${error.message}</p>`;
        }
    }

    /**
     * Displays search results
     */
    function displaySearchResults(media) {
        searchResults.innerHTML = '';

        if (media.length === 0) {
            searchResults.innerHTML = '<p class="info-message">No results found.</p>';
            return;
        }

        media.forEach(anime => {
            const itemEl = createResultItem(anime, null, anime.startDate?.year, anime.format);
            itemEl.addEventListener('click', () => addAnimeToList(anime));
            searchResults.appendChild(itemEl);
        });
    }

    /**
     * Fetches a specific user's anime list using MediaListCollection query.
     */
    async function fetchUserList(username, status, type = 'ANIME') {
        if (!username) {
            userListResults.innerHTML = '<p class="error-message">Please enter a username.</p>';
            return;
        }

        userListResults.innerHTML = `<p class="loading-message">Fetching ${username}'s ${type.toLowerCase()} list...</p>`;
        searchResults.innerHTML = '';
        filterControls.style.display = 'none';

        const userQuery = `
            query ($name: String) {
              User(name: $name) { id name }
            }
        `;
        const listQuery = `
            query ($userId: Int, $type: MediaType) {
              MediaListCollection(userId: $userId, type: $type) {
                lists {
                  entries {
                    media { id title { romaji english } coverImage { large } startDate { year } format }
                    status
                    score
                  }
                }
              }
            }
        `;

        try {
            const userRes = await fetch(ANILIST_API_URL, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-store',
                headers: API_HEADERS,
                body: JSON.stringify({ query: userQuery, variables: { name: username } })
            });
            if (!userRes.ok) {
                let detail = '';
                try {
                    const ct = userRes.headers.get('content-type') || '';
                    detail = ct.includes('application/json') ? JSON.stringify(await userRes.json()) : await userRes.text();
                } catch { }
                throw new Error(`Network error: ${userRes.status} ${userRes.statusText}${detail ? ' - ' + detail.slice(0, 200) : ''}`);
            }
            const userData = await userRes.json();
            const user = userData.data?.User;
            if (!user) {
                userListResults.innerHTML = `<p class="error-message">User not found. Check the username or try exact casing.</p>`;
                return;
            }

            const listRes = await fetch(ANILIST_API_URL, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-store',
                headers: API_HEADERS,
                body: JSON.stringify({ query: listQuery, variables: { userId: user.id, type: type } })
            });
            if (!listRes.ok) {
                let detail = '';
                try {
                    const ct = listRes.headers.get('content-type') || '';
                    detail = ct.includes('application/json') ? JSON.stringify(await listRes.json()) : await listRes.text();
                } catch { }
                throw new Error(`Network error: ${listRes.status} ${listRes.statusText}${detail ? ' - ' + detail.slice(0, 200) : ''}`);
            }
            const listData = await listRes.json();

            if (listData.errors) {
                throw new Error(listData.errors[0].message);
            }
            if (!listData.data?.MediaListCollection) {
                userListResults.innerHTML = `<p class="error-message">No public ${type.toLowerCase()} list found for this user.</p>`;
                return;
            }

            const allLists = listData.data.MediaListCollection.lists;
            const allEntries = allLists.flatMap(list => list.entries);
            const initialFilteredEntries = allEntries.filter(entry => entry.status === status);

            currentUserEntries = initialFilteredEntries;
            renderUserListResults();

        } catch (error) {
            console.error('Error fetching user list:', error);
            userListResults.innerHTML = `<p class="error-message">Error: ${error.message}</p>`;
            filterControls.style.display = 'none';
        }
    }

    // ----------------------------------------------------------------------
    // ## Filtering and Display Logic (User List)
    // ----------------------------------------------------------------------

    /**
     * Applies current sort/order settings to currentUserEntries and displays them.
     */
    function renderUserListResults() {
        userListResults.innerHTML = ''; // Clear results

        if (currentUserEntries.length === 0) {
            const currentStatus = statusFilter.value;
            userListResults.innerHTML = `<p class="info-message">No anime found for status "${currentStatus}".</p>`;
            filterControls.style.display = 'none';
            return;
        }

        // 1. Get current filter/sort settings
        const sortBy = sortFilter.value;
        const sortOrder = orderFilter.value;
        const formatFilterValue = formatFilter.value;
        const minScore = parseInt(scoreFilter.value);

        // 2. Filter the entries
        let filteredEntries = [...currentUserEntries];

        // Filter by format
        if (formatFilterValue !== 'ALL') {
            filteredEntries = filteredEntries.filter(entry =>
                entry.media.format === formatFilterValue
            );
        }

        // Filter by minimum score
        if (minScore > 0) {
            filteredEntries = filteredEntries.filter(entry =>
                entry.score >= minScore
            );
        }

        if (filteredEntries.length === 0) {
            userListResults.innerHTML = '<p class="info-message">No anime match your filters.</p>';
            filterControls.style.display = 'grid';
            return;
        }

        // 3. Sort the filtered entries
        const sortedEntries = filteredEntries.sort((a, b) => {
            let valA, valB;

            switch (sortBy) {
                case 'SCORE':
                    valA = a.score || 0;
                    valB = b.score || 0;
                    break;
                case 'START_DATE':
                    valA = a.media.startDate.year || 0;
                    valB = b.media.startDate.year || 0;
                    break;
                case 'FORMAT':
                    valA = a.media.format || '';
                    valB = b.media.format || '';
                    break;
                case 'TITLE_ROMAJI':
                default:
                    valA = a.media.title.romaji || a.media.title.english || '';
                    valB = b.media.title.romaji || b.media.title.english || '';
                    if (valA === valB) return 0;
                    if (sortOrder === 'ASC') return valA.localeCompare(valB);
                    return valB.localeCompare(valA);
            }

            // For numeric sorts (score, year)
            if (sortBy === 'TITLE_ROMAJI' || sortBy === 'FORMAT') {
                if (sortOrder === 'ASC') return valA.localeCompare(valB);
                return valB.localeCompare(valA);
            } else {
                if (sortOrder === 'ASC') return valA - valB;
                return valB - valA;
            }
        });

        // 4. Display the sorted and filtered results
        sortedEntries.forEach(entry => {
            const anime = entry.media;
            const itemEl = createResultItem(
                anime,
                entry.score,
                entry.media.startDate.year,
                entry.media.format
            );
            itemEl.addEventListener('click', () => addAnimeToList(anime));
            userListResults.appendChild(itemEl);
        });

        filterControls.style.display = 'grid'; // Show filters after successful fetch
    }

    /**
     * Helper function to create a result item DOM element, now including metadata.
     */
    function createResultItem(anime, score, year, format) {
        const item = document.createElement('div');
        item.classList.add('result-item');

        const title = anime.title.romaji || anime.title.english || 'Untitled';
        const cover = anime.coverImage.large || 'https://placehold.co/50x70/00d1ff/ffffff?text=N/A';
        const scoreDisplay = score ? `<span class="meta-pill score-pill">${score}/10</span>` : '';
        const yearDisplay = year ? `<span class="meta-pill year-pill">${year}</span>` : '';
        const formatDisplay = format ? `<span class="chip chip-format">${format}</span>` : '';

        item.innerHTML = `
            <img src="${cover}" alt="${title}">
            <div class="result-info">
                <div class="result-title">${title}</div>
                <div class="result-meta">${scoreDisplay}${yearDisplay}${formatDisplay}</div>
            </div>
            <button class="btn-primary add-btn"><i class="fas fa-plus"></i> Add</button>
        `;

        // Replace the click listener logic
        item.querySelector('.add-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            addAnimeToList(anime);
        });
        return item;
    }

    // ----------------------------------------------------------------------
    // ## Ranked List Management
    // ----------------------------------------------------------------------

    /**
     * Adds an anime to the ranked list
     */
    function addAnimeToList(anime) {
        // Check if anime is already in the list
        if (rankedAnime.some(item => item.id === anime.id)) {
            alert('This anime is already in your list!');
            return;
        }

        rankedAnime.push(anime);
        renderRankedList();
        saveList();
    }

    /**
     * Renders the ranked list
     */
    function renderRankedList() {
        rankedList.innerHTML = '';

        if (rankedAnime.length === 0) {
            const dragHint = document.querySelector('.drag-hint');
            if (!dragHint) {
                rankedList.innerHTML = '<p class="info-message">Your list is empty. Add some anime to get started!</p>';
            } else {
                dragHint.style.display = 'block';
            }
            renderRankingGrid();
            return;
        }

        const dragHint = document.querySelector('.drag-hint');
        if (dragHint) dragHint.style.display = 'none';

        rankedAnime.forEach((anime, index) => {
            const listItem = document.createElement('li');
            listItem.classList.add('ranked-item');
            listItem.draggable = true;
            listItem.dataset.id = anime.id;

            const title = anime.title.romaji || anime.title.english || 'Untitled';
            const cover = anime.coverImage.large || 'https://placehold.co/40x60/00d1ff/ffffff?text=N/A';

            listItem.innerHTML = `
                <div class="rank-number">${index + 1}</div>
                <img src="${cover}" alt="${title}">
                <div class="ranked-info">
                    <div class="ranked-title">${title}</div>
                    <div class="ranked-meta">${anime.format || 'N/A'} • ${anime.startDate?.year || 'N/A'}</div>
                </div>
                <div class="rank-controls">
                    <button class="rank-btn rank-up" aria-label="Move Up"><i class="fas fa-chevron-up"></i></button>
                    <button class="rank-btn rank-down" aria-label="Move Down"><i class="fas fa-chevron-down"></i></button>
                    <button class="remove-btn" aria-label="Remove"><i class="fas fa-times"></i></button>
                </div>
            `;

            listItem.addEventListener('dragstart', handleDragStart);
            listItem.addEventListener('dragend', handleDragEnd);
            listItem.addEventListener('dragover', handleDragOver);
            listItem.addEventListener('drop', handleDrop);
            listItem.addEventListener('pointerdown', handlePointerDown);

            const upBtn = listItem.querySelector('.rank-up');
            const downBtn = listItem.querySelector('.rank-down');
            upBtn.disabled = index === 0;
            downBtn.disabled = index === rankedAnime.length - 1;
            upBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                moveAnime(anime.id, -1);
            });
            downBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                moveAnime(anime.id, 1);
            });

            listItem.querySelector('.remove-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                removeAnimeFromList(anime.id);
            });

            rankedList.appendChild(listItem);
        });

        renderRankingGrid();
    }

    function renderRankingGrid() {
        if (!rankingGrid) return;

        const total = rankedAnime.length;

        if (total === 0) {
            rankingGrid.style.gridTemplateColumns = '';
            rankingGrid.innerHTML = `
                <div class="grid-empty-state">
                    <i class="fas fa-image"></i>
                    <p>Add anime to your ranked list to generate a grid preview.</p>
                </div>
            `;
            if (downloadGridButton) {
                downloadGridButton.disabled = true;
            }
            return;
        }

        const gridSize = 5;
        const rows = Math.ceil(total / gridSize);
        const slots = rows * gridSize;

        rankingGrid.innerHTML = '';
        rankingGrid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;

        rankedAnime.forEach((anime, index) => {
            const title = anime.title.romaji || anime.title.english || 'Untitled';
            const cover = anime.coverImage?.extraLarge || anime.coverImage?.large || FALLBACK_SQUARE;
            const safeCover = cover.replace(/"/g, '\\"');

            const tile = document.createElement('div');
            tile.className = 'grid-tile';

            const coverEl = document.createElement('div');
            coverEl.className = 'grid-cover';
            coverEl.style.backgroundImage = `url("${safeCover}")`;
            coverEl.setAttribute('role', 'img');
            coverEl.setAttribute('aria-label', title);

            const rankLabel = document.createElement('div');
            rankLabel.className = 'grid-rank';
            rankLabel.textContent = `#${index + 1}`;

            tile.appendChild(coverEl);
            tile.appendChild(rankLabel);
            rankingGrid.appendChild(tile);
        });

        for (let i = total; i < slots; i++) {
            const emptyTile = document.createElement('div');
            emptyTile.className = 'grid-tile grid-tile--empty';
            rankingGrid.appendChild(emptyTile);
        }

        if (downloadGridButton) {
            downloadGridButton.disabled = false;
        }
    }

    async function ensureGridImagesLoaded() {
        if (!rankingGrid) return;
        const covers = rankingGrid.querySelectorAll('.grid-cover');
        const tasks = Array.from(covers).map(el => {
            const bg = getComputedStyle(el).backgroundImage || '';
            const m = bg.match(/url\(["']?(.*?)["']?\)/);
            const src = m && m[1] ? m[1] : null;
            if (!src) return Promise.resolve();
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve();
                img.onerror = () => resolve();
                img.src = src;
            });
        });
        await Promise.all(tasks);
    }

    async function downloadRankingGrid() {
        if (!rankingGrid || rankedAnime.length === 0) return;
        if (typeof html2canvas !== 'function') {
            alert('Grid export requires html2canvas. Please check your connection and try again.');
            return;
        }

        const originalLabel = downloadGridButton.innerHTML;
        downloadGridButton.disabled = true;
        downloadGridButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing...';

        try {
            await ensureGridImagesLoaded();
            const canvas = await html2canvas(rankingGrid, {
                backgroundColor: getComputedStyle(document.body).getPropertyValue('--dark-bg').trim() || '#111',
                scale: Math.max(2, window.devicePixelRatio || 1),
                useCORS: true,
                allowTaint: false,
                imageTimeout: 15000
            });

            const link = document.createElement('a');
            link.download = `ani-ranker-grid-${rankedAnime.length}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('Error exporting grid:', error);
            alert('Something went wrong while exporting the grid. Please try again.');
        } finally {
            downloadGridButton.innerHTML = originalLabel;
            downloadGridButton.disabled = rankedAnime.length === 0;
        }
    }

    function moveAnime(animeId, delta) {
        const i = rankedAnime.findIndex(a => a.id === animeId);
        if (i === -1) return;
        const j = i + delta;
        if (j < 0 || j >= rankedAnime.length) return;
        const tmp = rankedAnime[i];
        rankedAnime[i] = rankedAnime[j];
        rankedAnime[j] = tmp;
        renderRankedList();
        saveList();
    }

    /**
     * Removes an anime from the ranked list
     */
    function removeAnimeFromList(animeId) {
        rankedAnime = rankedAnime.filter(anime => anime.id !== animeId);
        renderRankedList();
        saveList();
    }

    /**
     * Saves the current list to localStorage
     */
    function saveList() {
        localStorage.setItem('rankedAnime', JSON.stringify(rankedAnime));
        // Show a temporary success message
        const originalText = saveListButton.innerHTML;
        saveListButton.innerHTML = '<i class="fas fa-check"></i> Saved!';
        saveListButton.style.background = '#51cf66';

        setTimeout(() => {
            saveListButton.innerHTML = originalText;
            saveListButton.style.background = '';
        }, 2000);
    }

    /**
     * Exports the current list to a text file
     */
    function exportList() {
        if (rankedAnime.length === 0) {
            alert('Your list is empty! Add some anime before exporting.');
            return;
        }

        let content = '';
        rankedAnime.forEach((anime, index) => {
            const title = anime.title.romaji || anime.title.english || 'Untitled';
            content += `${index + 1}. ${title}\n`;
        });

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my-anime-list.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Show a temporary success message
        const originalText = exportListButton.innerHTML;
        exportListButton.innerHTML = '<i class="fas fa-file-export"></i> Exported!';
        exportListButton.style.background = '#51cf66';

        setTimeout(() => {
            exportListButton.innerHTML = originalText;
            exportListButton.style.background = '';
        }, 2000);
    }

    /**
     * Loads the list from localStorage
     */
    function loadList() {
        const savedList = localStorage.getItem('rankedAnime');
        if (savedList) {
            rankedAnime = JSON.parse(savedList);
            renderRankedList();
        }
    }

    /**
     * Clears the entire ranked list
     */
    function clearList() {
        if (rankedAnime.length === 0) return;

        if (confirm('Are you sure you want to clear your entire list?')) {
            rankedAnime = [];
            renderRankedList();
            saveList();
        }
    }

    // ----------------------------------------------------------------------
    // ## Drag and Drop Functionality
    // ----------------------------------------------------------------------

    function handleDragStart(e) {
        draggedItem = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
    }

    function handleDragEnd(e) {
        this.classList.remove('dragging');
        rankedList.classList.remove('drag-over');
    }

    function handleDragOver(e) {
        e.preventDefault();
        rankedList.classList.add('drag-over');
        return false;
    }

    function handleDrop(e) {
        e.stopPropagation();
        e.preventDefault();

        if (draggedItem !== this) {
            // Get the IDs of the dragged item and the target item
            const draggedId = parseInt(draggedItem.dataset.id);
            const targetId = parseInt(this.dataset.id);

            // Find indices in the array
            const draggedIndex = rankedAnime.findIndex(anime => anime.id === draggedId);
            const targetIndex = rankedAnime.findIndex(anime => anime.id === targetId);

            // Reorder the array
            if (draggedIndex !== -1 && targetIndex !== -1) {
                const [removed] = rankedAnime.splice(draggedIndex, 1);
                rankedAnime.splice(targetIndex, 0, removed);

                // Re-render the list
                renderRankedList();
                saveList();
            }
        }

        rankedList.classList.remove('drag-over');
        return false;
    }

    function handlePointerDown(e) {
        if (e.pointerType !== 'touch') return;
        pointerDragging = true;
        pointerDraggedItem = e.currentTarget;
        pointerDraggedItem.classList.add('dragging');
    }

    function handlePointerMove(e) {
        if (!pointerDragging) return;
        e.preventDefault();
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const targetItem = el ? el.closest('li.ranked-item') : null;
        if (targetItem && targetItem !== pointerDraggedItem) {
            const draggedId = parseInt(pointerDraggedItem.dataset.id);
            const targetId = parseInt(targetItem.dataset.id);
            const draggedIndex = rankedAnime.findIndex(anime => anime.id === draggedId);
            const targetIndex = rankedAnime.findIndex(anime => anime.id === targetId);
            if (draggedIndex !== -1 && targetIndex !== -1) {
                const [removed] = rankedAnime.splice(draggedIndex, 1);
                rankedAnime.splice(targetIndex, 0, removed);
                renderRankedList();
                saveList();
                const newEl = Array.from(rankedList.querySelectorAll('.ranked-item')).find(li => parseInt(li.dataset.id) === draggedId);
                pointerDraggedItem = newEl || null;
                if (pointerDraggedItem) pointerDraggedItem.classList.add('dragging');
            }
        }
    }

    function handlePointerUp() {
        if (!pointerDragging) return;
        pointerDragging = false;
        if (pointerDraggedItem) {
            pointerDraggedItem.classList.remove('dragging');
            pointerDraggedItem = null;
        }
    }

    // ----------------------------------------------------------------------
    // ## Initializers & Event Listeners
    // ----------------------------------------------------------------------

    // --- Search Listeners ---
    searchButton.addEventListener('click', () => {
        const query = searchInput.value.trim();
        const type = searchType.value;
        if (query) { searchAniList(query, type); }
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            const type = searchType.value;
            if (query) { searchAniList(query, type); }
        }
    });

    // --- User List Listeners ---
    fetchUserListButton.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        const status = statusFilter.value;
        const type = importType.value;
        fetchUserList(username, status, type);
    });

    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const username = usernameInput.value.trim();
            const status = statusFilter.value;
            const type = importType.value;
            fetchUserList(username, status, type);
        }
    });

    // Add listeners for local filtering/sorting changes
    sortFilter.addEventListener('change', renderUserListResults);
    orderFilter.addEventListener('change', renderUserListResults);
    formatFilter.addEventListener('change', renderUserListResults);
    scoreFilter.addEventListener('change', renderUserListResults);

    statusFilter.addEventListener('change', () => {
        // Clear previous list state if status changes without fetching
        currentUserEntries = [];
        userListResults.innerHTML = '';
        filterControls.style.display = 'none';
    });

    // List management listeners
    saveListButton.addEventListener('click', saveList);
    exportListButton.addEventListener('click', exportList);
    clearListButton.addEventListener('click', clearList);
    if (downloadGridButton) {
        downloadGridButton.addEventListener('click', downloadRankingGrid);
    }

    // Initialize Dark Mode and load list
    initDarkMode();
    loadList();
    renderRankingGrid();

    rankedList.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js');
    }
});
