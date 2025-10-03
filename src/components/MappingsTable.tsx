'use client';

import React from 'react';
import { Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlaylistMapping } from '@/types';

interface MappingsTableProps {
  mappings: PlaylistMapping[];
  onDelete: (playlistId: string) => void;
  onSync: (mapping: PlaylistMapping) => void;
  isAuthenticated: boolean;
  isProcessing?: boolean;
}

const MappingsTable: React.FC<MappingsTableProps> = ({
  mappings,
  onDelete,
  onSync,
  isAuthenticated,
  isProcessing = false
}) => {
  if (mappings.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No playlist mappings configured yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Playlist
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Language Folder
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              M3U File
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {mappings.map((mapping) => (
            <tr key={mapping.spotifyPlaylistId} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {mapping.spotifyPlaylistName}
                    </div>
                    <div className="text-sm text-gray-500 font-mono">
                      {mapping.spotifyPlaylistId}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{mapping.languageFolderName}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{mapping.m3uFileName}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSync(mapping)}
                    disabled={!isAuthenticated || isProcessing}
                    title="Sync this playlist"
                  >
                    <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://open.spotify.com/playlist/${mapping.spotifyPlaylistId}`, '_blank')}
                    title="Open in Spotify"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(mapping.spotifyPlaylistId)}
                    title="Delete mapping"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MappingsTable;