import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface MP3File {
  name: string;
  path: string;
  size: number;
  normalizedName: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const dirPath = searchParams.get('path');

  if (!dirPath) {
    return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
  }

  try {
    const mp3Files = await scanForMp3Files(dirPath);
    return NextResponse.json({ files: mp3Files });
  } catch (error) {
    console.error('Error scanning for MP3 files:', error);
    return NextResponse.json(
      { error: 'Failed to scan directory for MP3 files' },
      { status: 500 }
    );
  }
}

async function scanForMp3Files(dirPath: string): Promise<MP3File[]> {
  const mp3Files: MP3File[] = [];

  async function scanDirectory(currentPath: string) {
    try {
      const items = await fs.readdir(currentPath, { withFileTypes: true });

      for (const item of items) {
        const itemPath = path.join(currentPath, item.name);

        if (item.isFile() && item.name.toLowerCase().endsWith('.mp3')) {
          try {
            const stats = await fs.stat(itemPath);
            mp3Files.push({
              name: item.name,
              path: itemPath,
              size: stats.size,
              normalizedName: normalizeFileName(item.name)
            });
          } catch (error) {
            console.warn(`Could not get stats for ${itemPath}:`, error);
          }
        } else if (item.isDirectory()) {
          // Recursively scan subdirectories
          await scanDirectory(itemPath);
        }
      }
    } catch (error) {
      console.warn(`Could not read directory ${currentPath}:`, error);
    }
  }

  await scanDirectory(dirPath);
  return mp3Files;
}

/**
 * Normalizes filename for matching
 */
function normalizeFileName(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/\.mp3$/, '') // Remove .mp3 extension
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}