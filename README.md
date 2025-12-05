# ANI_RANKER_SYS [V.2]

A high-tech, terminal-style interface for anime and manga ranking. This system allows users to ingest data from the AniList database, sync with user lists, and construct a definitive "Ranking Matrix" with a cyberpunk aesthetic.

## System Features

- **Data Ingestion (Search)**: Query the AniList database for Anime, Manga, and **Characters**.
- **Character Mode**: Dedicated search with gender filtering (Male/Female) and distinct visual styling.
- **External DB Sync (Import)**: Pull user lists (Completed, Watching, Planning, etc.) directly from AniList accounts.
- **Ranking Matrix**: A drag-and-drop enabled interface to order your top entries.
- **Visual Output**: Auto-generates a shareable grid image of your ranking.
- **Visual Mode**: High-contrast "Cyberpunk" aesthetic with neon glows, scanlines, and CRT effects.
- **Local Persistence**: State is saved automatically to local storage.
- **Mobile Responsive**: Fully optimized for mobile devices with adaptive layouts and touch support.

## Tech Stack

- **Core**: HTML5, JavaScript (ES6+)
- **Styling**: Tailwind CSS (via CDN)
- **Fonts**: Orbitron (Headers), JetBrains Mono (Data)
- **API**: AniList GraphQL API
- **Export**: html2canvas

## Installation & Usage

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/motsouzumaki/AniRanker.git
    cd AniRanker
    ```

2.  **Launch System**:
    Simply open `index.html` in any modern web browser. No build step required.

3.  **Operations**:
    - **Search**: Use the "DATA_INGESTION" module to find titles or characters.
    - **Import**: Use "EXTERNAL_DB_SYNC" to load your AniList profile data.
    - **Rank**: Drag items in the "RANKING_MATRIX" to reorder.
    - **Export**: Click "DOWNLOAD_PNG" to save your grid.

## File Structure

```
AniRanker/
│
├── index.html          # Main interface (Tailwind CDN integrated)
├── style.css           # Custom visual effects (Scanlines, Grid, Scrollbars)
├── script.js           # System logic & API handling
└── README.md           # System documentation
```

## Mobile Support

The application is fully responsive with:
- Adaptive text sizes (smaller on mobile, larger on desktop)
- Flexible button layouts that prevent horizontal overflow
- Touch-enabled drag-and-drop for ranking
- Optimized grid displays for various screen sizes

## License

Distributed under the MIT License.

## Acknowledgments

- [AniList API](https://anilist.co)
- [Tailwind CSS](https://tailwindcss.com)
- [Font Awesome](https://fontawesome.com)
