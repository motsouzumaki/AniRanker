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
    // ## Dark Mode Implementation (Simplified for new theme)
    // ----------------------------------------------------------------------

    let visualModeHigh = true;

    function toggleVisualMode() {
        visualModeHigh = !visualModeHigh;
        const scanlines = document.querySelector('.scanlines');
        const grid = document.querySelector('.bg-grid');

        if (visualModeHigh) {
            if (scanlines) scanlines.style.display = 'block';
            if (grid) grid.style.opacity = '0.1';
            darkModeToggle.innerHTML = '<i class="fas fa-eye"></i> <span class="hidden sm:inline">VISUAL_</span>MODE: ON';
            darkModeToggle.classList.add('text-neon-blue', 'border-neon-blue');
            darkModeToggle.classList.remove('text-gray-500', 'border-gray-500');
        } else {
            if (scanlines) scanlines.style.display = 'none';
            if (grid) grid.style.opacity = '0';
            darkModeToggle.innerHTML = '<i class="fas fa-eye-slash"></i> <span class="hidden sm:inline">VISUAL_</span>MODE: OFF';
            darkModeToggle.classList.remove('text-neon-blue', 'border-neon-blue');
            darkModeToggle.classList.add('text-gray-500', 'border-gray-500');
        }
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleVisualMode);
        // Initialize state
        darkModeToggle.innerHTML = '<i class="fas fa-eye"></i> <span class="hidden sm:inline">VISUAL_</span>MODE: ON';
    }

    // ----------------------------------------------------------------------
    // ## AniList API Functions
    // ----------------------------------------------------------------------

    // --- Character Filter Elements ---
    const characterFilters = document.getElementById('characterFilters');
    const filterMale = document.getElementById('filterMale');
    const filterFemale = document.getElementById('filterFemale');

    let currentRawResults = [];
    let currentSearchType = 'ANIME';

    // Toggle Character Filters & Listeners
    if (searchType) {
        searchType.addEventListener('change', () => {
            currentSearchType = searchType.value;
            if (currentSearchType === 'CHARACTER') {
                characterFilters.classList.remove('hidden');
            } else {
                characterFilters.classList.add('hidden');
            }
        });
    }

    if (filterMale) filterMale.addEventListener('change', filterSearchResults);
    if (filterFemale) filterFemale.addEventListener('change', filterSearchResults);

    function filterSearchResults() {
        if (currentSearchType !== 'CHARACTER') return;

        const showMale = filterMale.checked;
        const showFemale = filterFemale.checked;

        const filtered = currentRawResults.filter(char => {
            const g = (char.gender || 'Unknown').toLowerCase();
            if (g === 'male' && !showMale) return false;
            if (g === 'female' && !showFemale) return false;
            return true;
        });

        displaySearchResults(filtered, 'CHARACTER');
    }

    /**
     * Searches for anime/manga/characters on AniList
     */
    async function searchAniList(query, type = 'ANIME') {
        if (!query) return;

        currentSearchType = type;
        searchResults.innerHTML = '<div class="col-span-full text-center py-10 text-neon-blue animate-pulse font-mono"><i class="fas fa-circle-notch fa-spin mr-2"></i>SCANNING_DATABASE...</div>';

        let graphqlQuery;
        let variables = {
            search: query,
            perPage: 50, // Increased for better client-side filtering
        };

        if (type === 'CHARACTER') {
            graphqlQuery = `
                query ($search: String, $perPage: Int) {
                    Page (perPage: $perPage) {
                        characters (search: $search) {
                            id
                            name {
                                full
                                native
                            }
                            image {
                                large
                            }
                            gender
                        }
                    }
                }
            `;
        } else {
            graphqlQuery = `
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
            variables.type = type;
        }

        try {
            const response = await fetch(ANILIST_API_URL, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-store',
                headers: API_HEADERS,
                body: JSON.stringify({ query: graphqlQuery, variables: variables })
            });

            if (!response.ok) {
                throw new Error(`Network error: ${response.status}`);
            }
            const data = await response.json();

            if (data.errors) {
                throw new Error(data.errors[0].message);
            }

            if (type === 'CHARACTER') {
                currentRawResults = data.data.Page.characters;
                filterSearchResults();
            } else {
                currentRawResults = data.data.Page.media;
                displaySearchResults(currentRawResults, type);
            }

        } catch (error) {
            console.error("Error searching AniList:", error);
            searchResults.innerHTML = `<div class="col-span-full text-center py-10 text-red-500 font-mono border border-red-500 bg-red-900/20"><i class="fas fa-exclamation-triangle mr-2"></i>ERROR: ${error.message}</div>`;
        }
    }

    /**
     * Displays search results
     */
    function displaySearchResults(results, type = 'ANIME') {
        searchResults.innerHTML = '';

        if (results.length === 0) {
            searchResults.innerHTML = '<div class="col-span-full text-center py-10 text-gray-500 font-mono"><i class="fas fa-search mr-2"></i>NO_DATA_FOUND</div>';
            return;
        }

        results.forEach(item => {
            const itemEl = createResultItem(item, null, item.startDate?.year, item.format, type);
            searchResults.appendChild(itemEl);
        });
    }

    /**
     * Helper function to create a result item DOM element, now including metadata.
     */
    function createResultItem(data, score, year, format, type = 'ANIME') {
        const item = document.createElement('div');
        item.className = 'bg-dark-panel border border-gray-700 hover:border-neon-blue hover:shadow-neon transition-all duration-300 p-2 sm:p-3 flex flex-col gap-2 group cursor-pointer relative overflow-hidden';

        let title, cover, metaHtml = '';

        if (type === 'CHARACTER') {
            title = data.name.full || data.name.native || 'Unknown';
            cover = data.image?.large || 'https://placehold.co/600x600/00d1ff/ffffff?text=Char';
            const gender = data.gender || 'Unknown';
            metaHtml += `<span class="text-[9px] sm:text-[10px] bg-purple-900/50 text-purple-400 border border-purple-500 px-1 sm:px-1.5 py-0.5 rounded-sm">${gender}</span>`;
        } else {
            title = data.title.romaji || data.title.english || 'Untitled';
            cover = data.coverImage?.large || 'https://placehold.co/50x70/00d1ff/ffffff?text=N/A';
            if (score) metaHtml += `<span class="text-[9px] sm:text-[10px] bg-green-900/50 text-green-400 border border-green-500 px-1 sm:px-1.5 py-0.5 rounded-sm mr-1">${score}/10</span>`;
            if (year) metaHtml += `<span class="text-[9px] sm:text-[10px] bg-blue-900/50 text-blue-400 border border-blue-500 px-1 sm:px-1.5 py-0.5 rounded-sm mr-1">${year}</span>`;
            if (format) metaHtml += `<span class="text-[9px] sm:text-[10px] bg-purple-900/50 text-purple-400 border border-purple-500 px-1 sm:px-1.5 py-0.5 rounded-sm">${format}</span>`;
        }

        const imgClass = type === 'CHARACTER' ? 'rounded-full border-2 border-neon-blue/50' : 'border border-gray-800';
        const imgContainerClass = type === 'CHARACTER' ? 'rounded-full' : '';

        item.innerHTML = `
            <div class="relative w-full h-32 sm:h-40 overflow-hidden ${imgContainerClass} ${imgClass} group-hover:border-neon-blue/50 transition-colors flex justify-center items-center bg-black/20">
                <img src="${cover}" alt="${title}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-1 sm:pb-2">
                    <button class="add-btn bg-neon-blue text-base-bg font-bold px-2 sm:px-4 py-1 text-[10px] sm:text-xs uppercase hover:bg-white transition-colors shadow-neon">
                        <i class="fas fa-plus mr-1"></i> Add
                    </button>
                </div>
            </div>
            <div class="flex-1 min-w-0 text-center">
                <h4 class="text-neon-blue font-bold text-xs sm:text-sm truncate font-orbitron" title="${title}">${title}</h4>
                <div class="mt-1 flex flex-wrap gap-1 justify-center">
                    ${metaHtml}
                </div>
            </div>
        `;

        // Normalize data for ranking
        const rankData = {
            id: data.id,
            title: { romaji: title }, // Normalize title structure
            coverImage: { large: cover }, // Normalize image structure
            format: type === 'CHARACTER' ? 'CHARACTER' : (format || 'ANIME'),
            startDate: { year: type === 'CHARACTER' ? '' : year }
        };

        const addBtn = item.querySelector('.add-btn');
        if (addBtn) {
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                addAnimeToList(rankData);
            });
        }

        item.addEventListener('click', () => addAnimeToList(rankData));

        return item;
    }

    /**
     * Fetches a specific user's anime list using MediaListCollection query.
     */
    async function fetchUserList(username, status, type = 'ANIME') {
        if (!username) {
            userListResults.innerHTML = '<div class="col-span-full text-center text-red-400 font-mono">INPUT_USER_ID_REQUIRED</div>';
            return;
        }

        userListResults.innerHTML = `<div class="col-span-full text-center py-10 text-neon-pink animate-pulse font-mono"><i class="fas fa-satellite-dish fa-spin mr-2"></i>SYNCING_WITH_USER_DB...</div>`;
        searchResults.innerHTML = ''; // Clear search results to reduce clutter
        filterControls.classList.add('hidden');

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
            if (!userRes.ok) throw new Error(`Network error: ${userRes.status}`);

            const userData = await userRes.json();
            const user = userData.data?.User;
            if (!user) {
                userListResults.innerHTML = `<div class="col-span-full text-center py-10 text-red-500 font-mono border border-red-500 bg-red-900/20">USER_NOT_FOUND</div>`;
                return;
            }

            const listRes = await fetch(ANILIST_API_URL, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-store',
                headers: API_HEADERS,
                body: JSON.stringify({ query: listQuery, variables: { userId: user.id, type: type } })
            });
            if (!listRes.ok) throw new Error(`Network error: ${listRes.status}`);

            const listData = await listRes.json();

            if (listData.errors) {
                throw new Error(listData.errors[0].message);
            }
            if (!listData.data?.MediaListCollection) {
                userListResults.innerHTML = `<div class="col-span-full text-center py-10 text-yellow-500 font-mono">NO_PUBLIC_LIST_FOUND</div>`;
                return;
            }

            const allLists = listData.data.MediaListCollection.lists;
            const allEntries = allLists.flatMap(list => list.entries);
            const initialFilteredEntries = allEntries.filter(entry => entry.status === status);

            currentUserEntries = initialFilteredEntries;
            renderUserListResults();

        } catch (error) {
            console.error('Error fetching user list:', error);
            userListResults.innerHTML = `<div class="col-span-full text-center py-10 text-red-500 font-mono border border-red-500 bg-red-900/20">SYSTEM_ERROR: ${error.message}</div>`;
            filterControls.classList.add('hidden');
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
            userListResults.innerHTML = `<div class="col-span-full text-center py-10 text-gray-500 font-mono">NO_ENTRIES_FOUND_FOR_STATUS: ${currentStatus}</div>`;
            filterControls.classList.add('hidden');
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
            userListResults.innerHTML = '<div class="col-span-full text-center py-10 text-gray-500 font-mono">NO_MATCHES_FOR_FILTER_CRITERIA</div>';
            filterControls.classList.remove('hidden');
            filterControls.style.display = 'block'; // Ensure it's visible
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
            userListResults.appendChild(itemEl);
        });

        filterControls.classList.remove('hidden');
        filterControls.style.display = 'block';
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
            // Shake animation or toast could go here
            alert('ALREADY_IN_DATABASE');
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
            rankedList.innerHTML = `
                <div class="text-center py-8 text-gray-500 font-mono border border-dashed border-gray-700 bg-black/20">
                    <i class="fas fa-inbox text-2xl mb-2 opacity-50"></i>
                    <p>RANKING_MATRIX_EMPTY</p>
                </div>
            `;
            renderRankingGrid();
            return;
        }

        rankedAnime.forEach((anime, index) => {
            const listItem = document.createElement('li');
            // Tailwind classes for ranked item
            listItem.className = 'ranked-item bg-dark-panel border border-gray-700 p-2 sm:p-3 flex items-center gap-2 sm:gap-4 hover:border-neon-blue transition-colors group relative text-xs sm:text-base';
            listItem.draggable = true;
            listItem.dataset.id = anime.id;

            const title = anime.title.romaji || anime.title.english || 'Untitled';
            const cover = anime.coverImage.large || 'https://placehold.co/40x60/00d1ff/ffffff?text=N/A';

            listItem.innerHTML = `
                <div class="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-neon-blue text-base-bg font-bold font-orbitron rounded-sm shadow-neon shrink-0 text-xs sm:text-base">
                    ${index + 1}
                </div>
                <img src="${cover}" alt="${title}" class="w-8 h-10 sm:w-10 sm:h-14 object-cover border border-gray-600 shrink-0">
                <div class="flex-1 min-w-0">
                    <div class="text-white font-bold text-xs sm:text-sm truncate font-orbitron group-hover:text-neon-blue transition-colors">${title}</div>
                    <div class="text-[10px] sm:text-xs text-gray-400 font-mono">${anime.format || 'N/A'} // ${anime.startDate?.year || '????'}</div>
                </div>
                <div class="flex items-center gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="rank-btn rank-up w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center border border-gray-600 text-gray-400 hover:border-neon-blue hover:text-neon-blue hover:bg-neon-blue/10 transition-colors" aria-label="Move Up">
                        <i class="fas fa-chevron-up text-xs sm:text-base"></i>
                    </button>
                    <button class="rank-btn rank-down w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center border border-gray-600 text-gray-400 hover:border-neon-blue hover:text-neon-blue hover:bg-neon-blue/10 transition-colors" aria-label="Move Down">
                        <i class="fas fa-chevron-down text-xs sm:text-base"></i>
                    </button>
                    <button class="remove-btn w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center border border-red-900 text-red-500 hover:bg-red-500 hover:text-white transition-colors" aria-label="Remove">
                        <i class="fas fa-times text-xs sm:text-base"></i>
                    </button>
                </div>
            `;

            listItem.addEventListener('dragstart', handleDragStart);
            listItem.addEventListener('dragend', handleDragEnd);
            listItem.addEventListener('dragover', handleDragOver);
            listItem.addEventListener('drop', handleDrop);

            // Touch support
            listItem.addEventListener('touchstart', handleTouchStart, { passive: false });
            listItem.addEventListener('touchmove', handleTouchMove, { passive: false });
            listItem.addEventListener('touchend', handleTouchEnd);

            const upBtn = listItem.querySelector('.rank-up');
            const downBtn = listItem.querySelector('.rank-down');

            // Disable buttons logic
            if (index === 0) {
                upBtn.classList.add('opacity-30', 'cursor-not-allowed');
                upBtn.disabled = true;
            }
            if (index === rankedAnime.length - 1) {
                downBtn.classList.add('opacity-30', 'cursor-not-allowed');
                downBtn.disabled = true;
            }

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
            rankingGrid.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center text-gray-600 py-12 border border-dashed border-gray-800">
                    <i class="fas fa-image text-3xl mb-2 opacity-50"></i>
                    <p class="font-mono text-sm">AWAITING_RANKED_DATA...</p>
                </div>
            `;
            if (downloadGridButton) {
                downloadGridButton.disabled = true;
                downloadGridButton.classList.add('opacity-50', 'cursor-not-allowed');
            }
            return;
        }

        const gridSize = 5; // Fixed grid size for visual consistency

        rankingGrid.innerHTML = '';

        rankedAnime.forEach((anime, index) => {
            const title = anime.title.romaji || anime.title.english || 'Untitled';
            const cover = anime.coverImage?.extraLarge || anime.coverImage?.large || FALLBACK_SQUARE;
            const safeCover = cover.replace(/"/g, '\\"');

            const tile = document.createElement('div');
            tile.className = 'relative aspect-square bg-gray-800 border border-gray-700 overflow-hidden group';

            tile.innerHTML = `
                <div class="w-full h-full bg-cover bg-center" style="background-image: url('${safeCover}')" role="img" aria-label="${title}"></div>
                <div class="absolute top-0.5 left-0.5 sm:top-1 sm:left-1 bg-neon-blue text-base-bg text-[8px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 shadow-sm font-orbitron">#${index + 1}</div>
            `;
            rankingGrid.appendChild(tile);
        });

        if (downloadGridButton) {
            downloadGridButton.disabled = false;
            downloadGridButton.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }

    /**
     * Converts an image URL to a base64 data URL to avoid CORS issues
     */
    async function convertImageToDataURL(url) {
        return new Promise(async (resolve) => {
            try {
                // Try direct approach first (works locally)
                const img = new Image();
                img.crossOrigin = 'anonymous';

                const directLoad = new Promise((resolveImg) => {
                    img.onload = () => {
                        try {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0);
                            resolveImg(canvas.toDataURL('image/png'));
                        } catch (e) {
                            resolveImg(null);
                        }
                    };
                    img.onerror = () => resolveImg(null);
                    img.src = url;
                });

                const result = await Promise.race([
                    directLoad,
                    new Promise(r => setTimeout(() => r(null), 3000)) // 3s timeout
                ]);

                if (result) {
                    resolve(result);
                    return;
                }

                // If direct approach fails, use fetch with CORS proxy
                const corsProxy = 'https://corsproxy.io/?';
                const response = await fetch(corsProxy + encodeURIComponent(url));
                const blob = await response.blob();

                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => resolve(url); // Fallback
                reader.readAsDataURL(blob);

            } catch (e) {
                console.warn('Failed to convert image:', url, e);
                resolve(url); // Fallback to original
            }
        });
    }

    async function downloadRankingGrid() {
        if (!rankingGrid || rankedAnime.length === 0) return;
        if (typeof html2canvas !== 'function') {
            alert('MODULE_MISSING: html2canvas');
            return;
        }

        const originalLabel = downloadGridButton.innerHTML;
        downloadGridButton.disabled = true;
        downloadGridButton.innerHTML = '<i class="fas fa-cog fa-spin"></i> PROCESSING...';

        try {
            // Get all tiles with background images
            const tiles = rankingGrid.querySelectorAll('[role="img"]');
            const originalBackgrounds = [];

            // Convert external images to base64 data URLs to avoid CORS issues
            let processedCount = 0;
            for (const tile of tiles) {
                const bg = getComputedStyle(tile).backgroundImage;
                const match = bg.match(/url\(["']?(.*?)["']?\)/);

                if (match && match[1]) {
                    processedCount++;
                    downloadGridButton.innerHTML = `<i class="fas fa-cog fa-spin"></i> ${processedCount}/${tiles.length}...`;

                    originalBackgrounds.push({
                        tile,
                        original: tile.style.backgroundImage || bg
                    });

                    // Convert to data URL
                    const dataURL = await convertImageToDataURL(match[1]);
                    tile.style.backgroundImage = `url("${dataURL}")`;
                }
            }

            // Small delay to ensure styles are applied
            await new Promise(resolve => setTimeout(resolve, 200));

            downloadGridButton.innerHTML = '<i class="fas fa-cog fa-spin"></i> RENDERING...';

            // Render with html2canvas (no CORS settings needed with data URLs)
            const canvas = await html2canvas(rankingGrid, {
                backgroundColor: '#17212b', // Match base-bg
                scale: 2,
                logging: false
            });

            // Restore original backgrounds
            originalBackgrounds.forEach(({ tile, original }) => {
                tile.style.backgroundImage = original;
            });

            const link = document.createElement('a');
            link.download = `ANI_RANKER_GRID_${new Date().toISOString().slice(0, 10)}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            // Success feedback
            downloadGridButton.innerHTML = '<i class="fas fa-check"></i> <span class="hidden sm:inline">DOWNLOAD_</span>SUCCESS!';
            setTimeout(() => {
                downloadGridButton.innerHTML = originalLabel;
                downloadGridButton.disabled = rankedAnime.length === 0;
            }, 2000);

        } catch (error) {
            console.error('Error exporting grid:', error);
            alert('EXPORT_FAILED: ' + error.message);
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

    function removeAnimeFromList(animeId) {
        rankedAnime = rankedAnime.filter(anime => anime.id !== animeId);
        renderRankedList();
        saveList();
    }

    function saveList() {
        localStorage.setItem('rankedAnime', JSON.stringify(rankedAnime));

        const originalText = saveListButton.innerHTML;
        const originalBg = saveListButton.className;

        saveListButton.innerHTML = '<i class="fas fa-check"></i> SAVED';
        saveListButton.classList.remove('bg-green-900/30', 'text-green-400');
        saveListButton.classList.add('bg-green-500', 'text-black');

        setTimeout(() => {
            saveListButton.innerHTML = originalText;
            saveListButton.classList.remove('bg-green-500', 'text-black');
            saveListButton.classList.add('bg-green-900/30', 'text-green-400');
        }, 2000);
    }

    function exportList() {
        if (rankedAnime.length === 0) {
            alert('DATABASE_EMPTY');
            return;
        }

        let content = 'ANI_RANKER_EXPORT\n=================\n\n';
        rankedAnime.forEach((anime, index) => {
            const title = anime.title.romaji || anime.title.english || 'Untitled';
            content += `${index + 1}. ${title} [${anime.startDate?.year || '????'}]\n`;
        });

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ani_ranker_export.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const originalText = exportListButton.innerHTML;
        exportListButton.innerHTML = '<i class="fas fa-check"></i> EXPORTED';
        exportListButton.classList.remove('bg-blue-900/30', 'text-blue-400');
        exportListButton.classList.add('bg-blue-500', 'text-black');

        setTimeout(() => {
            exportListButton.innerHTML = originalText;
            exportListButton.classList.remove('bg-blue-500', 'text-black');
            exportListButton.classList.add('bg-blue-900/30', 'text-blue-400');
        }, 2000);
    }

    function loadList() {
        const savedList = localStorage.getItem('rankedAnime');
        if (savedList) {
            try {
                rankedAnime = JSON.parse(savedList);
                renderRankedList();
            } catch (e) {
                console.error("Corrupt save data", e);
            }
        }
    }

    function clearList() {
        if (rankedAnime.length === 0) return;

        if (confirm('CONFIRM_PURGE: Are you sure you want to delete all data?')) {
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
        this.classList.add('opacity-50', 'border-neon-blue', 'border-dashed');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
    }

    function handleDragEnd(e) {
        this.classList.remove('opacity-50', 'border-neon-blue', 'border-dashed');
        rankedList.querySelectorAll('.ranked-item').forEach(item => {
            item.classList.remove('border-t-4', 'border-neon-blue');
        });
    }

    function handleDragOver(e) {
        e.preventDefault();
        return false;
    }

    function handleDrop(e) {
        e.stopPropagation();
        e.preventDefault();

        if (draggedItem !== this) {
            const draggedId = parseInt(draggedItem.dataset.id);
            const targetId = parseInt(this.dataset.id);

            const draggedIndex = rankedAnime.findIndex(anime => anime.id === draggedId);
            const targetIndex = rankedAnime.findIndex(anime => anime.id === targetId);

            if (draggedIndex !== -1 && targetIndex !== -1) {
                const [removed] = rankedAnime.splice(draggedIndex, 1);
                rankedAnime.splice(targetIndex, 0, removed);
                renderRankedList();
                saveList();
            }
        }
        return false;
    }

    // Touch support helpers
    let touchDragItem = null;
    let touchStartY = 0;

    function handleTouchStart(e) {
        touchDragItem = this;
        touchStartY = e.touches[0].clientY;
        this.classList.add('opacity-50');
    }

    function handleTouchMove(e) {
        e.preventDefault(); // Prevent scrolling while dragging
        const touchY = e.touches[0].clientY;
        const element = document.elementFromPoint(e.touches[0].clientX, touchY);
        const targetItem = element ? element.closest('.ranked-item') : null;
    }

    function handleTouchEnd(e) {
        this.classList.remove('opacity-50');
        const touchY = e.changedTouches[0].clientY;
        const element = document.elementFromPoint(e.changedTouches[0].clientX, touchY);
        const targetItem = element ? element.closest('.ranked-item') : null;

        if (targetItem && targetItem !== this) {
            const draggedId = parseInt(this.dataset.id);
            const targetId = parseInt(targetItem.dataset.id);

            const draggedIndex = rankedAnime.findIndex(anime => anime.id === draggedId);
            const targetIndex = rankedAnime.findIndex(anime => anime.id === targetId);

            if (draggedIndex !== -1 && targetIndex !== -1) {
                const [removed] = rankedAnime.splice(draggedIndex, 1);
                rankedAnime.splice(targetIndex, 0, removed);
                renderRankedList();
                saveList();
            }
        }
    }


    // ----------------------------------------------------------------------
    // ## Initializers & Event Listeners
    // ----------------------------------------------------------------------

    if (searchButton) {
        searchButton.addEventListener('click', () => {
            const query = searchInput.value.trim();
            const type = searchType.value;
            if (query) { searchAniList(query, type); }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                const type = searchType.value;
                if (query) { searchAniList(query, type); }
            }
        });
    }

    if (fetchUserListButton) {
        fetchUserListButton.addEventListener('click', () => {
            const username = usernameInput.value.trim();
            const status = statusFilter.value;
            const type = importType.value;
            fetchUserList(username, status, type);
        });
    }

    if (usernameInput) {
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const username = usernameInput.value.trim();
                const status = statusFilter.value;
                const type = importType.value;
                fetchUserList(username, status, type);
            }
        });
    }

    // Filter listeners
    [sortFilter, orderFilter, formatFilter, scoreFilter].forEach(el => {
        if (el) el.addEventListener('change', renderUserListResults);
    });

    if (saveListButton) saveListButton.addEventListener('click', saveList);
    if (exportListButton) exportListButton.addEventListener('click', exportList);
    if (clearListButton) clearListButton.addEventListener('click', clearList);
    if (downloadGridButton) downloadGridButton.addEventListener('click', downloadRankingGrid);

    // Initial Load
    loadList();
});
