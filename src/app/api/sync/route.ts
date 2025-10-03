import { NextRequest, NextResponse } from 'next/server';
import { PlaylistMapping, LocalTrackMatch, SyncResult } from '@/types';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { 
      playlistId, 
      accessToken, 
      mapping, 
      baseMusicFolder 
    }: {
      playlistId: string;
      accessToken: string;
      mapping: PlaylistMapping;
      baseMusicFolder: string;
    } = await request.json();

    if (!playlistId || !accessToken || !mapping || !baseMusicFolder) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

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
    const matches = matchTracksToFiles(allTracks, mp3Files, baseMusicFolder);

    // Generate M3U content
    const m3uContent = generateM3UContent(matches, baseMusicFolder);

    // Create M3U file
    const m3uFilePath = path.join(baseMusicFolder, mapping.m3uFileName);
    
    const createFileResponse = await fetch(`${request.nextUrl.origin}/api/files/m3u`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filePath: m3uFilePath,
        content: m3uContent
      })
    });

    if (!createFileResponse.ok) {
      throw new Error('Failed to create M3U file');
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

function matchTracksToFiles(spotifyTracks: any[], mp3Files: any[], baseMusicFolder: string): LocalTrackMatch[] {
  const matches: LocalTrackMatch[] = [];

  for (const track of spotifyTracks) {
    const match = findBestMatch(track, mp3Files);
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

function findBestMatch(track: any, mp3Files: any[]): { path: string; score: number } | null {
  const normalizedTrack = normalizeTrackInfo(track);
  let bestMatch: { path: string; score: number } | null = null;
  let highestScore = 0;

  for (const file of mp3Files) {
    const score = calculateMatchScore(normalizedTrack, file.normalizedName);
    
    if (score > highestScore && score >= 0.6) { // Minimum 60% match
      highestScore = score;
      bestMatch = { path: file.path, score };
    }
  }

  return bestMatch;
}

function normalizeTrackInfo(track: any): string {
  const artists = track.artists.map((a: any) => a.name).join(' ');
  const trackInfo = `${artists} ${track.name}`;
  
  return trackInfo
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

function calculateMatchScore(normalizedTrack: string, normalizedFilename: string): number {
  const trackWords = normalizedTrack.split(' ').filter(word => word.length > 1);
  const fileWords = normalizedFilename.split(' ').filter(word => word.length > 1);
  
  if (trackWords.length === 0 || fileWords.length === 0) {
    return 0;
  }

  let matchedWords = 0;
  
  for (const trackWord of trackWords) {
    for (const fileWord of fileWords) {
      if (isWordMatch(trackWord, fileWord)) {
        matchedWords++;
        break;
      }
    }
  }

  const score = matchedWords / trackWords.length;
  
  if (normalizedTrack === normalizedFilename) {
    return Math.min(1.0, score + 0.3);
  }
  
  if (normalizedFilename.includes(normalizedTrack) || normalizedTrack.includes(normalizedFilename)) {
    return Math.min(1.0, score + 0.2);
  }
  
  return score;
}

function isWordMatch(word1: string, word2: string): boolean {
  if (word1 === word2) {
    return true;
  }
  
  if (word1.length >= 3 && word2.length >= 3) {
    if (word1.includes(word2) || word2.includes(word1)) {
      return true;
    }
  }
  
  if (Math.abs(word1.length - word2.length) <= 2) {
    const distance = levenshteinDistance(word1, word2);
    const maxLength = Math.max(word1.length, word2.length);
    const similarity = 1 - (distance / maxLength);
    
    return similarity >= 0.8;
  }
  
  return false;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

function generateExpectedFilename(track: any): string {
  const artists = track.artists.map((a: any) => a.name).join(', ');
  const title = track.name;
  
  // Generate a clean filename
  const cleanFilename = `${artists} - ${title}`
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
    .replace(/\s+/g, ' ') // Normalize whitespace
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