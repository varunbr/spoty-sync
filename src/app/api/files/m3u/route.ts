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