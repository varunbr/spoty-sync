import { NextRequest, NextResponse } from 'next/server';
import { PlaylistMapping, LocalTrackMatch, SyncResult, MatchingConfig } from '@/types';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { 
      playlistId, 
      accessToken, 
      mapping, 
      baseMusicFolder,
      matchingConfig
    }: {
      playlistId: string;
      accessToken: string;
      mapping: PlaylistMapping;
      baseMusicFolder: string;
      matchingConfig?: MatchingConfig;
    } = await request.json();

    if (!playlistId || !accessToken || !mapping || !baseMusicFolder) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Use provided matching config or defaults
    const config: MatchingConfig = {
      caseSensitive: false,
      removeSpecialChars: true,
      normalizeWhitespace: true,
      ...matchingConfig
    };

    // Fetch playlist tracks from Spotify
    const tracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&fields=items(track(id,name,artists(id,name),album(id,name,artists(id,name),images,release_date),duration_ms,explicit,popularity,preview_url)),next,total`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!tracksResponse.ok) {
      throw new Error('Failed to fetch playlist tracks');
    }

    let allTracks = [];
    let tracksData = await tracksResponse.json();

    // Handle pagination
    allTracks.push(...tracksData.items.map((item: any) => item.track).filter((track: any) => track && track.type !== 'episode'));

    while (tracksData.next) {
      const nextResponse = await fetch(tracksData.next, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (nextResponse.ok) {
        tracksData = await nextResponse.json();
        allTracks.push(...tracksData.items.map((item: any) => item.track).filter((track: any) => track && track.type !== 'episode'));
      } else {
        break;
      }
    }

    // Scan for MP3 files in the language folder
    const languageFolderPath = path.join(baseMusicFolder, mapping.languageFolderName);
    
    const scanResponse = await fetch(`${request.nextUrl.origin}/api/files/scan?path=${encodeURIComponent(languageFolderPath)}`);
    if (!scanResponse.ok) {
      throw new Error('Failed to scan music folder');
    }
    
    const { files: mp3Files } = await scanResponse.json();

    // Match tracks with local files
    const matches = matchTracksToFiles(allTracks, mp3Files, baseMusicFolder, config);

    // Generate M3U content for new tracks
    const newM3uContent = generateM3UContent(matches, baseMusicFolder);

    // Merge with existing M3U file (preserving existing tracks, adding only new ones)
    const m3uFilePath = path.join(baseMusicFolder, mapping.m3uFileName);
    
    const mergeFileResponse = await fetch(`${request.nextUrl.origin}/api/files/m3u`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filePath: m3uFilePath,
        newContent: newM3uContent,
        mergeMode: true
      })
    });

    if (!mergeFileResponse.ok) {
      throw new Error('Failed to merge M3U file');
    }

    // Create sync result
    const syncResult: SyncResult = {
      playlistId,
      playlistName: mapping.spotifyPlaylistName,
      totalTracks: allTracks.length,
      matchedTracks: matches.filter(m => m.isMatched).length,
      unmatchedTracks: matches.filter(m => !m.isMatched),
      m3uFilePath,
      syncedAt: new Date()
    };

    return NextResponse.json({ success: true, result: syncResult });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

function matchTracksToFiles(spotifyTracks: any[], mp3Files: any[], baseMusicFolder: string, config: MatchingConfig): LocalTrackMatch[] {
  const matches: LocalTrackMatch[] = [];

  for (const track of spotifyTracks) {
    const match = findBestMatch(track, mp3Files, config);
    const expectedFilename = generateExpectedFilename(track);
    const spotifyUrl = `https://open.spotify.com/track/${track.id}`;
    
    matches.push({
      spotifyTrack: track,
      localFilePath: match?.path,
      isMatched: !!match,
      matchScore: match?.score,
      expectedFilename,
      spotifyUrl
    });
  }

  return matches;
}

function findBestMatch(track: any, mp3Files: any[], config: MatchingConfig): { path: string; score: number } | null {
  const normalizedTrack = normalizeTrackInfo(track, config);

  for (const file of mp3Files) {
    const normalizedFileName = normalizeFileName(file.name, config);
    
    // Simple exact match after normalization
    if (normalizedTrack === normalizedFileName) {
      return { path: file.path, score: 1.0 };
    }
    
    // Check if track info is contained in filename or vice versa
    if (normalizedFileName.includes(normalizedTrack) || normalizedTrack.includes(normalizedFileName)) {
      return { path: file.path, score: 0.8 };
    }
  }

  return null;
}

function normalizeTrackInfo(track: any, config: MatchingConfig): string {
  const artists = track.artists.map((a: any) => a.name).join(' ');
  const trackInfo = `${artists} ${track.name}`;
  
  return normalizeString(trackInfo, config);
}

function normalizeFileName(fileName: string, config: MatchingConfig): string {
  // Remove file extension
  const nameWithoutExt = fileName.replace(/\.(mp3|flac|wav|m4a|aac)$/i, '');
  return normalizeString(nameWithoutExt, config);
}

function normalizeString(text: string, config: MatchingConfig): string {
  let normalized = config.caseSensitive ? text : text.toLowerCase();
  
  if (config.removeSpecialChars) {
    normalized = normalized.replace(/[^\w\s]/g, ''); // Remove special characters
  }
  
  if (config.normalizeWhitespace) {
    normalized = normalized.replace(/\s+/g, ' '); // Normalize whitespace
  }
  
  return normalized.trim();
}

function generateExpectedFilename(track: any): string {
  const artists = track.artists.map((a: any) => a.name).join(', ');
  const title = track.name;
  
  // Generate a clean filename
  const cleanFilename = `${title}`
    .replace(/[<>:"/\\|?*]/g, '-') // Remove invalid filename characters
    //.replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  return `${cleanFilename}.mp3`;
}

function generateM3UContent(matches: LocalTrackMatch[], baseMusicFolder: string): string {
  const lines = ['#EXTM3U'];
  
  for (const match of matches) {
    if (match.isMatched && match.localFilePath) {
      let filePath = match.localFilePath;
      
      // Convert to relative path from base music folder
      const normalizedBase = baseMusicFolder.replace(/\\/g, '/').replace(/\/$/, '');
      const normalizedFull = filePath.replace(/\\/g, '/');
      
      if (normalizedFull.startsWith(normalizedBase)) {
        filePath = normalizedFull.substring(normalizedBase.length + 1);
      }
      
      // Add extended info line
      const duration = Math.round((match.spotifyTrack.duration_ms || 0) / 1000);
      const artists = match.spotifyTrack.artists.map((a: any) => a.name).join(', ');
      const title = match.spotifyTrack.name;
      
      lines.push(`#EXTINF:${duration},${artists} - ${title}`);
      lines.push(filePath);
    }
  }
  
  return lines.join('\n');
}