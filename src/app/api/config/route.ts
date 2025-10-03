import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { AppConfig, ValidationError } from '@/types';

const CONFIG_FILE_PATH = path.join(process.cwd(), 'data', 'config.json');

const DEFAULT_CONFIG: AppConfig = {
  spotifyClientId: '',
  spotifyClientSecret: '',
  redirectUri: 'http://127.0.0.1:3000/callback',
  timeoutMs: 60000,
  baseMusicFolder: ''
};

export async function GET() {
  try {
    await ensureDataDirectory();
    
    let config: AppConfig;
    
    try {
      const configData = await fs.readFile(CONFIG_FILE_PATH, 'utf8');
      config = { ...DEFAULT_CONFIG, ...JSON.parse(configData) };
    } catch (error) {
      // Config file doesn't exist or is invalid, return default
      config = DEFAULT_CONFIG;
    }
    
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error reading config:', error);
    return NextResponse.json(
      { error: 'Failed to read configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const newConfig: AppConfig = await request.json();
    
    // Validate the configuration
    const validationErrors = validateConfig(newConfig);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validationErrors },
        { status: 400 }
      );
    }
    
    await ensureDataDirectory();
    
    // Write the configuration
    await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(newConfig, null, 2), 'utf8');
    
    return NextResponse.json({ success: true, config: newConfig });
  } catch (error) {
    console.error('Error saving config:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}

async function ensureDataDirectory() {
  const dataDir = path.dirname(CONFIG_FILE_PATH);
  await fs.mkdir(dataDir, { recursive: true });
}

function validateConfig(config: AppConfig): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!config.spotifyClientId || config.spotifyClientId.trim() === '') {
    errors.push({
      field: 'spotifyClientId',
      message: 'Spotify Client ID is required'
    });
  }

  if (!config.spotifyClientSecret || config.spotifyClientSecret.trim() === '') {
    errors.push({
      field: 'spotifyClientSecret',
      message: 'Spotify Client Secret is required'
    });
  }
  
  if (!config.redirectUri || config.redirectUri.trim() === '') {
    errors.push({
      field: 'redirectUri',
      message: 'Redirect URI is required'
    });
  } else {
    try {
      const url = new URL(config.redirectUri);
      if (!url.hostname.includes('127.0.0.1') && !url.hostname.includes('localhost')) {
        errors.push({
          field: 'redirectUri',
          message: 'Redirect URI must use localhost or 127.0.0.1 for security'
        });
      }
    } catch {
      errors.push({
        field: 'redirectUri',
        message: 'Invalid redirect URI format'
      });
    }
  }
  
  if (!config.baseMusicFolder || config.baseMusicFolder.trim() === '') {
    errors.push({
      field: 'baseMusicFolder',
      message: 'Base music folder is required'
    });
  }
  
  if (config.timeoutMs <= 0) {
    errors.push({
      field: 'timeoutMs',
      message: 'Timeout must be greater than 0'
    });
  }
  
  return errors;
}