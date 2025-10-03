// Configuration Types
export interface MatchingConfig {
  caseSensitive: boolean; // case sensitive matching, default false
  removeSpecialChars: boolean; // remove special characters, default true
  normalizeWhitespace: boolean; // normalize whitespace, default true
}

export interface AppConfig {
  spotifyClientId: string;
  redirectUri: string;
  timeoutMs: number;
  baseMusicFolder: string;
  matching: MatchingConfig;
}

// Playlist Mapping Types
export interface PlaylistMapping {
  spotifyPlaylistId: string;
  spotifyPlaylistName: string;
  languageFolderName: string;
  m3uFileName: string;
  lastSync?: Date;
  matchedCount?: number;
  unmatchedCount?: number;
  matchedPercentage?: number;
}

// Spotify API Types
export interface SpotifyUser {
  id: string;
  display_name: string;
  email?: string;
  images?: SpotifyImage[];
}

export interface SpotifyImage {
  url: string;
  height?: number;
  width?: number;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description?: string;
  images: SpotifyImage[];
  tracks: {
    total: number;
  };
  owner: {
    display_name: string;
  };
  public: boolean;
  collaborative: boolean;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  explicit: boolean;
  popularity: number;
  preview_url?: string;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  type: 'artist';
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  images: SpotifyImage[];
  release_date: string;
  type: 'album';
}

export interface SpotifyPlaylistTrack {
  track: SpotifyTrack;
  added_at: string;
  added_by: {
    id: string;
  };
}

// Pagination Types
export interface SpotifyPaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  next?: string;
  previous?: string;
}

// OAuth Types
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  user?: SpotifyUser;
}

// File System Types
export interface LocalTrackMatch {
  spotifyTrack: SpotifyTrack;
  localFilePath?: string;
  isMatched: boolean;
  matchScore?: number;
  expectedFilename?: string;
  spotifyUrl?: string;
}

export interface SyncResult {
  playlistId: string;
  playlistName: string;
  totalTracks: number;
  matchedTracks: number;
  matchedTracksList: LocalTrackMatch[];
  unmatchedTracks: LocalTrackMatch[];
  m3uFilePath: string;
  syncedAt: Date;
}

// UI State Types
export interface SyncProgress {
  isProcessing: boolean;
  currentStep: string;
  progress: number;
  error?: string;
}

// Error Types
export interface SpotifyError {
  error: {
    status: number;
    message: string;
  };
}

export interface ValidationError {
  field: string;
  message: string;
}

