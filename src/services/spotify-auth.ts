import CryptoJS from 'crypto-js';
import { TokenResponse, AuthState, SpotifyUser } from '@/types';

class SpotifyAuth {
  private clientId: string = '';
  private redirectUri: string = '';
  private codeVerifier: string = '';
  private state: string = '';
  
  // OAuth 2.0 scopes required for the app
  private readonly SCOPES = [
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-read-private',
    'user-read-email'
  ];

  constructor(clientId?: string, redirectUri?: string) {
    if (clientId && redirectUri) {
      this.configure(clientId, redirectUri);
    }
  }

  configure(clientId: string, redirectUri: string) {
    this.clientId = clientId;
    this.redirectUri = redirectUri;
  }

  /**
   * Generates a cryptographically random string for PKCE
   */
  private generateCodeVerifier(): string {
    if (typeof window === 'undefined') {
      throw new Error('Cannot generate code verifier on server side');
    }
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Creates SHA256 hash of the code verifier for PKCE
   */
  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    if (typeof window === 'undefined') {
      throw new Error('Cannot generate code challenge on server side');
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generates a random state parameter for OAuth security
   */
  private generateState(): string {
    if (typeof window === 'undefined') {
      throw new Error('Cannot generate state on server side');
    }
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Initiates the Spotify OAuth flow
   */
  async startAuthFlow(): Promise<string> {
    if (!this.clientId || !this.redirectUri) {
      throw new Error('Spotify client ID and redirect URI must be configured');
    }

    this.codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(this.codeVerifier);
    this.state = this.generateState();

    // Store PKCE parameters in localStorage for callback handling
    if (typeof window !== 'undefined') {
      localStorage.setItem('spotify_code_verifier', this.codeVerifier);
      localStorage.setItem('spotify_state', this.state);
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      state: this.state,
      scope: this.SCOPES.join(' ')
    });

    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
    return authUrl;
  }

  /**
   * Handles the OAuth callback and exchanges code for tokens
   */
  async handleCallback(code: string, state: string): Promise<TokenResponse> {
    if (typeof window === 'undefined') {
      throw new Error('OAuth callback can only be handled on client side');
    }

    const storedState = localStorage.getItem('spotify_state');
    const storedCodeVerifier = localStorage.getItem('spotify_code_verifier');

    if (!storedState || state !== storedState) {
      throw new Error('Invalid state parameter');
    }

    if (!storedCodeVerifier) {
      throw new Error('Code verifier not found');
    }

    const tokenResponse = await this.exchangeCodeForTokens(code, storedCodeVerifier);

    // Clean up stored parameters
    if (typeof window !== 'undefined') {
      localStorage.removeItem('spotify_state');
      localStorage.removeItem('spotify_code_verifier');
    }

    // Store tokens securely
    this.storeTokens(tokenResponse);

    return tokenResponse;
  }

  /**
   * Exchanges authorization code for access and refresh tokens via server-side API
   */
  private async exchangeCodeForTokens(code: string, codeVerifier: string): Promise<TokenResponse> {
    const requestPayload = {
      code: code,
      codeVerifier: codeVerifier,
      redirectUri: this.redirectUri,
      clientId: this.clientId,
    };
    
    const response = await fetch('/api/spotify/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.error || error.message || 'Unknown error'}`);
    }

    return await response.json();
  }

  /**
   * Refreshes access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
    }

    const tokenResponse = await response.json();
    this.storeTokens(tokenResponse);
    return tokenResponse;
  }

  /**
   * Stores tokens securely in localStorage
   */
  private storeTokens(tokenResponse: TokenResponse) {
    if (typeof window === 'undefined') {
      return;
    }

    const expiresAt = Date.now() + (tokenResponse.expires_in * 1000);
    
    localStorage.setItem('spotify_access_token', tokenResponse.access_token);
    localStorage.setItem('spotify_expires_at', expiresAt.toString());
    
    if (tokenResponse.refresh_token) {
      localStorage.setItem('spotify_refresh_token', tokenResponse.refresh_token);
    }
  }

  /**
   * Gets current authentication state
   */
  getAuthState(): AuthState {
    if (typeof window === 'undefined') {
      return { isAuthenticated: false };
    }

    const accessToken = localStorage.getItem('spotify_access_token');
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    const expiresAt = localStorage.getItem('spotify_expires_at');

    if (!accessToken || !expiresAt) {
      return { isAuthenticated: false };
    }

    const now = Date.now();
    const tokenExpiresAt = parseInt(expiresAt);

    return {
      isAuthenticated: now < tokenExpiresAt,
      accessToken,
      refreshToken: refreshToken || undefined,
      expiresAt: tokenExpiresAt,
    };
  }

  /**
   * Gets a valid access token, refreshing if necessary
   */
  async getValidAccessToken(): Promise<string | null> {
    const authState = this.getAuthState();

    if (!authState.isAuthenticated) {
      // Try to refresh if we have a refresh token
      if (authState.refreshToken) {
        try {
          const tokenResponse = await this.refreshAccessToken(authState.refreshToken);
          return tokenResponse.access_token;
        } catch (error) {
          console.error('Failed to refresh token:', error);
          this.logout();
          return null;
        }
      }
      return null;
    }

    // Check if token is about to expire (within 5 minutes)
    if (authState.expiresAt && (authState.expiresAt - Date.now()) < 5 * 60 * 1000) {
      if (authState.refreshToken) {
        try {
          const tokenResponse = await this.refreshAccessToken(authState.refreshToken);
          return tokenResponse.access_token;
        } catch (error) {
          console.error('Failed to refresh token:', error);
          this.logout();
          return null;
        }
      }
    }

    return authState.accessToken || null;
  }

  /**
   * Fetches current user information
   */
  async getCurrentUser(): Promise<SpotifyUser | null> {
    const accessToken = await this.getValidAccessToken();
    if (!accessToken) {
      return null;
    }

    try {
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    }
  }

  /**
   * Logs out the user by clearing stored tokens
   */
  logout() {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_expires_at');
    localStorage.removeItem('spotify_state');
    localStorage.removeItem('spotify_code_verifier');
  }

  /**
   * Checks if user is currently authenticated
   */
  isAuthenticated(): boolean {
    return this.getAuthState().isAuthenticated;
  }
}

export default SpotifyAuth;