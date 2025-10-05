import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface SongCount {
  filePath: string;
  fileName: string;
  count: number;
}

interface M3UTrack {
  extinf?: string;
  filePath: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { baseMusicFolder } = body;

    if (!baseMusicFolder) {
      return NextResponse.json(
        { error: 'Base music folder is required' },
        { status: 400 }
      );
    }

    // Validate that the base music folder exists
    try {
      await fs.access(baseMusicFolder);
    } catch (error) {
      return NextResponse.json(
        { error: 'Base music folder does not exist or is not accessible' },
        { status: 400 }
      );
    }

    // Read all existing M3U files and count song appearances
    const songCounts = await countSongAppearances(baseMusicFolder);

    // Get all subfolders
    const subfolders = await getSubfolders(baseMusicFolder);

    if (subfolders.length === 0) {
      return NextResponse.json(
        { error: 'No subfolders found in the base music directory' },
        { status: 400 }
      );
    }

    const results = [];

    for (const subfolder of subfolders) {
      const folderPath = path.join(baseMusicFolder, subfolder);
      
      // Get all MP3 files in this subfolder
      const mp3Files = await getMp3FilesInFolder(folderPath);
      
      // Skip empty folders
      if (mp3Files.length === 0) {
        continue;
      }
      
      // Create playlist entries with counts
      const playlistEntries: SongCount[] = [];
      
      for (const mp3File of mp3Files) {
        const relativePath = path.relative(baseMusicFolder, mp3File.path);
        const normalizedPath = relativePath.replace(/\\/g, '/');
        
        // Find count for this song
        const count = songCounts.get(normalizedPath) || 0;
        
        playlistEntries.push({
          filePath: normalizedPath,
          fileName: mp3File.name,
          count: count
        });
      }

      // Sort by count (descending) then by filename (ascending)
      playlistEntries.sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return a.fileName.localeCompare(b.fileName);
      });

      // Generate M3U content
      const m3uContent = generateM3UContent(playlistEntries);
      
      // Write M3U file
      const m3uFileName = `${subfolder}.m3u`;
      const m3uFilePath = path.join(baseMusicFolder, m3uFileName);
      
      try {
        await fs.writeFile(m3uFilePath, m3uContent, 'utf8');
        
        results.push({
          folder: subfolder,
          songsCount: playlistEntries.length,
          m3uFile: m3uFileName,
          totalAppearances: playlistEntries.reduce((sum, entry) => sum + entry.count, 0)
        });
      } catch (error) {
        console.error(`Failed to write M3U file for folder ${subfolder}:`, error);
        // Continue with other folders even if one fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      results,
      totalFolders: subfolders.length 
    });

  } catch (error) {
    console.error('Error generating M3U files:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate M3U files' },
      { status: 500 }
    );
  }
}

async function countSongAppearances(baseMusicFolder: string): Promise<Map<string, number>> {
  const songCounts = new Map<string, number>();

  try {
    // Read all M3U files in the base folder
    const items = await fs.readdir(baseMusicFolder, { withFileTypes: true });
    const m3uFiles = items
      .filter(item => item.isFile() && item.name.toLowerCase().endsWith('.m3u'))
      .map(item => path.join(baseMusicFolder, item.name));

    for (const m3uFilePath of m3uFiles) {
      try {
        const content = await fs.readFile(m3uFilePath, 'utf8');
        const tracks = parseM3UContent(content);
        
        for (const track of tracks) {
          // Normalize path separators
          const normalizedPath = track.filePath.replace(/\\/g, '/');
          const currentCount = songCounts.get(normalizedPath) || 0;
          songCounts.set(normalizedPath, currentCount + 1);
        }
      } catch (error) {
        console.warn(`Could not read M3U file ${m3uFilePath}:`, error);
      }
    }
  } catch (error) {
    console.warn('Could not read base music folder:', error);
  }

  return songCounts;
}

async function getSubfolders(baseMusicFolder: string): Promise<string[]> {
  try {
    const items = await fs.readdir(baseMusicFolder, { withFileTypes: true });
    return items
      .filter(item => item.isDirectory())
      .map(item => item.name);
  } catch (error) {
    console.error('Error reading subfolders:', error);
    return [];
  }
}

interface Mp3File {
  name: string;
  path: string;
}

async function getMp3FilesInFolder(folderPath: string): Promise<Mp3File[]> {
  const mp3Files: Mp3File[] = [];

  try {
    await scanDirectoryForMp3(folderPath, mp3Files);
  } catch (error) {
    console.warn(`Could not scan folder ${folderPath}:`, error);
  }

  return mp3Files;
}

async function scanDirectoryForMp3(dirPath: string, mp3Files: Mp3File[]): Promise<void> {
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);

      if (item.isFile() && item.name.toLowerCase().endsWith('.mp3')) {
        mp3Files.push({
          name: item.name,
          path: itemPath
        });
      } else if (item.isDirectory()) {
        // Recursively scan subdirectories
        await scanDirectoryForMp3(itemPath, mp3Files);
      }
    }
  } catch (error) {
    console.warn(`Could not read directory ${dirPath}:`, error);
  }
}

function parseM3UContent(content: string): M3UTrack[] {
  const tracks: M3UTrack[] = [];
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);

  let currentExtinf: string | undefined;

  for (const line of lines) {
    if (line.startsWith('#EXTM3U')) {
      // Skip header
      continue;
    } else if (line.startsWith('#EXTINF:')) {
      // Store EXTINF line for next track
      currentExtinf = line;
    } else if (line.startsWith('#')) {
      // Skip other comments
      continue;
    } else if (line) {
      // This is a file path
      tracks.push({
        extinf: currentExtinf,
        filePath: line
      });
      currentExtinf = undefined; // Reset for next track
    }
  }

  return tracks;
}

function generateM3UContent(entries: SongCount[]): string {
  const lines = ['#EXTM3U'];
  
  for (const entry of entries) {
    // Add comment with count information
    lines.push(`#EXTINF:-1,${entry.fileName} (appeared ${entry.count} times)`);
    lines.push(entry.filePath);
  }
  
  return lines.join('\n');
}