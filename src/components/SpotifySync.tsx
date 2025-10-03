'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Music, Plus, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { AppConfig, PlaylistMapping, AuthState, SyncResult, SyncProgress } from '@/types';
import ConfigService from '@/services/config-service';
import SpotifyAuth from '@/services/spotify-auth';
import SpotifyAPI from '@/services/spotify-api';
import ConfigDialog from './ConfigDialog';
import AddMappingDialog from './AddMappingDialog';
import MappingsTable from './MappingsTable';
import SyncProgressModal from './SyncProgressModal';
import SyncService from '@/services/sync-service';

const SpotifySync: React.FC = () => {
  // State management
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [mappings, setMappings] = useState<PlaylistMapping[]>([]);
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showAddMappingDialog, setShowAddMappingDialog] = useState(false);
  const [showSyncProgress, setShowSyncProgress] = useState(false);
  
  // Sync states
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    isProcessing: false,
    currentStep: '',
    progress: 0
  });
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  
  // Services
  const [spotifyAuth] = useState(() => new SpotifyAuth());
  const [spotifyAPI] = useState(() => new SpotifyAPI(spotifyAuth));

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Handle URL parameters for OAuth callback
  useEffect(() => {
    if (typeof window === 'undefined' || !config) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const authSuccess = urlParams.get('auth_success');
    const error = urlParams.get('error');

    if (error) {
      setError(`Authentication failed: ${error}`);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authSuccess && code && state) {
      // Ensure SpotifyAuth is configured before processing callback
      console.log('OAuth callback - config:', config);
      console.log('OAuth callback - clientId:', config.spotifyClientId, 'redirectUri:', config.redirectUri);
      if (config.spotifyClientId && config.redirectUri) {
        console.log('Configuring SpotifyAuth with:', config.spotifyClientId, config.redirectUri);
        spotifyAuth.configure(config.spotifyClientId, config.redirectUri);
        handleOAuthCallback(code, state);
      } else {
        console.log('Missing Spotify configuration');
        setError('Spotify configuration not found. Please configure your Spotify app credentials.');
      }
    }
  }, [config]); // Depend on config instead of empty array

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load configuration and mappings in parallel
      const [configData, mappingsData] = await Promise.all([
        ConfigService.loadConfig(),
        ConfigService.loadMappings()
      ]);

      setConfig(configData);
      setMappings(mappingsData);

      // Configure Spotify auth if we have client ID
      if (configData.spotifyClientId && configData.redirectUri) {
        spotifyAuth.configure(configData.spotifyClientId, configData.redirectUri);
        
        // Check current auth state
        const currentAuthState = spotifyAuth.getAuthState();
        setAuthState(currentAuthState);

        // If authenticated, fetch user info
        if (currentAuthState.isAuthenticated) {
          try {
            const user = await spotifyAuth.getCurrentUser();
            setAuthState(prev => ({ ...prev, user: user || undefined }));
          } catch (error) {
            console.error('Failed to fetch user info:', error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setError('Failed to load application data. Please check your configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      setError(null);
      await spotifyAuth.handleCallback(code, state);
      
      // Update auth state and fetch user info
      const newAuthState = spotifyAuth.getAuthState();
      setAuthState(newAuthState);

      if (newAuthState.isAuthenticated) {
        const user = await spotifyAuth.getCurrentUser();
        setAuthState(prev => ({ ...prev, user: user || undefined }));
      }

      // Clean up URL
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      setError(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Clean up URL
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  };

  const handleLogin = async () => {
    try {
      setError(null);
      
      if (!config?.spotifyClientId || !config?.redirectUri) {
        setError('Please configure Spotify settings first');
        setShowConfigDialog(true);
        return;
      }

      spotifyAuth.configure(config.spotifyClientId, config.redirectUri);
      const authUrl = await spotifyAuth.startAuthFlow();
      
      // Open in same window for web app
      if (typeof window !== 'undefined') {
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error('Login failed:', error);
      setError(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleLogout = () => {
    spotifyAuth.logout();
    setAuthState({ isAuthenticated: false });
  };

  const handleConfigSave = async (newConfig: AppConfig) => {
    try {
      await ConfigService.saveConfig(newConfig);
      setConfig(newConfig);
      setShowConfigDialog(false);
      
      // Reconfigure auth if client ID changed
      if (newConfig.spotifyClientId && newConfig.redirectUri) {
        spotifyAuth.configure(newConfig.spotifyClientId, newConfig.redirectUri);
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  };

  const handleAddMapping = async (mapping: PlaylistMapping) => {
    try {
      await ConfigService.saveMapping(mapping);
      setMappings(prev => {
        const existing = prev.findIndex(m => m.spotifyPlaylistId === mapping.spotifyPlaylistId);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = mapping;
          return updated;
        } else {
          return [...prev, mapping];
        }
      });
      setShowAddMappingDialog(false);
    } catch (error) {
      console.error('Failed to save mapping:', error);
      throw error;
    }
  };

  const handleDeleteMapping = async (playlistId: string) => {
    try {
      await ConfigService.deleteMapping(playlistId);
      setMappings(prev => prev.filter(m => m.spotifyPlaylistId !== playlistId));
    } catch (error) {
      console.error('Failed to delete mapping:', error);
      setError(`Failed to delete mapping: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSyncAll = async () => {
    if (!authState.accessToken || !config?.baseMusicFolder || mappings.length === 0) {
      setError('Missing authentication, configuration, or mappings');
      return;
    }

    try {
      setShowSyncProgress(true);
      setSyncProgress({
        isProcessing: true,
        currentStep: 'Initializing sync...',
        progress: 0
      });
      setSyncResults([]);
      setError(null);

      const results = await SyncService.syncAllPlaylists(
        mappings,
        authState.accessToken,
        config.baseMusicFolder,
        config.matching,
        (current, total, playlistName) => {
          setSyncProgress({
            isProcessing: true,
            currentStep: `Syncing ${playlistName} (${current}/${total})`,
            progress: (current / total) * 100
          });
        }
      );

      setSyncResults(results);
      setSyncProgress({
        isProcessing: false,
        currentStep: 'Sync completed',
        progress: 100
      });
    } catch (error) {
      console.error('Sync failed:', error);
      setError(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSyncProgress({
        isProcessing: false,
        currentStep: 'Sync failed',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleSyncSingle = async (mapping: PlaylistMapping) => {
    if (!authState.accessToken || !config?.baseMusicFolder) {
      setError('Missing authentication or configuration');
      return;
    }

    try {
      setShowSyncProgress(true);
      setSyncProgress({
        isProcessing: true,
        currentStep: `Syncing ${mapping.spotifyPlaylistName}...`,
        progress: 0
      });
      setSyncResults([]);
      setError(null);

      const result = await SyncService.syncPlaylist(
        mapping,
        authState.accessToken,
        config.baseMusicFolder,
        config.matching,
        (step, progress) => {
          setSyncProgress({
            isProcessing: true,
            currentStep: step,
            progress
          });
        }
      );

      setSyncResults([result]);
      setSyncProgress({
        isProcessing: false,
        currentStep: 'Sync completed',
        progress: 100
      });
    } catch (error) {
      console.error('Sync failed:', error);
      setError(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSyncProgress({
        isProcessing: false,
        currentStep: 'Sync failed',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleDownloadReport = () => {
    SyncService.downloadSyncReport(syncResults);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Spotify Sync...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Music className="h-8 w-8 text-green-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Spotify Sync</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Authentication Status */}
              <div className="flex items-center space-x-2">
                {authState.isAuthenticated ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-gray-700">
                      Connected as {authState.user?.display_name || 'User'}
                    </span>
                    <Button variant="outline" size="sm" onClick={handleLogout}>
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm text-gray-700">Not connected</span>
                    <Button size="sm" onClick={handleLogin}>
                      Connect Spotify
                    </Button>
                  </>
                )}
              </div>

              {/* Configuration Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfigDialog(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-gray-900">Playlist Mappings</h2>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleSyncAll}
              disabled={!authState.isAuthenticated || mappings.length === 0 || syncProgress.isProcessing}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync All
            </Button>
            <Button
              onClick={() => setShowAddMappingDialog(true)}
              disabled={!authState.isAuthenticated}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Mapping
            </Button>
          </div>
        </div>

        {/* Mappings Table */}
        <div className="bg-white shadow rounded-lg">
          <MappingsTable
            mappings={mappings}
            onDelete={handleDeleteMapping}
            onSync={handleSyncSingle}
            isAuthenticated={authState.isAuthenticated}
            isProcessing={syncProgress.isProcessing}
          />
        </div>

        {/* Empty State */}
        {mappings.length === 0 && (
          <div className="text-center py-12">
            <Music className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No playlist mappings</h3>
            <p className="text-gray-500 mb-4">
              Get started by adding your first playlist mapping.
            </p>
            <Button
              onClick={() => setShowAddMappingDialog(true)}
              disabled={!authState.isAuthenticated}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Mapping
            </Button>
          </div>
        )}
      </main>

      {/* Modals */}
      <Modal
        isOpen={showConfigDialog}
        onClose={() => setShowConfigDialog(false)}
        title="Configuration"
      >
        <ConfigDialog
          config={config}
          onSave={handleConfigSave}
          onCancel={() => setShowConfigDialog(false)}
        />
      </Modal>

      <Modal
        isOpen={showAddMappingDialog}
        onClose={() => setShowAddMappingDialog(false)}
        title="Add Playlist Mapping"
        maxWidth="max-w-4xl"
      >
        <AddMappingDialog
          config={config}
          spotifyAPI={spotifyAPI}
          onSave={handleAddMapping}
          onCancel={() => setShowAddMappingDialog(false)}
        />
      </Modal>

      <SyncProgressModal
        isOpen={showSyncProgress}
        onClose={() => setShowSyncProgress(false)}
        isProcessing={syncProgress.isProcessing}
        currentStep={syncProgress.currentStep}
        progress={syncProgress.progress}
        results={syncResults}
        onDownloadReport={handleDownloadReport}
      />
    </div>
  );
};

export default SpotifySync;