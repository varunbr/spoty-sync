'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppConfig } from '@/types';

interface ConfigDialogProps {
  config: AppConfig | null;
  onSave: (config: AppConfig) => Promise<void>;
  onCancel: () => void;
}

const ConfigDialog: React.FC<ConfigDialogProps> = ({
  config,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<AppConfig>({
    spotifyClientId: '',
    redirectUri: 'http://127.0.0.1:3000/callback',
    timeoutMs: 60000,
    baseMusicFolder: '',
    matching: {
      caseSensitive: false,
      removeSpecialChars: true,
      normalizeWhitespace: true
    }
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data when config changes
  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.spotifyClientId.trim()) {
      newErrors.spotifyClientId = 'Spotify Client ID is required';
    }

    if (!formData.redirectUri.trim()) {
      newErrors.redirectUri = 'Redirect URI is required';
    } else {
      try {
        const url = new URL(formData.redirectUri);
        if (!url.hostname.includes('127.0.0.1') && !url.hostname.includes('localhost')) {
          newErrors.redirectUri = 'Redirect URI must use localhost or 127.0.0.1';
        }
      } catch {
        newErrors.redirectUri = 'Invalid redirect URI format';
      }
    }

    if (!formData.baseMusicFolder.trim()) {
      newErrors.baseMusicFolder = 'Base music folder is required';
    }

    if (formData.timeoutMs <= 0) {
      newErrors.timeoutMs = 'Timeout must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);
      await onSave(formData);
    } catch (error) {
      console.error('Failed to save config:', error);
      // The parent component should handle showing the error
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof AppConfig, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const selectFolder = async () => {
    try {
      // For web version, we'll need to use file input or provide manual input
      // In a desktop version, this would open a folder picker dialog
      const folderPath = prompt('Enter the path to your base music folder:');
      if (folderPath) {
        handleInputChange('baseMusicFolder', folderPath);
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {/* Spotify Client ID */}
        <div>
          <Label htmlFor="spotifyClientId">Spotify Client ID</Label>
          <Input
            id="spotifyClientId"
            type="text"
            value={formData.spotifyClientId}
            onChange={(e) => handleInputChange('spotifyClientId', e.target.value)}
            placeholder="Your Spotify App Client ID"
            className={errors.spotifyClientId ? 'border-red-500' : ''}
          />
          {errors.spotifyClientId && (
            <p className="mt-1 text-sm text-red-600">{errors.spotifyClientId}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Get this from your <a 
              href="https://developer.spotify.com/dashboard" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Spotify Developer Dashboard
            </a>. No client secret needed - this app uses PKCE authentication.
          </p>
        </div>

        {/* Redirect URI */}
        <div>
          <Label htmlFor="redirectUri">Redirect URI</Label>
          <Input
            id="redirectUri"
            type="text"
            value={formData.redirectUri}
            onChange={(e) => handleInputChange('redirectUri', e.target.value)}
            placeholder="http://127.0.0.1:3000/callback"
            className={errors.redirectUri ? 'border-red-500' : ''}
          />
          {errors.redirectUri && (
            <p className="mt-1 text-sm text-red-600">{errors.redirectUri}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Make sure this matches your Spotify app settings
          </p>
        </div>

        {/* Base Music Folder */}
        <div>
          <Label htmlFor="baseMusicFolder">Base Music Folder</Label>
          <div className="flex space-x-2">
            <Input
              id="baseMusicFolder"
              type="text"
              value={formData.baseMusicFolder}
              onChange={(e) => handleInputChange('baseMusicFolder', e.target.value)}
              placeholder="C:\\Music or /home/user/Music"
              className={`flex-1 ${errors.baseMusicFolder ? 'border-red-500' : ''}`}
            />
            <Button
              type="button"
              variant="outline"
              onClick={selectFolder}
            >
              Browse
            </Button>
          </div>
          {errors.baseMusicFolder && (
            <p className="mt-1 text-sm text-red-600">{errors.baseMusicFolder}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Root folder containing all your music directories
          </p>
        </div>

        {/* Timeout */}
        <div>
          <Label htmlFor="timeoutMs">Request Timeout (ms)</Label>
          <Input
            id="timeoutMs"
            type="number"
            value={formData.timeoutMs}
            onChange={(e) => handleInputChange('timeoutMs', parseInt(e.target.value) || 0)}
            placeholder="60000"
            min="1000"
            max="300000"
            className={errors.timeoutMs ? 'border-red-500' : ''}
          />
          {errors.timeoutMs && (
            <p className="mt-1 text-sm text-red-600">{errors.timeoutMs}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Timeout for API requests (1000-300000 ms)
          </p>
        </div>

        {/* Matching Configuration */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Track Matching Settings</h3>
          
          <div className="space-y-3">
            {/* Case Sensitive */}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.matching.caseSensitive}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  matching: { ...prev.matching, caseSensitive: e.target.checked }
                }))}
                className="rounded border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-900">Case sensitive matching</span>
              <span className="ml-2 text-xs text-gray-500">(recommended: OFF for better matches)</span>
            </label>

            {/* Remove Special Characters */}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.matching.removeSpecialChars}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  matching: { ...prev.matching, removeSpecialChars: e.target.checked }
                }))}
                className="rounded border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-900">Remove special characters</span>
              <span className="ml-2 text-xs text-gray-500">(recommended: ON to ignore punctuation)</span>
            </label>

            {/* Normalize Whitespace */}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.matching.normalizeWhitespace}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  matching: { ...prev.matching, normalizeWhitespace: e.target.checked }
                }))}
                className="rounded border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-900">Normalize whitespace</span>
              <span className="ml-2 text-xs text-gray-500">(recommended: ON to clean up spacing)</span>
            </label>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Simple matching:</strong> Files are matched using exact string comparison after normalization. 
              This ensures reliable, predictable results without complex scoring algorithms.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </form>
  );
};

export default ConfigDialog;