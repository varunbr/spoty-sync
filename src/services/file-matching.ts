import { SpotifyTrack, LocalTrackMatch, SyncResult } from '@/types';

interface MP3File {
  name: string;
  path: string;
  size: number;
  normalizedName: string;
}

class FileMatchingService {
  /**
   * Matches Spotify tracks to local MP3 files
   */
  async matchTracks(
    spotifyTracks: SpotifyTrack[],
    mp3Files: MP3File[],
    baseMusicFolder: string
  ): Promise<LocalTrackMatch[]> {
    const matches: LocalTrackMatch[] = [];

    for (const track of spotifyTracks) {
      const match = this.findBestMatch(track, mp3Files);
      matches.push({
        spotifyTrack: track,
        localFilePath: match?.path,
        isMatched: !!match,
        matchScore: match?.score
      });
    }

    return matches;
  }

  /**
   * Finds the best matching local file for a Spotify track
   */
  private findBestMatch(track: SpotifyTrack, mp3Files: MP3File[]): { path: string; score: number } | null {
    const normalizedTrack = this.normalizeTrackInfo(track);
    let bestMatch: { path: string; score: number } | null = null;
    let highestScore = 0;

    for (const file of mp3Files) {
      const score = this.calculateMatchScore(normalizedTrack, file.normalizedName);
      
      if (score > highestScore && score >= 0.6) { // Minimum 60% match
        highestScore = score;
        bestMatch = { path: file.path, score };
      }
    }

    return bestMatch;
  }

  /**
   * Normalizes Spotify track information for matching
   */
  private normalizeTrackInfo(track: SpotifyTrack): string {
    const artists = track.artists.map(a => a.name).join(' ');
    const trackInfo = `${artists} ${track.name}`;
    
    return trackInfo
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Calculates similarity score between normalized track info and filename
   */
  private calculateMatchScore(normalizedTrack: string, normalizedFilename: string): number {
    // Simple word-based matching
    const trackWords = normalizedTrack.split(' ').filter(word => word.length > 1);
    const fileWords = normalizedFilename.split(' ').filter(word => word.length > 1);
    
    if (trackWords.length === 0 || fileWords.length === 0) {
      return 0;
    }

    let matchedWords = 0;
    
    for (const trackWord of trackWords) {
      for (const fileWord of fileWords) {
        if (this.isWordMatch(trackWord, fileWord)) {
          matchedWords++;
          break; // Don't count the same file word multiple times
        }
      }
    }

    // Calculate score based on matched words
    const score = matchedWords / trackWords.length;
    
    // Bonus for exact filename match (after normalization)
    if (normalizedTrack === normalizedFilename) {
      return Math.min(1.0, score + 0.3);
    }
    
    // Bonus for substring matches
    if (normalizedFilename.includes(normalizedTrack) || normalizedTrack.includes(normalizedFilename)) {
      return Math.min(1.0, score + 0.2);
    }
    
    return score;
  }

  /**
   * Checks if two words match (including partial matches)
   */
  private isWordMatch(word1: string, word2: string): boolean {
    if (word1 === word2) {
      return true;
    }
    
    // Check for substring matches (minimum 3 characters)
    if (word1.length >= 3 && word2.length >= 3) {
      if (word1.includes(word2) || word2.includes(word1)) {
        return true;
      }
    }
    
    // Check for similar words (simple edit distance)
    if (Math.abs(word1.length - word2.length) <= 2) {
      const distance = this.levenshteinDistance(word1, word2);
      const maxLength = Math.max(word1.length, word2.length);
      const similarity = 1 - (distance / maxLength);
      
      return similarity >= 0.8; // 80% similarity threshold
    }
    
    return false;
  }

  /**
   * Calculates Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
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

  /**
   * Generates M3U playlist content
   */
  generateM3UContent(
    matches: LocalTrackMatch[],
    baseMusicFolder: string,
    useRelativePaths: boolean = true
  ): string {
    const lines = ['#EXTM3U'];
    
    for (const match of matches) {
      if (match.isMatched && match.localFilePath) {
        let filePath = match.localFilePath;
        
        if (useRelativePaths) {
          // Convert to relative path from base music folder
          filePath = this.getRelativePath(baseMusicFolder, match.localFilePath);
        }
        
        // Add extended info line (optional but recommended)
        const duration = Math.round((match.spotifyTrack.duration_ms || 0) / 1000);
        const artists = match.spotifyTrack.artists.map(a => a.name).join(', ');
        const title = match.spotifyTrack.name;
        
        lines.push(`#EXTINF:${duration},${artists} - ${title}`);
        lines.push(filePath);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Gets relative path from base directory
   */
  private getRelativePath(basePath: string, fullPath: string): string {
    // Normalize paths
    const normalizedBase = basePath.replace(/\\/g, '/').replace(/\/$/, '');
    const normalizedFull = fullPath.replace(/\\/g, '/');
    
    if (normalizedFull.startsWith(normalizedBase)) {
      return normalizedFull.substring(normalizedBase.length + 1);
    }
    
    return fullPath; // Return full path if not under base
  }

  /**
   * Creates a complete sync result
   */
  createSyncResult(
    playlistId: string,
    playlistName: string,
    matches: LocalTrackMatch[],
    m3uFilePath: string
  ): SyncResult {
    const matchedTracks = matches.filter(m => m.isMatched);
    const unmatchedTracks = matches.filter(m => !m.isMatched);
    
    return {
      playlistId,
      playlistName,
      totalTracks: matches.length,
      matchedTracks: matchedTracks.length,
      unmatchedTracks,
      m3uFilePath,
      syncedAt: new Date()
    };
  }
}

export default FileMatchingService;