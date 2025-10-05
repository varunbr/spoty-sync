import { AppConfig } from '@/types';

interface GenerateM3UResult {
  folder: string;
  songsCount: number;
  m3uFile: string;
  totalAppearances: number;
}

interface GenerateM3UResponse {
  success: boolean;
  results: GenerateM3UResult[];
  totalFolders: number;
}

class PlaylistGenerationService {
  /**
   * Generates M3U playlists for all subfolders under baseMusicFolder
   * Songs are ordered by their appearance count in existing playlists (descending)
   */
  async generatePlaylistsFromFolders(): Promise<GenerateM3UResponse> {
    try {
      const baseMusicFolder = await this.getBaseMusicFolder();
      
      const response = await fetch('/api/files/generate-m3u', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseMusicFolder
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}` };
        }
        throw new Error(errorData.error || 'Failed to generate M3U playlists');
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating M3U playlists:', error);
      throw error;
    }
  }

  private async getBaseMusicFolder(): Promise<string> {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) {
        throw new Error('Failed to get configuration');
      }
      const config: AppConfig = await response.json();
      return config.baseMusicFolder;
    } catch (error) {
      console.error('Error getting base music folder:', error);
      throw new Error('Could not retrieve base music folder configuration');
    }
  }

  /**
   * Gets statistics about existing M3U files and folder structure
   */
  async getPlaylistStats(): Promise<{
    totalM3UFiles: number;
    totalFolders: number;
    baseMusicFolder: string;
  }> {
    try {
      const baseMusicFolder = await this.getBaseMusicFolder();
      
      // Get folder count
      const foldersResponse = await fetch(`/api/files/browse?path=${encodeURIComponent(baseMusicFolder)}`);
      if (!foldersResponse.ok) {
        throw new Error('Failed to get folder information');
      }
      const foldersData = await foldersResponse.json();
      const totalFolders = foldersData.directories?.length || 0;

      // Get M3U file count
      const m3uResponse = await fetch(`/api/files/m3u?path=${encodeURIComponent(baseMusicFolder)}`);
      if (!m3uResponse.ok) {
        throw new Error('Failed to get M3U file information');
      }
      const m3uData = await m3uResponse.json();
      const totalM3UFiles = m3uData.files?.length || 0;

      return {
        totalM3UFiles,
        totalFolders,
        baseMusicFolder
      };
    } catch (error) {
      console.error('Error getting playlist stats:', error);
      throw error;
    }
  }
}

export default new PlaylistGenerationService();