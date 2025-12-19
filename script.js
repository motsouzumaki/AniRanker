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

    // --- UI Elements ---
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

    // --- Discovery Tabs Setup ---
    const tabSearch = document.getElementById('tab-search');
    const tabImport = document.getElementById('tab-import');
    const contentSearch = document.getElementById('content-search');
    const contentImport = document.getElementById('content-import');

    function setupDiscoveryTabs() {
        if (!tabSearch || !tabImport || !contentSearch || !contentImport) return;

        function switchTab(activeBtn, activeContent, inactiveBtn, inactiveContent) {
            // Update buttons
            activeBtn.classList.add('active');
            inactiveBtn.classList.remove('active');

            // Update content visibility
            activeContent.classList.remove('hidden');
            activeContent.classList.add('active');
            inactiveContent.classList.add('hidden');
            inactiveContent.classList.remove('active');
        }

        tabSearch.addEventListener('click', () => {
            switchTab(tabSearch, contentSearch, tabImport, contentImport);
        });

        tabImport.addEventListener('click', () => {
            switchTab(tabImport, contentImport, tabSearch, contentSearch);
        });
    }

    // Initialize tabs
    setupDiscoveryTabs();

    // --- State & Constants ---
    const ANILIST_API_URL = 'https://graphql.anilist.co';
    const API_HEADERS = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };
    const FALLBACK_SQUARE = 'https://placehold.co/600x600/e2e8f0/64748b?text=Ani';

    /**
     * Debounce function to limit how often a function is executed.
     */
    function debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }

    let rankedAnime = [];
    let draggedItem = null;
    let currentUserEntries = [];

    // ----------------------------------------------------------------------
    // ## Dark Mode Implementation (Clean Theme)
    // ----------------------------------------------------------------------

    let isDarkMode;

    // Check for saved user preference, if any, on load
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        isDarkMode = true;
        document.documentElement.classList.add('dark');
    } else {
        isDarkMode = false;
        document.documentElement.classList.remove('dark');
    }

    // Initialize button state based on initial isDarkMode
    if (darkModeToggle) {
        if (isDarkMode) {
            darkModeToggle.innerHTML = '<i class="fas fa-sun text-amber-400"></i> <span>Light Mode</span>';
            darkModeToggle.classList.replace('bg-slate-100', 'bg-slate-700');
            darkModeToggle.classList.replace('text-slate-600', 'text-slate-200');
        } else {
            darkModeToggle.innerHTML = '<i class="fas fa-moon text-primary"></i> <span>Dark Mode</span>';
            darkModeToggle.classList.replace('bg-slate-700', 'bg-slate-100');
            darkModeToggle.classList.replace('text-slate-200', 'text-slate-600');
        }
    }

    function toggleDarkMode() {
        isDarkMode = !isDarkMode;
        const html = document.documentElement;

        if (isDarkMode) {
            html.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            if (darkModeToggle) {
                darkModeToggle.innerHTML = '<i class="fas fa-sun text-amber-400"></i> <span>Light Mode</span>';
                darkModeToggle.classList.replace('bg-slate-100', 'bg-slate-700');
                darkModeToggle.classList.replace('text-slate-600', 'text-slate-200');
            }
        } else {
            html.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            if (darkModeToggle) {
                darkModeToggle.innerHTML = '<i class="fas fa-moon text-primary"></i> <span>Dark Mode</span>';
                darkModeToggle.classList.replace('bg-slate-700', 'bg-slate-100');
                darkModeToggle.classList.replace('text-slate-200', 'text-slate-600');
            }
        }
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
    }

    // ----------------------------------------------------------------------
    // ## AniList API Functions
    // ----------------------------------------------------------------------

    const characterFilters = document.getElementById('characterFilters');
    const filterMale = document.getElementById('filterMale');
    const filterFemale = document.getElementById('filterFemale');

    let currentRawResults = [];
    let currentSearchType = 'ANIME';

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

    async function searchAniList(query, type = 'ANIME') {
        if (!query) return;

        currentSearchType = type;
        searchResults.innerHTML = '<div class="col-span-full text-center py-10 text-primary font-medium animate-pulse"><i class="fas fa-circle-notch fa-spin mr-2"></i>Searching database...</div>';

        let graphqlQuery;
        let variables = { search: query, perPage: 50 };

        if (type === 'CHARACTER') {
            graphqlQuery = `
                query ($search: String, $perPage: Int) {
                    Page (perPage: $perPage) {
                        characters (search: $search) {
                            id
                            name { full native }
                            image { large }
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
                            title { romaji english }
                            coverImage { large }
                            startDate { year }
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
                headers: API_HEADERS,
                body: JSON.stringify({ query: graphqlQuery, variables: variables })
            });

            if (!response.ok) throw new Error(`Network error: ${response.status}`);
            const data = await response.json();
            if (data.errors) throw new Error(data.errors[0].message);

            if (type === 'CHARACTER') {
                currentRawResults = data.data.Page.characters;
                filterSearchResults();
            } else {
                currentRawResults = data.data.Page.media;
                displaySearchResults(currentRawResults, type);
            }

        } catch (error) {
            console.error("Error searching AniList:", error);
            searchResults.innerHTML = `<div class="col-span-full text-center py-10 text-rose-500 bg-rose-50 rounded-lg text-sm"><i class="fas fa-exclamation-triangle mr-2"></i>Error: ${error.message}</div>`;
        }
    }

    function displaySearchResults(results, type = 'ANIME') {
        searchResults.innerHTML = '';

        if (results.length === 0) {
            searchResults.innerHTML = '<div class="col-span-full text-center py-10 text-slate-400 text-sm">No results found</div>';
            return;
        }

        results.forEach(item => {
            const itemEl = createResultItem(item, null, item.startDate?.year, item.format, type);
            searchResults.appendChild(itemEl);
        });
    }

    /**
     * Updated Card Design (Modern/Clean)
     */
    function createResultItem(data, score, year, format, type = 'ANIME') {
        const item = document.createElement('div');
        // New clean card classes with Dark Mode support
        item.className = 'bg-white dark:bg-slate-700 rounded-xl overflow-hidden shadow-sm hover:shadow-hover border border-slate-100 dark:border-slate-600 transition-all duration-200 cursor-pointer group flex flex-col h-full';

        let title, cover, metaHtml = '';

        if (type === 'CHARACTER') {
            title = data.name.full || data.name.native || 'Unknown';
            cover = data.image?.large || FALLBACK_SQUARE;
            const gender = data.gender || '?';
            metaHtml += `<span class="text-[9px] bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border border-purple-100 dark:border-purple-700 px-1.5 py-0.5 rounded mr-1">${gender}</span>`;
        } else {
            title = data.title.romaji || data.title.english || 'Untitled';
            cover = data.coverImage?.large || FALLBACK_SQUARE;
            if (score) metaHtml += `<span class="text-[9px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 px-1.5 py-0.5 rounded mr-1">${score}</span>`;
            if (year) metaHtml += `<span class="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded mr-1">${year}</span>`;
            if (format) metaHtml += `<span class="text-[9px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800 px-1.5 py-0.5 rounded">${format}</span>`;
        }

        item.innerHTML = `
            <div class="relative aspect-[2/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img src="${cover}" alt="${title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                    <button class="add-btn bg-white text-primary font-bold px-3 py-1 text-xs rounded-full shadow-lg hover:bg-primary hover:text-white transition-colors">
                        Add
                    </button>
                </div>
            </div>
            <div class="p-2.5 flex flex-col flex-1">
                <h4 class="text-slate-800 dark:text-slate-200 font-bold text-xs leading-tight line-clamp-2 mb-1.5" title="${title}">${title}</h4>
                <div class="mt-auto flex flex-wrap gap-1">
                    ${metaHtml}
                </div>
            </div>
        `;


        // Normalize data for ranking list
        const rankData = {
            id: data.id,
            format: type === 'CHARACTER' ? 'CHARACTER' : (format || 'ANIME'),
            startDate: { year: type === 'CHARACTER' ? '' : year }
        };

        // Preserve original structure for title/name and coverImage/image
        if (type === 'CHARACTER') {
            rankData.name = data.name;
            rankData.image = data.image;
        } else {
            rankData.title = data.title;
            rankData.coverImage = data.coverImage;
        }

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

    async function fetchUserList(username, status, type = 'ANIME') {
        if (!username) return;

        userListResults.innerHTML = `<div class="col-span-full text-center py-10 text-primary animate-pulse"><i class="fas fa-sync fa-spin mr-2"></i>Syncing...</div>`;
        searchResults.innerHTML = '';
        filterControls.classList.add('hidden');

        const userQuery = `query ($name: String) { User(name: $name) { id name } }`;
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
                headers: API_HEADERS,
                body: JSON.stringify({ query: userQuery, variables: { name: username } })
            });
            const userData = await userRes.json();
            const user = userData.data?.User;

            if (!user) {
                userListResults.innerHTML = `<div class="col-span-full text-center py-10 text-rose-500">User not found</div>`;
                return;
            }

            const listRes = await fetch(ANILIST_API_URL, {
                method: 'POST',
                headers: API_HEADERS,
                body: JSON.stringify({ query: listQuery, variables: { userId: user.id, type: type } })
            });
            const listData = await listRes.json();

            if (!listData.data?.MediaListCollection) {
                userListResults.innerHTML = `<div class="col-span-full text-center py-10 text-amber-500">No public lists found</div>`;
                return;
            }

            const allLists = listData.data.MediaListCollection.lists;
            const allEntries = allLists.flatMap(list => list.entries);
            currentUserEntries = allEntries.filter(entry => entry.status === status);
            renderUserListResults();

        } catch (error) {
            userListResults.innerHTML = `<div class="col-span-full text-center py-10 text-rose-500">Error: ${error.message}</div>`;
        }
    }

    function renderUserListResults() {
        userListResults.innerHTML = '';

        if (currentUserEntries.length === 0) {
            userListResults.innerHTML = `<div class="col-span-full text-center py-10 text-slate-400">No entries found for this status</div>`;
            filterControls.classList.add('hidden');
            return;
        }

        const sortBy = sortFilter.value;
        const sortOrder = orderFilter.value;
        const formatFilterValue = formatFilter.value;
        const minScore = parseInt(scoreFilter.value);

        let filteredEntries = currentUserEntries.filter(entry => {
            if (formatFilterValue !== 'ALL' && entry.media.format !== formatFilterValue) return false;
            if (minScore > 0 && entry.score < minScore) return false;
            return true;
        });

        if (filteredEntries.length === 0) {
            userListResults.innerHTML = '<div class="col-span-full text-center py-10 text-slate-400">No matches for filters</div>';
            filterControls.classList.remove('hidden');
            filterControls.style.display = 'block';
            return;
        }

        const sortedEntries = filteredEntries.sort((a, b) => {
            let valA, valB;
            switch (sortBy) {
                case 'SCORE': valA = a.score || 0; valB = b.score || 0; break;
                case 'START_DATE': valA = a.media.startDate.year || 0; valB = b.media.startDate.year || 0; break;
                case 'FORMAT': valA = a.media.format || ''; valB = b.media.format || ''; break;
                case 'TITLE_ROMAJI': default:
                    valA = a.media.title.romaji || ''; valB = b.media.title.romaji || '';
            }
            if (typeof valA === 'string') {
                return sortOrder === 'ASC' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return sortOrder === 'ASC' ? valA - valB : valB - valA;
        });

        sortedEntries.forEach(entry => {
            const itemEl = createResultItem(entry.media, entry.score, entry.media.startDate.year, entry.media.format);
            userListResults.appendChild(itemEl);
        });

        filterControls.classList.remove('hidden');
        filterControls.style.display = 'block';
    }

    // ----------------------------------------------------------------------
    // ## Ranked List Logic (Updated UI)
    // ----------------------------------------------------------------------

    function addAnimeToList(anime) {
        console.log('addAnimeToList called with:', anime);
        console.log('Current rankedAnime:', rankedAnime);

        if (rankedAnime.some(item => item.id === anime.id)) {
            alert('Item already in list');
            return;
        }
        rankedAnime.push(anime);
        console.log('After push, rankedAnime:', rankedAnime);
        renderRankedList();
        saveList();
    }

    function renderRankedList() {
        rankedList.innerHTML = '';

        if (rankedAnime.length === 0) {
            rankedList.innerHTML = `
                <div class="text-center py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                    <i class="fas fa-ghost text-3xl mb-2 opacity-30"></i>
                    <p class="text-sm">Your ranking is empty</p>
                </div>
            `;
            renderRankingGrid();
            return;
        }

        rankedAnime.forEach((anime, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'ranked-item bg-white dark:bg-slate-700 p-2 rounded-lg flex items-center gap-3 border border-slate-100 dark:border-slate-600 shadow-sm transition-all group select-none cursor-move';
            listItem.draggable = true;
            listItem.dataset.id = anime.id;

            const title = anime.title?.romaji || anime.title?.english || anime.name?.full || anime.name?.native || 'Untitled';
            const cover = anime.coverImage?.large || anime.image?.large || FALLBACK_SQUARE;

            listItem.innerHTML = `
                <div class="w-6 h-6 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-bold rounded text-xs shrink-0 cursor-grab">
                    ${index + 1}
                </div>
                <img src="${cover}" alt="${title}" class="w-8 h-8 rounded-md object-cover shrink-0">
                <div class="flex-1 min-w-0">
                    <div class="text-slate-700 dark:text-slate-200 font-medium text-sm truncate leading-tight">${title}</div>
                    <div class="text-[10px] text-slate-400">${anime.format || 'N/A'} • ${anime.startDate?.year || '????'}</div>
                </div>
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="rank-btn rank-up w-6 h-6 flex items-center justify-center rounded bg-slate-50 dark:bg-slate-800 hover:bg-primary hover:text-white text-slate-400 transition-colors">
                        <i class="fas fa-chevron-up text-[10px]"></i>
                    </button>
                    <button class="rank-btn rank-down w-6 h-6 flex items-center justify-center rounded bg-slate-50 dark:bg-slate-800 hover:bg-primary hover:text-white text-slate-400 transition-colors">
                        <i class="fas fa-chevron-down text-[10px]"></i>
                    </button>
                    <button class="remove-btn w-6 h-6 flex items-center justify-center rounded bg-rose-50 dark:bg-rose-900/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors ml-1">
                        <i class="fas fa-times text-[10px]"></i>
                    </button>
                </div>
            `;

            // Drag Events
            listItem.addEventListener('dragstart', handleDragStart);
            listItem.addEventListener('dragend', handleDragEnd);
            listItem.addEventListener('dragover', handleDragOver);
            listItem.addEventListener('drop', handleDrop);

            // Touch Events
            listItem.addEventListener('touchstart', handleTouchStart, { passive: false });
            listItem.addEventListener('touchmove', handleTouchMove, { passive: false });
            listItem.addEventListener('touchend', handleTouchEnd);

            const upBtn = listItem.querySelector('.rank-up');
            const downBtn = listItem.querySelector('.rank-down');

            if (index === 0) upBtn.disabled = true;
            if (index === rankedAnime.length - 1) downBtn.disabled = true;

            upBtn.addEventListener('click', (e) => { e.stopPropagation(); moveAnime(anime.id, -1); });
            downBtn.addEventListener('click', (e) => { e.stopPropagation(); moveAnime(anime.id, 1); });
            listItem.querySelector('.remove-btn').addEventListener('click', (e) => { e.stopPropagation(); removeAnimeFromList(anime.id); });

            rankedList.appendChild(listItem);
        });

        renderRankingGrid();
    }

    function renderRankingGrid() {
        if (!rankingGrid) return;

        if (rankedAnime.length === 0) {
            rankingGrid.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 py-12">
                    <i class="fas fa-photo-video text-2xl mb-2 opacity-50"></i>
                    <p class="text-xs">Grid view</p>
                </div>
            `;
            if (downloadGridButton) downloadGridButton.disabled = true;
            return;
        }

        rankingGrid.innerHTML = '';

        rankedAnime.forEach((anime, index) => {
            const title = anime.title?.romaji || anime.title?.english || anime.name?.full || anime.name?.native || 'Untitled';
            const cover = anime.coverImage?.large || anime.image?.large || FALLBACK_SQUARE;
            const safeCover = cover.replace(/"/g, '\\"');

            const tile = document.createElement('div');
            tile.className = 'relative aspect-[3/4] bg-slate-200 dark:bg-slate-800 overflow-hidden group shadow-sm';

            tile.innerHTML = `
                <div class="w-full h-full bg-cover bg-center" style="background-image: url('${safeCover}')" role="img"></div>
                <div class="absolute top-1 left-1 bg-white/90 dark:bg-black/60 text-slate-800 dark:text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm">
                    ${index + 1}
                </div>
            `;
            rankingGrid.appendChild(tile);
        });

        if (downloadGridButton) downloadGridButton.disabled = false;
    }

    // --- Helpers (Image Conversion, Move, Save, etc) --- 

    async function convertImageToDataURL(url) {
        return new Promise(async (resolve) => {
            try {
                // Try direct load first
                const img = new Image();
                img.crossOrigin = 'anonymous';

                const directLoad = new Promise((resolveImg) => {
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        try { resolveImg(canvas.toDataURL('image/png')); } catch (e) { resolveImg(null); }
                    };
                    img.onerror = () => resolveImg(null);
                    img.src = url;
                });

                const result = await Promise.race([directLoad, new Promise(r => setTimeout(() => r(null), 3000))]);
                if (result) { resolve(result); return; }

                // Fallback to proxy
                const corsProxy = 'https://corsproxy.io/?';
                const response = await fetch(corsProxy + encodeURIComponent(url));
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => resolve(url);
                reader.readAsDataURL(blob);

            } catch (e) {
                console.warn('Image convert failed', e);
                resolve(url);
            }
        });
    }

    async function downloadRankingGrid() {
        if (!rankingGrid || rankedAnime.length === 0) return;

        const originalLabel = downloadGridButton.innerHTML;
        downloadGridButton.disabled = true;
        downloadGridButton.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Processing...';

        try {
            const tiles = rankingGrid.querySelectorAll('[role="img"]');
            const originalBackgrounds = [];

            // Convert images for canvas
            for (const tile of tiles) {
                const bg = getComputedStyle(tile).backgroundImage;
                const match = bg.match(/url\(["']?(.*?)["']?\)/);
                if (match && match[1]) {
                    originalBackgrounds.push({ tile, original: tile.style.backgroundImage || bg });
                    const dataURL = await convertImageToDataURL(match[1]);
                    if (dataURL) tile.style.backgroundImage = `url("${dataURL}")`;
                }
            }

            await new Promise(r => setTimeout(r, 200));

            const canvas = await html2canvas(rankingGrid, {
                backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', // Match theme
                scale: 2,
                logging: false
            });

            // Restore
            originalBackgrounds.forEach(({ tile, original }) => tile.style.backgroundImage = original);

            const link = document.createElement('a');
            link.download = `RANKER_${new Date().toISOString().slice(0, 10)}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            downloadGridButton.innerHTML = '<i class="fas fa-check"></i> Success';
            setTimeout(() => {
                downloadGridButton.innerHTML = originalLabel;
                downloadGridButton.disabled = false;
            }, 2000);

        } catch (error) {
            console.error('Export error', error);
            alert('Export failed');
            downloadGridButton.innerHTML = originalLabel;
            downloadGridButton.disabled = false;
        }
    }

    function moveAnime(animeId, delta) {
        const i = rankedAnime.findIndex(a => a.id === animeId);
        if (i === -1) return;
        const j = i + delta;
        if (j < 0 || j >= rankedAnime.length) return;

        [rankedAnime[i], rankedAnime[j]] = [rankedAnime[j], rankedAnime[i]];
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
        saveListButton.innerHTML = '<i class="fas fa-check"></i> Saved';
        saveListButton.classList.remove('bg-emerald-50', 'text-emerald-600', 'border-emerald-200', 'dark:bg-emerald-900/20');
        saveListButton.classList.add('bg-emerald-500', 'text-white', 'border-emerald-500');

        setTimeout(() => {
            saveListButton.innerHTML = originalText;
            saveListButton.classList.add('bg-emerald-50', 'text-emerald-600', 'border-emerald-200', 'dark:bg-emerald-900/20');
            saveListButton.classList.remove('bg-emerald-500', 'text-white', 'border-emerald-500');
        }, 1000);
    }

    function exportList() {
        if (rankedAnime.length === 0) return;
        let content = 'RANKING EXPORT\n==============\n\n';
        rankedAnime.forEach((anime, index) => {
            content += `${index + 1}. ${anime.title.romaji || 'Untitled'}\n`;
        });
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ranking.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function loadList() {
        const saved = localStorage.getItem('rankedAnime');
        if (saved) {
            try { rankedAnime = JSON.parse(saved); renderRankedList(); } catch (e) { }
        }
    }

    function clearList() {
        if (rankedAnime.length === 0) return;
        if (confirm('Clear all data?')) {
            rankedAnime = [];
            renderRankedList();
            saveList();
        }
    }

    // Drag Helpers
    function handleDragStart(e) {
        draggedItem = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleDragEnd(e) {
        this.classList.remove('dragging');
        rankedList.querySelectorAll('.ranked-item').forEach(item => item.classList.remove('drag-over'));
    }
    function handleDragOver(e) {
        e.preventDefault();
        this.classList.add('drag-over');
        return false;
    }
    function handleDrop(e) {
        e.stopPropagation(); e.preventDefault();
        this.classList.remove('drag-over');
        if (draggedItem !== this) {
            const draggedId = parseInt(draggedItem.dataset.id);
            const targetId = parseInt(this.dataset.id);
            const draggedIndex = rankedAnime.findIndex(a => a.id === draggedId);
            const targetIndex = rankedAnime.findIndex(a => a.id === targetId);
            if (draggedIndex !== -1 && targetIndex !== -1) {
                const [removed] = rankedAnime.splice(draggedIndex, 1);
                rankedAnime.splice(targetIndex, 0, removed);
                renderRankedList();
                saveList();
            }
        }
        return false;
    }

    // Touch Helpers: Long Press Logic with Live Reordering (No Ghost)
    let longPressTimer = null;
    let isTouchDragging = false;
    let activeItem = null;
    const LONG_PRESS_DURATION = 400; // ms

    function resetTouchState() {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        isTouchDragging = false;

        // Restore placeholder
        if (activeItem) {
            activeItem.classList.remove('drag-placeholder');
            activeItem = null;
        }
    }

    function handleTouchStart(e) {
        if (e.touches.length > 1) return; // Ignore multi-touch

        // Force reset state at the start of each touch
        resetTouchState();

        const touchItem = this;

        // Start Timer
        longPressTimer = setTimeout(() => {
            isTouchDragging = true;
            activeItem = touchItem;

            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(50);

            // Style original as placeholder (gray)
            touchItem.classList.add('drag-placeholder');
        }, LONG_PRESS_DURATION);
    }

    function handleTouchMove(e) {
        if (!isTouchDragging) {
            resetTouchState();
            return;
        }

        // Lock scroll while dragging
        if (e.cancelable) e.preventDefault();

        const touch = e.touches[0];

        // Live Reordering: Find what's under the finger
        const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
        const targetItem = elementUnder ? elementUnder.closest('.ranked-item') : null;

        if (targetItem && targetItem !== activeItem && !targetItem.classList.contains('drag-placeholder')) {
            // Determine if we should insert before or after
            const targetRect = targetItem.getBoundingClientRect();
            const targetMiddle = targetRect.top + targetRect.height / 2;

            if (touch.clientY < targetMiddle) {
                // Insert before
                targetItem.parentNode.insertBefore(activeItem, targetItem);
            } else {
                // Insert after
                targetItem.parentNode.insertBefore(activeItem, targetItem.nextSibling);
            }
        }
    }

    function handleTouchEnd(e) {
        const wasDragging = isTouchDragging;

        // Capture final order before cleanup
        if (wasDragging && activeItem) {
            // Update rankedAnime array to match new DOM order
            const items = rankedList.querySelectorAll('.ranked-item');
            const newOrder = [];
            items.forEach(item => {
                const id = parseInt(item.dataset.id);
                const anime = rankedAnime.find(a => a.id === id);
                if (anime) newOrder.push(anime);
            });
            rankedAnime = newOrder;
            saveList();
        }

        // Always clear state
        resetTouchState();

        if (!wasDragging) return;

        // Re-render to clean up and apply final state
        renderRankedList();
    }

    // Listeners
    // Use debounced search for input
    const debouncedSearch = debounce(() => {
        searchAniList(searchInput.value.trim(), searchType.value);
    }, 500);

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (searchInput.value.trim().length > 2) debouncedSearch();
        });
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchAniList(searchInput.value.trim(), searchType.value);
        });
    }

    if (searchButton) searchButton.addEventListener('click', () => searchAniList(searchInput.value.trim(), searchType.value));

    // Enter key support for username input (sync)
    if (usernameInput) {
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                fetchUserList(usernameInput.value.trim(), statusFilter.value, importType.value);
            }
        });
    }

    if (fetchUserListButton) fetchUserListButton.addEventListener('click', () => fetchUserList(usernameInput.value.trim(), statusFilter.value, importType.value));

    [sortFilter, orderFilter, formatFilter, scoreFilter].forEach(el => {
        if (el) el.addEventListener('change', renderUserListResults);
    });

    // Export rank number toggle
    const toggleExportRanks = document.getElementById('toggleExportRanks');
    if (toggleExportRanks && rankingGrid) {
        toggleExportRanks.addEventListener('change', (e) => {
            if (e.target.checked) {
                rankingGrid.classList.remove('hide-ranks');
            } else {
                rankingGrid.classList.add('hide-ranks');
            }
        });
    }

    if (saveListButton) saveListButton.addEventListener('click', saveList);
    if (exportListButton) exportListButton.addEventListener('click', exportList);
    if (clearListButton) clearListButton.addEventListener('click', clearList);
    if (downloadGridButton) downloadGridButton.addEventListener('click', downloadRankingGrid);

    // ----------------------------------------------------------------------
    // ## Layout Toggle Logic
    // ----------------------------------------------------------------------

    /**
     * Generic toggle function for switching between grid and list layouts
     * @param {string} buttonId - ID of the toggle button
     * @param {string} containerId - ID of the container to toggle class on
     * @param {string} toggleClass - CSS class to toggle
     * @param {string} iconDefault - Icon class for default state
     * @param {string} iconToggled - Icon class for toggled state
     */
    function setupLayoutToggle(buttonId, containerId, toggleClass, iconDefault, iconToggled) {
        const btn = document.getElementById(buttonId);
        const container = document.getElementById(containerId);

        if (!btn || !container) return;

        btn.addEventListener('click', () => {
            // Toggle the class
            const isActive = container.classList.toggle(toggleClass);

            // Update Icon
            const icon = btn.querySelector('i');
            if (icon) {
                // If class is active, show the "other" option icon
                icon.className = isActive ? iconToggled : iconDefault;
            }
        });
    }

    // Initialize Layout Toggles
    // Search Results: Default Grid -> Toggle adds .layout-list (shows List icon when in grid, Grid icon when in list)
    setupLayoutToggle('search-layout-btn', 'searchResults', 'layout-list', 'fas fa-list', 'fas fa-th');

    // Sync/Import Results: Default Grid -> Toggle adds .layout-list
    setupLayoutToggle('sync-layout-btn', 'userListResults', 'layout-list', 'fas fa-list', 'fas fa-th');

    // Ranking Matrix: Default List -> Toggle adds .layout-grid (shows Grid icon when in list, List icon when in grid)
    setupLayoutToggle('ranking-layout-btn', 'rankedList', 'layout-grid', 'fas fa-th', 'fas fa-list');

    loadList();
});