'use client';

import React, { useState, useEffect } from 'react';
import { Search, Folder, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppConfig, PlaylistMapping, SpotifyPlaylist } from '@/types';
import SpotifyAPI from '@/services/spotify-api';
import ConfigService from '@/services/config-service';

interface AddMappingDialogProps {
  config: AppConfig | null;
  spotifyAPI: SpotifyAPI;
  onSave: (mapping: PlaylistMapping) => Promise<void>;
  onCancel: () => void;
}

interface DirectoryItem {
  name: string;
  path: string;
  isDirectory: boolean;
  mp3Count?: number;
}

const AddMappingDialog: React.FC<AddMappingDialogProps> = ({
  config,
  spotifyAPI,
  onSave,
  onCancel
}) => {
  const [step, setStep] = useState<'playlist' | 'folder' | 'details'>('playlist');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Playlist selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyPlaylist[]>([]);
  const [userPlaylists, setUserPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null);
  
  // Folder selection state
  const [availableFolders, setAvailableFolders] = useState<DirectoryItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<DirectoryItem | null>(null);
  
  // M3U file details
  const [m3uFileName, setM3uFileName] = useState('');
  const [existingM3UFiles, setExistingM3UFiles] = useState<any[]>([]);

  // Load user playlists on component mount
  useEffect(() => {
    loadUserPlaylists();
  }, []);

  // Load available folders when moving to folder step
  useEffect(() => {
    if (step === 'folder' && config?.baseMusicFolder) {
      loadAvailableFolders();
    }
  }, [step, config?.baseMusicFolder]);

  // Load existing M3U files when folder is selected
  useEffect(() => {
    if (selectedFolder && config?.baseMusicFolder) {
      loadExistingM3UFiles();
    }
  }, [selectedFolder, config?.baseMusicFolder]);

  // Auto-generate M3U filename when playlist is selected
  useEffect(() => {
    if (selectedPlaylist && !m3uFileName) {
      const sanitizedName = selectedPlaylist.name
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .toLowerCase();
      setM3uFileName(`${sanitizedName}.m3u`);
    }
  }, [selectedPlaylist, m3uFileName]);

  const loadUserPlaylists = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const playlists = await spotifyAPI.getUserPlaylists();
      setUserPlaylists(playlists);
    } catch (error) {
      console.error('Failed to load user playlists:', error);
      setError('Failed to load your playlists. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const searchPlaylists = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const results = await spotifyAPI.searchPlaylists(searchQuery);
      
      if (results.length === 0) {
        setError('No playlist found. Please enter a valid Spotify playlist URL (e.g., https://open.spotify.com/playlist/...)');
      }
      
      setSearchResults(results);
    } catch (error) {
      console.error('Failed to search playlists:', error);
      setError('Failed to fetch playlist. Please check that the URL is correct and you have access to the playlist.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableFolders = async () => {
    if (!config?.baseMusicFolder) return;

    try {
      setIsLoading(true);
      setError(null);
      const folders = await ConfigService.scanMusicDirectories(config.baseMusicFolder);
      setAvailableFolders(folders);
    } catch (error) {
      console.error('Failed to load folders:', error);
      setError('Failed to load music folders. Please check your base music folder configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadExistingM3UFiles = async () => {
    if (!config?.baseMusicFolder) return;

    try {
      const files = await ConfigService.listM3UFiles(config.baseMusicFolder);
      setExistingM3UFiles(files);
    } catch (error) {
      console.error('Failed to load M3U files:', error);
      // Non-critical error, don't show to user
    }
  };

  const handlePlaylistSelect = (playlist: SpotifyPlaylist) => {
    setSelectedPlaylist(playlist);
    setStep('folder');
  };

  const handleFolderSelect = (folder: DirectoryItem) => {
    setSelectedFolder(folder);
    setStep('details');
  };

  const handleSubmit = async () => {
    if (!selectedPlaylist || !selectedFolder || !m3uFileName.trim()) {
      setError('Please complete all required fields');
      return;
    }

    const mapping: PlaylistMapping = {
      spotifyPlaylistId: selectedPlaylist.id,
      spotifyPlaylistName: selectedPlaylist.name,
      languageFolderName: selectedFolder.name,
      m3uFileName: m3uFileName.trim()
    };

    try {
      setIsLoading(true);
      setError(null);
      await onSave(mapping);
    } catch (error) {
      console.error('Failed to save mapping:', error);
      setError(`Failed to save mapping: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPlaylistStep = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="search">Enter Spotify Playlist URL</Label>
        <div className="flex space-x-2 mt-1">
          <Input
            id="search"
            type="text"
            placeholder="Paste Spotify playlist URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchPlaylists()}
          />
          <Button onClick={searchPlaylists} disabled={isLoading}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-700 mt-1">
          Example: https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd
        </p>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Search Results</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {searchResults.map((playlist) => (
              <div
                key={playlist.id}
                className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                onClick={() => handlePlaylistSelect(playlist)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                    {playlist.images[0] ? (
                      <img 
                        src={playlist.images[0].url} 
                        alt={playlist.name}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <Music className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{playlist.name}</p>
                    <p className="text-sm text-gray-700">{playlist.tracks.total} tracks • {playlist.owner.display_name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Playlists */}
      {userPlaylists.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Your Playlists</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {userPlaylists.map((playlist) => (
              <div
                key={playlist.id}
                className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                onClick={() => handlePlaylistSelect(playlist)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                    {playlist.images[0] ? (
                      <img 
                        src={playlist.images[0].url} 
                        alt={playlist.name}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <Music className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{playlist.name}</p>
                    <p className="text-sm text-gray-700">{playlist.tracks.total} tracks</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderFolderStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          Select Music Folder for "{selectedPlaylist?.name}"
        </h3>
        <p className="text-sm text-gray-700 mb-4">
          Choose the folder containing MP3 files for this playlist
        </p>
      </div>

      {availableFolders.length > 0 ? (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {availableFolders.map((folder) => (
            <div
              key={folder.path}
              className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
              onClick={() => handleFolderSelect(folder)}
            >
              <div className="flex items-center space-x-3">
                <Folder className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{folder.name}</p>
                  <p className="text-sm text-gray-700">{folder.mp3Count} MP3 files</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-700">
          No folders found in your base music directory.
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('playlist')}>
          Back to Playlist
        </Button>
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Mapping Details</h3>
      </div>

      {/* Selected Playlist */}
      <div>
        <Label>Selected Playlist</Label>
        <div className="mt-1 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium">{selectedPlaylist?.name}</p>
          <p className="text-sm text-gray-700">{selectedPlaylist?.tracks.total} tracks</p>
        </div>
      </div>

      {/* Selected Folder */}
      <div>
        <Label>Selected Folder</Label>
        <div className="mt-1 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium">{selectedFolder?.name}</p>
          <p className="text-sm text-gray-700">{selectedFolder?.mp3Count} MP3 files</p>
        </div>
      </div>

      {/* M3U File Name */}
      <div>
        <Label htmlFor="m3uFileName">M3U File Name</Label>
        <Input
          id="m3uFileName"
          type="text"
          value={m3uFileName}
          onChange={(e) => setM3uFileName(e.target.value)}
          placeholder="playlist.m3u"
        />
        <p className="mt-1 text-sm text-gray-700">
          The M3U playlist file will be created in your base music folder
        </p>
      </div>

      {/* Existing M3U Files */}
      {existingM3UFiles.length > 0 && (
        <div>
          <Label>Existing M3U Files</Label>
          <div className="mt-1 max-h-32 overflow-y-auto">
            {existingM3UFiles.map((file, index) => (
              <button
                key={index}
                type="button"
                className="block w-full text-left text-sm text-gray-600 hover:text-gray-900 py-1"
                onClick={() => setM3uFileName(file.name)}
              >
                {file.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('folder')}>
          Back to Folder
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading || !m3uFileName.trim()}>
          {isLoading ? 'Creating...' : 'Create Mapping'}
        </Button>
      </div>
    </div>
  );

  return (
    <div>
      {/* Progress indicator */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center space-x-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step === 'playlist' ? 'bg-blue-600 text-white' : 
            step === 'folder' || step === 'details' ? 'bg-green-600 text-white' : 'bg-gray-200'
          }`}>
            1
          </div>
          <div className="w-8 h-0.5 bg-gray-200"></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step === 'folder' ? 'bg-blue-600 text-white' : 
            step === 'details' ? 'bg-green-600 text-white' : 'bg-gray-200'
          }`}>
            2
          </div>
          <div className="w-8 h-0.5 bg-gray-200"></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step === 'details' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}>
            3
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Step Content */}
      {step === 'playlist' && renderPlaylistStep()}
      {step === 'folder' && renderFolderStep()}
      {step === 'details' && renderDetailsStep()}

      {/* Cancel Button */}
      {step === 'playlist' && (
        <div className="flex justify-end mt-6">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

export default AddMappingDialog;