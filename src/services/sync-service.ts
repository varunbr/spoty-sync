import { PlaylistMapping, SyncResult, MatchingConfig } from '@/types';

class SyncService {
  /**
   * Syncs a single playlist mapping
   */
  async syncPlaylist(
    mapping: PlaylistMapping,
    accessToken: string,
    baseMusicFolder: string,
    matchingConfig?: MatchingConfig,
    onProgress?: (step: string, progress: number) => void
  ): Promise<SyncResult> {
    try {
      if (onProgress) onProgress('Starting sync...', 0);

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playlistId: mapping.spotifyPlaylistId,
          accessToken,
          mapping,
          baseMusicFolder,
          matchingConfig
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
      }

      if (onProgress) onProgress('Sync completed', 100);

      const { result } = await response.json();
      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  }

  /**
   * Syncs multiple playlist mappings
   */
  async syncAllPlaylists(
    mappings: PlaylistMapping[],
    accessToken: string,
    baseMusicFolder: string,
    matchingConfig?: MatchingConfig,
    onProgress?: (current: number, total: number, currentPlaylist: string) => void
  ): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    
    for (let i = 0; i < mappings.length; i++) {
      const mapping = mappings[i];
      
      if (onProgress) {
        onProgress(i + 1, mappings.length, mapping.spotifyPlaylistName);
      }

      try {
        const result = await this.syncPlaylist(mapping, accessToken, baseMusicFolder, matchingConfig);
        results.push(result);
      } catch (error) {
        console.error(`Failed to sync ${mapping.spotifyPlaylistName}:`, error);
        // Continue with other playlists even if one fails
        results.push({
          playlistId: mapping.spotifyPlaylistId,
          playlistName: mapping.spotifyPlaylistName,
          totalTracks: 0,
          matchedTracks: 0,
          unmatchedTracks: [],
          m3uFilePath: '',
          syncedAt: new Date()
        });
      }
    }

    return results;
  }

  /**
   * Generates and downloads a sync report
   */
  generateSyncReport(results: SyncResult[]): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    let html = `
<!DOCTYPE html>
<html>
<head>
    <title>Spotify Sync Report - ${timestamp}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #1db954; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; color: #1db954; }
        .playlist { margin-bottom: 30px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
        .playlist-header { background: #f8f9fa; padding: 15px; font-weight: bold; }
        .playlist-content { padding: 15px; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .error { color: #dc3545; }
        .track-list { max-height: 200px; overflow-y: auto; }
        .track { padding: 5px 0; border-bottom: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Spotify Sync Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
    </div>

    <div class="summary">
        <div class="stat-card">
            <div class="stat-number">${results.length}</div>
            <div>Playlists Synced</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${results.reduce((sum, r) => sum + r.totalTracks, 0)}</div>
            <div>Total Tracks</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${results.reduce((sum, r) => sum + r.matchedTracks, 0)}</div>
            <div>Matched Tracks</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${Math.round(
              (results.reduce((sum, r) => sum + r.matchedTracks, 0) / 
               results.reduce((sum, r) => sum + r.totalTracks, 0)) * 100
            )}%</div>
            <div>Match Rate</div>
        </div>
    </div>
`;

    results.forEach(result => {
      const matchRate = result.totalTracks > 0 ? (result.matchedTracks / result.totalTracks) * 100 : 0;
      const statusClass = matchRate >= 80 ? 'success' : matchRate >= 50 ? 'warning' : 'error';

      html += `
    <div class="playlist">
        <div class="playlist-header">
            <span class="${statusClass}">${result.playlistName}</span>
            <span style="float: right;">${result.matchedTracks}/${result.totalTracks} tracks (${Math.round(matchRate)}%)</span>
        </div>
        <div class="playlist-content">
            <p><strong>M3U File:</strong> ${result.m3uFilePath}</p>
            <p><strong>Synced At:</strong> ${result.syncedAt.toLocaleString()}</p>
            
            ${result.unmatchedTracks.length > 0 ? `
            <h4>Unmatched Tracks (${result.unmatchedTracks.length}):</h4>
            <div class="track-list">
                ${result.unmatchedTracks.map(track => `
                <div class="track">
                    <strong>${track.spotifyTrack.artists.map((a: any) => a.name).join(', ')} - ${track.spotifyTrack.name}</strong>
                    <br><small style="color: #666;">Expected filename: ${track.expectedFilename || 'N/A'}</small>
                    <br><small><a href="${track.spotifyUrl || '#'}" target="_blank" style="color: #1db954;">🎵 Listen on Spotify</a></small>
                </div>
                `).join('')}
            </div>
            ` : '<p class="success">All tracks matched! 🎉</p>'}
        </div>
    </div>
`;
    });

    html += `
</body>
</html>`;

    return html;
  }

  /**
   * Downloads sync report as HTML file
   */
  downloadSyncReport(results: SyncResult[]) {
    const html = this.generateSyncReport(results);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `spotify-sync-report-${timestamp}.html`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export default new SyncService();