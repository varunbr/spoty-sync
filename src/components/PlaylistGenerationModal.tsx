'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import PlaylistGenerationService from '@/services/playlist-generation';

interface PlaylistGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface GenerateM3UResult {
  folder: string;
  songsCount: number;
  m3uFile: string;
  totalAppearances: number;
}

interface PlaylistStats {
  totalM3UFiles: number;
  totalFolders: number;
  baseMusicFolder: string;
}

export function PlaylistGenerationModal({ isOpen, onClose, onSuccess }: PlaylistGenerationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GenerateM3UResult[]>([]);
  const [stats, setStats] = useState<PlaylistStats | null>(null);
  const [step, setStep] = useState<'preview' | 'generating' | 'results'>('preview');

  useEffect(() => {
    if (isOpen) {
      loadStats();
      setStep('preview');
      setResults([]);
      setError(null);
    }
  }, [isOpen]);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const statsData = await PlaylistGenerationService.getPlaylistStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load stats:', error);
      setError('Failed to load folder information. Please check your configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setStep('generating');
      
      const response = await PlaylistGenerationService.generatePlaylistsFromFolders();
      
      setResults(response.results);
      setStep('results');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate playlists';
      console.error('Failed to generate playlists:', error);
      setError(errorMessage);
      setStep('preview');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Generate Folder-Based Playlists</h3>
        <p className="text-sm text-gray-700">
          This will create M3U playlist files for each subfolder in your music directory. 
          Songs will be ordered by how frequently they appear in your existing playlists.
        </p>
      </div>

      {stats && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <h4 className="font-medium text-gray-900">Current Status</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-700 font-medium">Music Folders:</span>
              <span className="ml-2 font-semibold text-gray-900">{stats.totalFolders}</span>
            </div>
            <div>
              <span className="text-gray-700 font-medium">Existing M3U Files:</span>
              <span className="ml-2 font-semibold text-gray-900">{stats.totalM3UFiles}</span>
            </div>
          </div>
          <div className="text-sm">
            <span className="text-gray-700 font-medium">Base Folder:</span>
            <span className="ml-2 font-mono text-xs bg-white border px-2 py-1 rounded text-gray-900">
              {stats.baseMusicFolder}
            </span>
          </div>
        </div>
      )}

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Analyzes all existing M3U files to count song appearances</li>
          <li>• Scans each subfolder for MP3 files</li>
          <li>• Creates a new M3U playlist for each folder (e.g., "English.m3u")</li>
          <li>• Orders songs by popularity (most frequently appearing first)</li>
        </ul>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleGenerate}
          disabled={isLoading || !stats || stats.totalFolders === 0}
        >
          {isLoading ? 'Loading...' : `Generate ${stats?.totalFolders || 0} Playlists`}
        </Button>
      </div>
    </div>
  );

  const renderGeneratingStep = () => (
    <div className="space-y-6 text-center py-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Generating Playlists</h3>
        <p className="text-sm text-gray-600">
          Analyzing your music collection and creating playlist files...
        </p>
      </div>

      <div className="flex justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse h-4 w-4 bg-blue-600 rounded-full"></div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-800 font-medium">
          Processing folders and analyzing song popularity...
        </p>
        <p className="text-xs text-blue-600 mt-1">
          This may take a few moments depending on your collection size.
        </p>
      </div>

    </div>
  );

  const renderResultsStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Playlists Generated Successfully!</h3>
        <p className="text-sm text-gray-600">
          Created {results.length} playlist files based on your folder structure.
        </p>
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2">
        {results.map((result, index) => (
          <div key={index} className="bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-gray-900">{result.m3uFile}</h4>
                <p className="text-sm text-gray-600">Folder: {result.folder}</p>
              </div>
              <div className="text-right text-sm">
                <div className="font-medium text-gray-900">{result.songsCount} songs</div>
                <div className="text-gray-500">{result.totalAppearances} total appearances</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-green-50 p-4 rounded-lg">
        <p className="text-sm text-green-800">
          Playlist files have been created in your base music folder. Songs are ordered by 
          their appearance frequency in existing playlists (most popular first).
        </p>
      </div>

      <div className="flex justify-end">
        <Button onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title="Generate Folder-Based Playlists"
    >
      <div className="w-full">
        {step === 'preview' && renderPreviewStep()}
        {step === 'generating' && renderGeneratingStep()}
        {step === 'results' && renderResultsStep()}
      </div>
    </Modal>
  );
}