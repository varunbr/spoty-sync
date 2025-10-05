# SpotifySync

A Next.js application that synchronizes Spotify playlists with local music files and generates M3U playlists based on your music folder structure.

## Features

### Core Features
- **Spotify Integration**: Authenticate with Spotify and access your playlists
- **Music File Matching**: Match Spotify tracks with local MP3 files using intelligent algorithms
- **M3U Playlist Generation**: Create M3U playlist files from Spotify playlists
- **Playlist Synchronization**: Keep your local playlists in sync with Spotify

### New Feature: Folder-Based Playlist Generation
Generate M3U playlist files automatically based on your music folder structure:

- **Automatic Discovery**: Scans all subfolders under your base music directory
- **Smart Ordering**: Orders songs by their popularity (frequency of appearance in existing playlists)
- **Comprehensive Analysis**: Analyzes all existing M3U files to count song appearances
- **One-Click Generation**: Creates playlist files for all folders with a single action

#### How Folder-Based Generation Works:
1. **Scan Existing Playlists**: Reads all M3U files in your base music folder to count how often each song appears
2. **Discover Music Folders**: Identifies all subfolders containing MP3 files
3. **Create Folder Playlists**: For each subfolder (e.g., "English", "Rock", "Classical"):
   - Scans for all MP3 files recursively
   - Orders songs by popularity (most frequently appearing in existing playlists first)
   - Creates a new M3U file named after the folder (e.g., "English.m3u")

#### Example:
If you have a folder structure like:
```
E:\Music\
├── English\
│   ├── song1.mp3
│   └── song2.mp3
├── Hindi\
│   ├── song3.mp3
│   └── song4.mp3
└── existing_playlist.m3u
```

The feature will create:
- `English.m3u` - containing song1.mp3 and song2.mp3, ordered by popularity
- `Hindi.m3u` - containing song3.mp3 and song4.mp3, ordered by popularity

## Getting Started

### Prerequisites
- Node.js 18+ installed
- A Spotify Developer account and app credentials
- Local music files organized in folders

### Installation

1. Clone the repository:
```bash
git clone https://github.com/varunbr/spoty-sync.git
cd spoty-sync
```

2. Install dependencies:
```bash
npm install
```

3. Set up your Spotify app:
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create a new app
   - Add `http://localhost:3000/callback` to redirect URIs

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Configuration

1. **Initial Setup**: Click the settings icon to configure:
   - Spotify Client ID
   - Base Music Folder path
   - Matching preferences (case sensitivity, special characters, etc.)

2. **Spotify Authentication**: Authenticate with your Spotify account

3. **Create Mappings**: Map Spotify playlists to local music folders

## Usage

### Standard Playlist Sync
1. Click "Add Mapping" to create a new playlist mapping
2. Select a Spotify playlist
3. Choose the corresponding local music folder
4. Specify the M3U filename
5. Click "Sync" to generate the playlist

### Folder-Based Playlist Generation
1. Ensure your music is organized in subfolders under the base music directory
2. Click "Generate Playlists" button
3. Review the folder structure and existing M3U files
4. Click "Generate" to create playlist files for all folders
5. Each subfolder will get its own M3U playlist file

## File Structure

```
src/
├── app/
│   ├── api/                    # API routes
│   │   ├── files/
│   │   │   ├── generate-m3u/   # New: Folder-based playlist generation
│   │   │   ├── m3u/            # M3U file operations
│   │   │   ├── browse/         # File system browsing
│   │   │   └── scan/           # MP3 file scanning
│   │   ├── spotify/            # Spotify API integration
│   │   └── sync/               # Playlist synchronization
│   └── page.tsx                # Main application page
├── components/
│   ├── PlaylistGenerationModal.tsx  # New: Folder-based generation UI
│   ├── SpotifySync.tsx         # Main application component
│   └── ui/                     # Reusable UI components
├── services/
│   ├── playlist-generation.ts  # New: Playlist generation service
│   ├── spotify-api.ts          # Spotify API wrapper
│   └── config-service.ts       # Configuration management
└── types/
    └── index.ts                # TypeScript type definitions
```

## API Endpoints

### New Endpoints
- `POST /api/files/generate-m3u` - Generate M3U files for all subfolders

### Existing Endpoints
- `GET/POST /api/config` - Configuration management
- `GET/POST/PUT /api/files/m3u` - M3U file operations
- `GET /api/files/browse` - Browse file system
- `GET /api/files/scan` - Scan for MP3 files
- `GET/POST/DELETE /api/mappings` - Playlist mappings
- `POST /api/spotify/token` - Spotify authentication
- `POST /api/sync` - Sync playlists

## Development

This project is built with:
- [Next.js 15](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide React](https://lucide.dev/) - Icons

### Build for Production

```bash
npm run build
```

### Lint Code

```bash
npm run lint
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.