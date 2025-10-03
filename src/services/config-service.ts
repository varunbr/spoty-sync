import { AppConfig, PlaylistMapping } from '@/types';

class ConfigService {
  /**
   * Loads the application configuration
   */
  async loadConfig(): Promise<AppConfig> {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) {
        throw new Error('Failed to load configuration');
      }
      return await response.json();
    } catch (error) {
      console.error('Error loading config:', error);
      throw error;
    }
  }

  /**
   * Saves the application configuration
   */
  async saveConfig(config: AppConfig): Promise<void> {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  }

  /**
   * Validates configuration locally
   */
  validateConfig(config: AppConfig): string[] {
    const errors: string[] = [];

    if (!config.spotifyClientId?.trim()) {
      errors.push('Spotify Client ID is required');
    }

    if (!config.redirectUri?.trim()) {
      errors.push('Redirect URI is required');
    } else {
      try {
        const url = new URL(config.redirectUri);
        if (!url.hostname.includes('127.0.0.1') && !url.hostname.includes('localhost')) {
          errors.push('Redirect URI must use localhost or 127.0.0.1');
        }
      } catch {
        errors.push('Invalid redirect URI format');
      }
    }

    if (!config.baseMusicFolder?.trim()) {
      errors.push('Base music folder is required');
    }

    if (config.timeoutMs <= 0) {
      errors.push('Timeout must be greater than 0');
    }

    return errors;
  }

  /**
   * Loads playlist mappings
   */
  async loadMappings(): Promise<PlaylistMapping[]> {
    try {
      const response = await fetch('/api/mappings');
      if (!response.ok) {
        throw new Error('Failed to load mappings');
      }
      const data = await response.json();
      return data.mappings || [];
    } catch (error) {
      console.error('Error loading mappings:', error);
      throw error;
    }
  }

  /**
   * Saves a playlist mapping
   */
  async saveMapping(mapping: PlaylistMapping): Promise<void> {
    try {
      const response = await fetch('/api/mappings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mapping),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save mapping');
      }
    } catch (error) {
      console.error('Error saving mapping:', error);
      throw error;
    }
  }

  /**
   * Deletes a playlist mapping
   */
  async deleteMapping(playlistId: string): Promise<void> {
    try {
      const response = await fetch(`/api/mappings?playlistId=${encodeURIComponent(playlistId)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete mapping');
      }
    } catch (error) {
      console.error('Error deleting mapping:', error);
      throw error;
    }
  }

  /**
   * Validates mapping locally
   */
  validateMapping(mapping: PlaylistMapping): string[] {
    const errors: string[] = [];

    if (!mapping.spotifyPlaylistId?.trim()) {
      errors.push('Spotify Playlist ID is required');
    }

    if (!mapping.spotifyPlaylistName?.trim()) {
      errors.push('Playlist name is required');
    }

    if (!mapping.languageFolderName?.trim()) {
      errors.push('Folder name is required');
    }

    if (!mapping.m3uFileName?.trim()) {
      errors.push('M3U file name is required');
    } else if (!mapping.m3uFileName.toLowerCase().endsWith('.m3u')) {
      errors.push('M3U file name must end with .m3u');
    }

    return errors;
  }

  /**
   * Scans directories for music folders
   */
  async scanMusicDirectories(basePath: string): Promise<any[]> {
    try {
      const response = await fetch(`/api/files/browse?path=${encodeURIComponent(basePath)}`);
      if (!response.ok) {
        throw new Error('Failed to scan directories');
      }
      const data = await response.json();
      return data.directories || [];
    } catch (error) {
      console.error('Error scanning directories:', error);
      throw error;
    }
  }

  /**
   * Scans for MP3 files in a directory
   */
  async scanMp3Files(dirPath: string): Promise<any[]> {
    try {
      const response = await fetch(`/api/files/scan?path=${encodeURIComponent(dirPath)}`);
      if (!response.ok) {
        throw new Error('Failed to scan MP3 files');
      }
      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error('Error scanning MP3 files:', error);
      throw error;
    }
  }

  /**
   * Lists existing M3U files in a directory
   */
  async listM3UFiles(dirPath: string): Promise<any[]> {
    try {
      const response = await fetch(`/api/files/m3u?path=${encodeURIComponent(dirPath)}`);
      if (!response.ok) {
        throw new Error('Failed to list M3U files');
      }
      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error('Error listing M3U files:', error);
      throw error;
    }
  }

  /**
   * Creates an M3U file
   */
  async createM3UFile(filePath: string, content: string): Promise<void> {
    try {
      const response = await fetch('/api/files/m3u', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath, content }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create M3U file');
      }
    } catch (error) {
      console.error('Error creating M3U file:', error);
      throw error;
    }
  }
}

export default new ConfigService();