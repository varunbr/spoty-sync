import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface DirectoryItem {
  name: string;
  path: string;
  isDirectory: boolean;
  mp3Count?: number;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const dirPath = searchParams.get('path');

  if (!dirPath) {
    return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
  }

  try {
    // Ensure the path exists and is a directory
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      return NextResponse.json({ error: 'Path is not a directory' }, { status: 400 });
    }

    const items = await fs.readdir(dirPath, { withFileTypes: true });
    const directories: DirectoryItem[] = [];

    for (const item of items) {
      if (item.isDirectory()) {
        const itemPath = path.join(dirPath, item.name);
        
        // Count MP3 files in this directory
        let mp3Count = 0;
        try {
          mp3Count = await countMp3Files(itemPath);
        } catch (error) {
          console.warn(`Could not count MP3 files in ${itemPath}:`, error);
        }

        directories.push({
          name: item.name,
          path: itemPath,
          isDirectory: true,
          mp3Count
        });
      }
    }

    // Sort directories by name
    directories.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ directories });
  } catch (error) {
    console.error('Error reading directory:', error);
    return NextResponse.json(
      { error: 'Failed to read directory' },
      { status: 500 }
    );
  }
}

async function countMp3Files(dirPath: string): Promise<number> {
  let count = 0;
  
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      
      if (item.isFile() && item.name.toLowerCase().endsWith('.mp3')) {
        count++;
      } else if (item.isDirectory()) {
        // Recursively count in subdirectories
        count += await countMp3Files(itemPath);
      }
    }
  } catch (error) {
    // If we can't read a directory, just continue
    console.warn(`Could not read directory ${dirPath}:`, error);
  }
  
  return count;
}