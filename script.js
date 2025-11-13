document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const searchResults = document.getElementById('searchResults');
    const rankedList = document.getElementById('rankedList');

    const usernameInput = document.getElementById('usernameInput');
    const statusFilter = document.getElementById('statusFilter');
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
    const clearListButton = document.getElementById('clearListButton');

    // --- State & Constants ---
    const ANILIST_API_URL = 'https://graphql.anilist.co';
    const API_HEADERS = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    let rankedAnime = [];
    let draggedItem = null;
    let currentUserEntries = []; // Stores the raw fetched entries for local filtering

    // ----------------------------------------------------------------------
    // ## Dark Mode Implementation
    // ----------------------------------------------------------------------

    function applyDarkMode(isDark) {
        document.body.classList.toggle('dark-mode', isDark);
        darkModeToggle.textContent = isDark ? '💡 Light Mode' : '🌙 Dark Mode';
        localStorage.setItem('darkMode', isDark);
    }

    function initDarkMode() {
        const savedMode = localStorage.getItem('darkMode');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Default to system preference if no saved setting
        const initialMode = savedMode ? savedMode === 'true' : prefersDark;
        applyDarkMode(initialMode);
    }

    darkModeToggle.addEventListener('click', () => {
        const isDark = !document.body.classList.contains('dark-mode');
        applyDarkMode(isDark);
    });
    
    // ----------------------------------------------------------------------
    // ## AniList API Functions
    // ----------------------------------------------------------------------

    /**
     * Searches for anime on AniList
     */
    async function searchAniList(query) {
        if (!query) return;

        searchResults.innerHTML = '<p class="loading-message">Searching...</p>';

        const graphqlQuery = `
            query ($search: String, $perPage: Int) {
                Page (perPage: $perPage) {
                    media (search: $search, type: ANIME) {
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
            perPage: 20
        };

        try {
            const response = await fetch(ANILIST_API_URL, {
                method: 'POST',
                headers: API_HEADERS,
                body: JSON.stringify({ query: graphqlQuery, variables: variables })
            });

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
            const itemEl = createResultItem(anime, null, anime.startDate.year);
            itemEl.addEventListener('click', () => addAnimeToList(anime));
            searchResults.appendChild(itemEl);
        });
    }

    /**
     * Fetches a specific user's anime list using MediaListCollection query.
     */
    async function fetchUserList(username, status) {
        if (!username) {
            userListResults.innerHTML = '<p class="error-message">Please enter a username.</p>';
            return;
        }

        userListResults.innerHTML = `<p class="loading-message">Fetching ${username}'s list...</p>`;
        searchResults.innerHTML = ''; 
        filterControls.style.display = 'none'; // Hide filters during fetch

        const graphqlQuery = `
            query ($username: String) {
              MediaListCollection(userName: $username, type: ANIME) {
                lists {
                  entries {
                    media {
                      id
                      title { romaji english }
                      coverImage { large }
                      startDate { year }
                      format
                    }
                    status
                    score
                  }
                }
              }
            }
        `;
        
        const variables = { username: username };

        try {
            const response = await fetch(ANILIST_API_URL, {
                method: 'POST',
                headers: API_HEADERS,
                body: JSON.stringify({ query: graphqlQuery, variables: variables })
            });

            const data = await response.json();

            if (data.errors) {
                throw new Error(data.errors[0].message);
            }

            if (!data.data.MediaListCollection) {
                throw new Error("User not found or their list is private/empty.");
            }

            const allLists = data.data.MediaListCollection.lists;
            
            // Flatten all entries and filter by the selected status
            const allEntries = allLists.flatMap(list => list.entries);
            const initialFilteredEntries = allEntries.filter(entry => entry.status === status);

            // Store the initial filtered list for local manipulation
            currentUserEntries = initialFilteredEntries;

            // Render the initial sorted/filtered view
            renderUserListResults();

        } catch (error) {
            console.error("Error fetching user list:", error);
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
        if (formatFilterValue !== 'all') {
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
                case 'score':
                    valA = a.score || 0;
                    valB = b.score || 0;
                    break;
                case 'year':
                    valA = a.media.startDate.year || 0;
                    valB = b.media.startDate.year || 0;
                    break;
                case 'format':
                    valA = a.media.format || '';
                    valB = b.media.format || '';
                    break;
                case 'name':
                default:
                    valA = a.media.title.romaji || a.media.title.english || '';
                    valB = b.media.title.romaji || b.media.title.english || '';
                    if (valA === valB) return 0;
                    if (sortOrder === 'asc') return valA.localeCompare(valB);
                    return valB.localeCompare(valA);
            }
            
            // For numeric sorts (score, year)
            if (sortBy === 'name' || sortBy === 'format') {
                if (sortOrder === 'asc') return valA.localeCompare(valB);
                return valB.localeCompare(valA);
            } else {
                if (sortOrder === 'asc') return valA - valB;
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
        const cover = anime.coverImage.large || 'placeholder.png'; 
        const scoreDisplay = score ? `Score: ${score}/10` : 'Score: N/A';
        const yearDisplay = year ? `Year: ${year}` : 'Year: N/A';
        const formatDisplay = format ? `Format: ${format}` : '';

        item.innerHTML = `
            <img src="${cover}" alt="${title}">
            <div class="info">
                <strong>${title}</strong>
                <p>${scoreDisplay} | ${yearDisplay} | ${formatDisplay}</p>
            </div>
            <button class="add-btn">Add</button>
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
            rankedList.innerHTML = '<p class="info-message">Your list is empty. Add some anime to get started!</p>';
            return;
        }

        rankedAnime.forEach((anime, index) => {
            const listItem = document.createElement('li');
            listItem.classList.add('rank-item');
            listItem.draggable = true;
            listItem.dataset.id = anime.id;

            const title = anime.title.romaji || anime.title.english || 'Untitled';
            const cover = anime.coverImage.large || 'placeholder.png';

            listItem.innerHTML = `
                <div class="rank-number">${index + 1}</div>
                <img src="${cover}" alt="${title}">
                <div class="rank-info">
                    <strong>${title}</strong>
                </div>
                <button class="remove-btn">Remove</button>
            `;

            // Add drag events
            listItem.addEventListener('dragstart', handleDragStart);
            listItem.addEventListener('dragend', handleDragEnd);
            listItem.addEventListener('dragover', handleDragOver);
            listItem.addEventListener('drop', handleDrop);

            // Add remove functionality
            listItem.querySelector('.remove-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                removeAnimeFromList(anime.id);
            });

            rankedList.appendChild(listItem);
        });
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

    // ----------------------------------------------------------------------
    // ## Initializers & Event Listeners
    // ----------------------------------------------------------------------
    
    // --- Search Listeners ---
    searchButton.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) { searchAniList(query); }
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) { searchAniList(query); }
        }
    });

    // --- User List Listeners ---
    fetchUserListButton.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        const status = statusFilter.value;
        fetchUserList(username, status);
    });

    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const username = usernameInput.value.trim();
            const status = statusFilter.value;
            fetchUserList(username, status);
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
    clearListButton.addEventListener('click', clearList);

    // Initialize Dark Mode and load list
    initDarkMode();
    loadList();
});