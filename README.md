# AniRanker - Modern Curation System

A professional, clean, and highly responsive web application designed for searching, ranking, and organizing your anime and manga lists. AniRanker integrates seamlessly with the AniList database to provide a premium curation experience.

## ✨ Key Features

- **Professional Soft UI**: A state-of-the-art interface utilizing glassmorphism, backdrop blur effects, and a curated color palette for maximum readability.
- **Advanced Data Discovery**: 
    - **Database Search**: Query AniList for Anime, Manga, and Characters.
    - **Character Mode**: Specialized search with gender filtering and intuitive visual cards.
    - **Import System**: Sync your personal lists (Completed, Watching, Planning, etc.) directly from your AniList profile.
- **Flexible Layouts**: Toggle between **Grid** and **List** views across all results and the ranking matrix for personalized workflows.
- **Intelligent Ranking Matrix**: 
    - Smooth Drag-and-Drop functionality for desktop.
    - Long-press touch dragging with live reordering for mobile.
    - Contextual rank badges and manual reordering controls.
- **Adaptive Grid Output**: Automatically syncs your ranking to a clean gallery view. Features toggleable rank numbers and high-quality PNG download via `html2canvas`.
- **Full Dark Mode**: Robust dark theme support with persistence across sessions.
- **Mobile First**: Fully responsive architecture with touch-optimized interactions and adaptive grid scaling.
- **Local Persistence**: All ranking progress is automatically saved to your browser's local storage.

## 🏗️ UI Structure

AniRanker's interface is logically organized into four primary zones:

1.  **Header**: Branding and system-wide theme toggling.
2.  **Discovery (Tabs)**: Dual-purpose area for searching the global database or importing your personal collection.
3.  **Ranking Matrix**: Your active workspace where items are added, removed, and ordered.
4.  **Grid Output**: Visual preview and export area for sharing your final curation.

## 🛠️ Tech Stack

- **Core**: HTML5, Vanilla JavaScript (ES6+), CSS3
- **Styling**: Tailwind CSS (Tailored Soft UI configuration)
- **API**: AniList GraphQL API
- **Export**: html2canvas
- **Typography**: Inter (UI), Poppins (Display)
- **Icons**: Font Awesome 6.4.0

## 🚀 Installation & Setup

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/motsouzumaki/AniRanker.git
    cd AniRanker
    ```

2.  **Launch**:
    Open `index.html` in any modern web browser. No installation or build steps required.

## 📑 Usage Guide

- **Populate**: Search for titles or import your AniList profile. Click "Add" on any card to move it to your ranking.
- **Organize**: In the **Ranking Matrix**, drag items to your desired position. Use the layout toggle (grid/list) to switch between a dense overview or a detail-rich list.
- **Export**: Once satisfied, head to the **Grid Output** section, choose whether to show rank numbers, and click **Download PNG**.

## 📱 Mobile Experience

- **Optimized Grids**: Results scale intelligently from 2 columns on phones to 10+ columns on ultrawide monitors.
- **Touch-safe UI**: Large hit targets and a dedicated mobile-optimized drag-and-drop system that prevents accidental page scrolls.

## 📄 License

Distributed under the MIT License.

## 🙏 Acknowledgments

- **[AniList API](https://anilist.co)** - Powering the global database.
- **[Tailwind CSS](https://tailwindcss.com)** - Modern utility-first styling.
- **[Font Awesome](https://fontawesome.com)** - Comprehensive icon set.
