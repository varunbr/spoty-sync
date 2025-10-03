import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { PlaylistMapping, ValidationError } from '@/types';

const MAPPINGS_FILE_PATH = path.join(process.cwd(), 'data', 'mappings.json');

export async function GET() {
  try {
    await ensureDataDirectory();
    
    let mappings: PlaylistMapping[] = [];
    
    try {
      const mappingsData = await fs.readFile(MAPPINGS_FILE_PATH, 'utf8');
      mappings = JSON.parse(mappingsData);
    } catch (error) {
      // Mappings file doesn't exist or is invalid, return empty array
      mappings = [];
    }
    
    return NextResponse.json({ mappings });
  } catch (error) {
    console.error('Error reading mappings:', error);
    return NextResponse.json(
      { error: 'Failed to read mappings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const newMapping: PlaylistMapping = await request.json();
    
    // Validate the mapping
    const validationErrors = validateMapping(newMapping);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validationErrors },
        { status: 400 }
      );
    }
    
    await ensureDataDirectory();
    
    // Read existing mappings
    let mappings: PlaylistMapping[] = [];
    try {
      const mappingsData = await fs.readFile(MAPPINGS_FILE_PATH, 'utf8');
      mappings = JSON.parse(mappingsData);
    } catch {
      // File doesn't exist, start with empty array
    }
    
    // Check for duplicates
    const existingIndex = mappings.findIndex(m => m.spotifyPlaylistId === newMapping.spotifyPlaylistId);
    if (existingIndex >= 0) {
      // Update existing mapping
      mappings[existingIndex] = newMapping;
    } else {
      // Add new mapping
      mappings.push(newMapping);
    }
    
    // Write back to file
    await fs.writeFile(MAPPINGS_FILE_PATH, JSON.stringify(mappings, null, 2), 'utf8');
    
    return NextResponse.json({ success: true, mapping: newMapping });
  } catch (error) {
    console.error('Error saving mapping:', error);
    return NextResponse.json(
      { error: 'Failed to save mapping' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updatedMapping: PlaylistMapping = await request.json();
    
    // Validate the mapping
    const validationErrors = validateMapping(updatedMapping);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validationErrors },
        { status: 400 }
      );
    }
    
    await ensureDataDirectory();
    
    // Read existing mappings
    let mappings: PlaylistMapping[] = [];
    try {
      const mappingsData = await fs.readFile(MAPPINGS_FILE_PATH, 'utf8');
      mappings = JSON.parse(mappingsData);
    } catch (error) {
      // No mappings file exists
      mappings = [];
    }
    
    // Find and update the mapping
    const mappingIndex = mappings.findIndex(m => m.spotifyPlaylistId === updatedMapping.spotifyPlaylistId);
    if (mappingIndex !== -1) {
      mappings[mappingIndex] = updatedMapping;
    } else {
      return NextResponse.json(
        { error: 'Mapping not found' },
        { status: 404 }
      );
    }
    
    // Write back to file
    await fs.writeFile(MAPPINGS_FILE_PATH, JSON.stringify(mappings, null, 2), 'utf8');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating mapping:', error);
    return NextResponse.json(
      { error: 'Failed to update mapping' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get('playlistId');
    
    if (!playlistId) {
      return NextResponse.json(
        { error: 'Playlist ID is required' },
        { status: 400 }
      );
    }
    
    await ensureDataDirectory();
    
    // Read existing mappings
    let mappings: PlaylistMapping[] = [];
    try {
      const mappingsData = await fs.readFile(MAPPINGS_FILE_PATH, 'utf8');
      mappings = JSON.parse(mappingsData);
    } catch {
      // File doesn't exist, nothing to delete
      return NextResponse.json({ success: true });
    }
    
    // Filter out the mapping to delete
    const filteredMappings = mappings.filter(m => m.spotifyPlaylistId !== playlistId);
    
    // Write back to file
    await fs.writeFile(MAPPINGS_FILE_PATH, JSON.stringify(filteredMappings, null, 2), 'utf8');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting mapping:', error);
    return NextResponse.json(
      { error: 'Failed to delete mapping' },
      { status: 500 }
    );
  }
}

async function ensureDataDirectory() {
  const dataDir = path.dirname(MAPPINGS_FILE_PATH);
  await fs.mkdir(dataDir, { recursive: true });
}

function validateMapping(mapping: PlaylistMapping): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!mapping.spotifyPlaylistId || mapping.spotifyPlaylistId.trim() === '') {
    errors.push({
      field: 'spotifyPlaylistId',
      message: 'Spotify Playlist ID is required'
    });
  }
  
  if (!mapping.spotifyPlaylistName || mapping.spotifyPlaylistName.trim() === '') {
    errors.push({
      field: 'spotifyPlaylistName',
      message: 'Playlist name is required'
    });
  }
  
  if (!mapping.languageFolderName || mapping.languageFolderName.trim() === '') {
    errors.push({
      field: 'languageFolderName',
      message: 'Folder name is required'
    });
  }
  
  if (!mapping.m3uFileName || mapping.m3uFileName.trim() === '') {
    errors.push({
      field: 'm3uFileName',
      message: 'M3U file name is required'
    });
  } else if (!mapping.m3uFileName.toLowerCase().endsWith('.m3u')) {
    errors.push({
      field: 'm3uFileName',
      message: 'M3U file name must end with .m3u'
    });
  }
  
  return errors;
}