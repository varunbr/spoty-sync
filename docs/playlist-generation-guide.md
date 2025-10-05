# Folder-Based Playlist Generation - Usage Guide

## Overview
This feature automatically creates M3U playlist files based on your music folder structure, with songs ordered by their popularity (how often they appear in existing playlists).

## Prerequisites
1. **Organized Music Folders**: Your music should be organized in subfolders under your base music directory
2. **Base Music Folder Configured**: Set your base music folder path in the application settings
3. **Existing M3U Files** (optional): Having existing playlists helps with popularity-based ordering

## Step-by-Step Usage

### 1. Prepare Your Music Structure
Organize your music in subfolders under your base music directory:
```
E:\Music\                    ← Base Music Folder
├── English\
│   ├── Artist1 - Song1.mp3
│   ├── Artist2 - Song2.mp3
│   └── subfolder\
│       └── Song3.mp3        ← Scans recursively
├── Hindi\
│   ├── Song4.mp3
│   └── Song5.mp3
├── Rock\
│   └── Song6.mp3
└── existing_playlist.m3u    ← Analyzed for song counts
```

### 2. Access the Feature
1. Open the SpotifySync application
2. Ensure your base music folder is configured (Settings → Base Music Folder)
3. Click the **"Generate Playlists"** button in the main interface

### 3. Review and Generate
1. **Preview Screen**: Shows current folder structure and existing M3U files
2. **Statistics**: Displays total folders found and existing M3U files
3. **Generate**: Click "Generate" to create playlist files for all folders

### 4. Results
The feature will create:
- `English.m3u` - containing all songs from the English folder
- `Hindi.m3u` - containing all songs from the Hindi folder  
- `Rock.m3u` - containing all songs from the Rock folder

## How Song Ordering Works

### Popularity Analysis
1. **Scan Existing Playlists**: Reads all existing M3U files in your base folder
2. **Count Appearances**: Tracks how many times each song appears across all playlists
3. **Order by Popularity**: Songs that appear more frequently are placed first

### Example Ordering
If `song1.mp3` appears in 3 existing playlists and `song2.mp3` appears in 1 playlist:
```m3u
#EXTM3U
#EXTINF:-1,song1.mp3 (appeared 3 times)
English/song1.mp3
#EXTINF:-1,song2.mp3 (appeared 1 times)  
English/song2.mp3
#EXTINF:-1,song3.mp3 (appeared 0 times)
English/song3.mp3
```

## Advanced Features

### Recursive Folder Scanning
- Scans all subfolders within each main folder
- Includes MP3 files from nested directories
- Maintains relative path structure in playlists

### Smart Duplicate Handling
- Won't create playlists for empty folders
- Handles special characters in folder/file names
- Maintains consistency with existing M3U format

### Error Handling
- Continues processing even if individual folders fail
- Provides detailed feedback on successful/failed operations
- Validates folder accessibility before processing

## File Output Format

Generated M3U files follow standard format:
```m3u
#EXTM3U
#EXTINF:-1,filename.mp3 (appeared X times)
relative/path/to/file.mp3
#EXTINF:-1,another_song.mp3 (appeared Y times)
relative/path/to/another_song.mp3
```

## Tips for Best Results

1. **Organize Before Generating**: Structure your music logically in folders
2. **Keep Existing Playlists**: More existing M3U files = better popularity analysis
3. **Use Descriptive Folder Names**: Folder names become playlist file names
4. **Regular Updates**: Re-run generation after adding new music or playlists

## Troubleshooting

### No Playlists Generated
- Check base music folder path is correct
- Ensure folders contain MP3 files
- Verify folder permissions allow file creation

### Missing Songs in Playlists
- Check if MP3 files have correct extensions (.mp3)
- Verify files aren't in system/hidden folders
- Ensure no special permissions prevent file access

### Incorrect Song Ordering
- Verify existing M3U files are in correct format
- Check that relative paths in existing playlists match current structure
- Re-run generation after organizing existing playlists

## Technical Details

- **File Format**: Standard M3U playlist format
- **Path Type**: Relative paths from base music folder
- **Encoding**: UTF-8 text files
- **Compatibility**: Works with most media players that support M3U