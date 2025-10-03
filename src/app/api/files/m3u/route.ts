import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filePath, content } = body;

    if (!filePath || content === undefined) {
      return NextResponse.json(
        { error: 'File path and content are required' },
        { status: 400 }
      );
    }

    // Ensure the directory exists
    const directory = path.dirname(filePath);
    await fs.mkdir(directory, { recursive: true });

    // Write the M3U file
    await fs.writeFile(filePath, content, 'utf8');

    return NextResponse.json({ success: true, path: filePath });
  } catch (error) {
    console.error('Error creating M3U file:', error);
    return NextResponse.json(
      { error: 'Failed to create M3U file' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const dirPath = searchParams.get('path');

  if (!dirPath) {
    return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
  }

  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    const m3uFiles = items
      .filter(item => item.isFile() && item.name.toLowerCase().endsWith('.m3u'))
      .map(item => ({
        name: item.name,
        path: path.join(dirPath, item.name)
      }));

    return NextResponse.json({ files: m3uFiles });
  } catch (error) {
    console.error('Error listing M3U files:', error);
    return NextResponse.json(
      { error: 'Failed to list M3U files' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { filePath, newContent, mergeMode = true } = body;

    if (!filePath || newContent === undefined) {
      return NextResponse.json(
        { error: 'File path and new content are required' },
        { status: 400 }
      );
    }

    let finalContent = newContent;

    if (mergeMode) {
      // Check if file exists and read existing content
      let existingContent = '';
      try {
        existingContent = await fs.readFile(filePath, 'utf8');
      } catch (error) {
        // File doesn't exist, will create new one
      }

      // Merge existing and new content
      finalContent = mergeM3UContent(existingContent, newContent);
    }

    // Ensure the directory exists
    const directory = path.dirname(filePath);
    await fs.mkdir(directory, { recursive: true });

    // Write the merged M3U file
    await fs.writeFile(filePath, finalContent, 'utf8');

    return NextResponse.json({ success: true, path: filePath, merged: mergeMode });
  } catch (error) {
    console.error('Error updating M3U file:', error);
    return NextResponse.json(
      { error: 'Failed to update M3U file' },
      { status: 500 }
    );
  }
}

function mergeM3UContent(existingContent: string, newContent: string): string {
  // Parse existing M3U content
  const existingTracks = parseM3UContent(existingContent);
  const newTracks = parseM3UContent(newContent);

  // Create a map to track existing tracks by file path to avoid duplicates
  const trackMap = new Map<string, M3UTrack>();

  // Add existing tracks
  for (const track of existingTracks) {
    trackMap.set(track.filePath, track);
  }

  // Add new tracks (will overwrite if same file path)
  for (const track of newTracks) {
    trackMap.set(track.filePath, track);
  }

  // Generate merged M3U content
  const lines = ['#EXTM3U'];
  
  for (const track of trackMap.values()) {
    if (track.extinf) {
      lines.push(track.extinf);
    }
    lines.push(track.filePath);
  }

  return lines.join('\n');
}

interface M3UTrack {
  extinf?: string;
  filePath: string;
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