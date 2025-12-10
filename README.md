# AniRanker - Modern Curation System

A clean, responsive web application for searching, ranking, and organizing your anime and manga lists. This system allows you to easily ingest data from AniList, sync with your personal lists, and create a beautiful "Ranking Matrix" to share.

## Features

- **Modern Soft UI**: A professional, clean interface aimed at readability and ease of use using Inter and Poppins typography.
- **Data Ingestion**: Query the AniList database for Anime, Manga, and **Characters**.
- **Character Mode**: Dedicated search with gender filtering (Male/Female) and intuitive visual cards.
- **External DB Sync**: Pull your personal lists (Completed, Watching, Planning, etc.) directly from AniList.
  - **Expanded Filters**: Filter by Format (TV, Movie, OVA, ONA, Special, Manga, Light Novel, One Shot).
  - **Sorting**: Robust sorting options including Score, Year, and Format.
- **Ranking Matrix**: A smooth drag-and-drop interface to order your top entries with clear visual feedback.
- **Visual Output**: Auto-generates a high-quality grid image of your ranking for sharing.
- **Dark Mode**: Fully supported dark theme for all elements, including metadata badges and ranking numbers.
- **Mobile Optimized**: Responsive layout with touch-friendly drag-and-drop and optimized grid views (2-column layout on mobile).
- **Local Persistence**: Your work is saved automatically to local storage.

## Tech Stack

- **Core**: HTML5, JavaScript (ES6+)
- **Styling**: Tailwind CSS (via CDN) with custom Soft UI configuration.
- **Fonts**: Inter (UI), Poppins (Headers)
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
    - **Search**: Use the "Database Search" module to find titles or characters.
    - **Import**: Use "Import List" to load your AniList profile data.
    - **Rank**: Drag items in the center list to reorder.
    - **Export**: Click "Download PNG" to save your grid.

## File Structure

```
AniRanker/
│
├── index.html          # Main interface (Tailwind CDN integrated)
├── style.css           # Custom styles (Scrollbars, Animations, Drag visuals)
├── script.js           # System logic & API handling
└── README.md           # System documentation
```

## Mobile Support

The application is fully responsive with:
- **Sticky Keys**: Search inputs and buttons take full width on mobile for easier tapping.
- **Smart Grid**: Search results display in a readable 2-column grid on small screens.
- **Touch Drag**: Optimized drag-and-drop logic prevents page scrolling while moving items.

## License

Distributed under the MIT License.

## Acknowledgments

- [AniList API](https://anilist.co)
- [Tailwind CSS](https://tailwindcss.com)
- [Font Awesome](https://fontawesome.com)
