import { 
  SpotifyPlaylist, 
  SpotifyTrack, 
  SpotifyPlaylistTrack,
  SpotifyPaginatedResponse,
  SpotifyError 
} from '@/types';
import SpotifyAuth from './spotify-auth';

class SpotifyAPI {
  private auth: SpotifyAuth;
  private readonly BASE_URL = 'https://api.spotify.com/v1';

  constructor(auth: SpotifyAuth) {
    this.auth = auth;
  }

  /**
   * Makes authenticated requests to Spotify API
   */
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const accessToken = await this.auth.getValidAccessToken();
    
    if (!accessToken) {
      throw new Error('No valid access token available');
    }

    const response = await fetch(`${this.BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorData: SpotifyError;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          error: {
            status: response.status,
            message: response.statusText,
          },
        };
      }
      
      // Handle specific error cases
      if (response.status === 401) {
        // Token expired, try to refresh
        throw new Error('Authentication expired. Please log in again.');
      } else if (response.status === 403) {
        throw new Error('Access forbidden. Please check your Spotify permissions.');
      } else if (response.status === 429) {
        // Rate limited
        const retryAfter = response.headers.get('Retry-After');
        throw new Error(`Rate limited. Please try again in ${retryAfter || '30'} seconds.`);
      }
      
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Fetches all user playlists with pagination
   */
  async getUserPlaylists(): Promise<SpotifyPlaylist[]> {
    const allPlaylists: SpotifyPlaylist[] = [];
    let url = '/me/playlists?limit=50';

    try {
      while (url) {
        const response = await this.makeRequest<SpotifyPaginatedResponse<SpotifyPlaylist>>(url);
        allPlaylists.push(...response.items);
        
        // Update URL for next page
        if (response.next) {
          // Extract the path and query from the full URL
          const urlObj = new URL(response.next);
          url = urlObj.pathname + urlObj.search;
        } else {
          url = '';
        }
      }

      return allPlaylists;
    } catch (error) {
      console.error('Error fetching user playlists:', error);
      throw error;
    }
  }

  /**
   * Fetches a single playlist by ID
   */
  async getPlaylist(playlistId: string): Promise<SpotifyPlaylist> {
    try {
      return await this.makeRequest<SpotifyPlaylist>(`/playlists/${playlistId}`);
    } catch (error) {
      console.error(`Error fetching playlist ${playlistId}:`, error);
      throw error;
    }
  }

  /**
   * Fetches all tracks from a playlist with pagination
   */
  async getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
    const allTracks: SpotifyTrack[] = [];
    let url = `/playlists/${playlistId}/tracks?limit=50&fields=items(track(id,name,artists(id,name),album(id,name,artists(id,name),images,release_date),duration_ms,explicit,popularity,preview_url)),next,total`;

    try {
      while (url) {
        const response = await this.makeRequest<SpotifyPaginatedResponse<SpotifyPlaylistTrack>>(url);
        
        // Filter out null/undefined tracks and episodes
        const validTracks = response.items
          .filter(item => item.track && (item.track as any).type !== 'episode')
          .map(item => item.track as SpotifyTrack);
        
        allTracks.push(...validTracks);
        
        // Update URL for next page
        if (response.next) {
          const urlObj = new URL(response.next);
          url = urlObj.pathname + urlObj.search;
        } else {
          url = '';
        }
      }

      return allTracks;
    } catch (error) {
      console.error(`Error fetching tracks for playlist ${playlistId}:`, error);
      throw error;
    }
  }

  /**
   * Searches for playlists by name or URL
   */
  async searchPlaylists(query: string): Promise<SpotifyPlaylist[]> {
    try {
      // Check if query is a Spotify URL or URI
      const playlistId = this.extractPlaylistId(query);
      if (playlistId) {
        const playlist = await this.getPlaylist(playlistId);
        return [playlist];
      }

      // Search by name
      const response = await this.makeRequest<{
        playlists: SpotifyPaginatedResponse<SpotifyPlaylist>;
      }>(`/search?q=${encodeURIComponent(query)}&type=playlist&limit=20`);

      return response.playlists.items;
    } catch (error) {
      console.error('Error searching playlists:', error);
      throw error;
    }
  }

  /**
   * Extracts playlist ID from Spotify URL or URI
   */
  private extractPlaylistId(input: string): string | null {
    // Spotify URI: spotify:playlist:37i9dQZF1DX0XUsuxWHRQd
    const uriMatch = input.match(/spotify:playlist:([a-zA-Z0-9]+)/);
    if (uriMatch) {
      return uriMatch[1];
    }

    // Spotify URL: https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd
    const urlMatch = input.match(/spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }

    // Direct ID
    if (/^[a-zA-Z0-9]+$/.test(input) && input.length === 22) {
      return input;
    }

    return null;
  }

  /**
   * Gets detailed information about multiple tracks
   */
  async getTracks(trackIds: string[]): Promise<SpotifyTrack[]> {
    if (trackIds.length === 0) {
      return [];
    }

    const tracks: SpotifyTrack[] = [];
    
    // Spotify API allows max 50 tracks per request
    for (let i = 0; i < trackIds.length; i += 50) {
      const batch = trackIds.slice(i, i + 50);
      const ids = batch.join(',');
      
      try {
        const response = await this.makeRequest<{ tracks: SpotifyTrack[] }>(`/tracks?ids=${ids}`);
        tracks.push(...response.tracks.filter(track => track !== null));
      } catch (error) {
        console.error(`Error fetching track batch ${i}-${i + batch.length}:`, error);
        // Continue with other batches even if one fails
      }
    }

    return tracks;
  }

  /**
   * Gets audio features for tracks (tempo, energy, etc.)
   */
  async getTrackAudioFeatures(trackIds: string[]): Promise<any[]> {
    if (trackIds.length === 0) {
      return [];
    }

    const features: any[] = [];
    
    // Spotify API allows max 100 tracks per request for audio features
    for (let i = 0; i < trackIds.length; i += 100) {
      const batch = trackIds.slice(i, i + 100);
      const ids = batch.join(',');
      
      try {
        const response = await this.makeRequest<{ audio_features: any[] }>(`/audio-features?ids=${ids}`);
        features.push(...response.audio_features.filter(feature => feature !== null));
      } catch (error) {
        console.error(`Error fetching audio features batch ${i}-${i + batch.length}:`, error);
      }
    }

    return features;
  }

  /**
   * Gets the current user's profile information
   */
  async getCurrentUserProfile() {
    try {
      return await this.makeRequest('/me');
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  /**
   * Checks if the user follows a playlist
   */
  async isFollowingPlaylist(playlistId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest<boolean[]>(`/playlists/${playlistId}/followers/contains`);
      return response[0] || false;
    } catch (error) {
      console.error(`Error checking if following playlist ${playlistId}:`, error);
      return false;
    }
  }
}

export default SpotifyAPI;