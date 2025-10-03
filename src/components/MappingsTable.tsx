'use client';

import React, { useState } from 'react';
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

type SortColumn = 'playlist' | 'folder' | 'm3uFile' | 'lastSync' | 'matchedCount' | 'unmatchedCount' | 'matchedPercentage';
type SortDirection = 'asc' | 'desc';

const MappingsTable: React.FC<MappingsTableProps> = ({
  mappings,
  onDelete,
  onSync,
  isAuthenticated,
  isProcessing = false
}) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>('playlist');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedMappings = [...mappings].sort((a, b) => {
    let comparison = 0;
    
    switch (sortColumn) {
      case 'playlist':
        comparison = a.spotifyPlaylistName.localeCompare(b.spotifyPlaylistName);
        break;
      case 'folder':
        comparison = a.languageFolderName.localeCompare(b.languageFolderName);
        break;
      case 'm3uFile':
        comparison = a.m3uFileName.localeCompare(b.m3uFileName);
        break;
      case 'lastSync':
        const dateA = a.lastSync ? new Date(a.lastSync).getTime() : 0;
        const dateB = b.lastSync ? new Date(b.lastSync).getTime() : 0;
        comparison = dateA - dateB;
        break;
      case 'matchedCount':
        const matchedA = a.matchedCount || 0;
        const matchedB = b.matchedCount || 0;
        comparison = matchedA - matchedB;
        break;
      case 'unmatchedCount':
        const unmatchedA = a.unmatchedCount || 0;
        const unmatchedB = b.unmatchedCount || 0;
        comparison = unmatchedA - unmatchedB;
        break;
      case 'matchedPercentage':
        const percentageA = a.matchedPercentage || 0;
        const percentageB = b.matchedPercentage || 0;
        comparison = percentageA - percentageB;
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <span className="text-gray-400 ml-1">↕</span>;
    }
    return <span className="text-blue-500 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  if (mappings.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No playlist mappings configured yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none w-1/4"
              onClick={() => handleSort('playlist')}
            >
              <div className="flex items-center">
                Playlist
                <SortIcon column="playlist" />
              </div>
            </th>
            <th 
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none w-1/6"
              onClick={() => handleSort('m3uFile')}
            >
              <div className="flex items-center">
                M3U File
                <SortIcon column="m3uFile" />
              </div>
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
              <div className="flex flex-col space-y-1">
                <div 
                  className="cursor-pointer hover:bg-gray-100 px-1 py-1 rounded select-none flex items-center justify-center"
                  onClick={() => handleSort('matchedCount')}
                >
                  <span className="text-green-600 text-xs">✓ Matched</span>
                  <SortIcon column="matchedCount" />
                </div>
                <div 
                  className="cursor-pointer hover:bg-gray-100 px-1 py-1 rounded select-none flex items-center justify-center"
                  onClick={() => handleSort('unmatchedCount')}
                >
                  <span className="text-red-600 text-xs">✗ Unmatched</span>
                  <SortIcon column="unmatchedCount" />
                </div>
              </div>
            </th>
            <th 
              className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none w-1/12"
              onClick={() => handleSort('matchedPercentage')}
            >
              <div className="flex items-center justify-center">
                Match %
                <SortIcon column="matchedPercentage" />
              </div>
            </th>
            <th 
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none w-1/6"
              onClick={() => handleSort('folder')}
            >
              <div className="flex items-center">
                Folder
                <SortIcon column="folder" />
              </div>
            </th>
            <th 
              className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none w-1/8"
              onClick={() => handleSort('lastSync')}
            >
              <div className="flex items-center">
                Last Sync
                <SortIcon column="lastSync" />
              </div>
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedMappings.map((mapping) => (
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
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{mapping.m3uFileName}</div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-center">
                <div className="text-sm text-gray-900">
                  {(mapping.matchedCount !== undefined || mapping.unmatchedCount !== undefined) ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-center space-x-1">
                        <span className="text-green-600 font-medium text-sm">✓ {mapping.matchedCount || 0}</span>
                        <span className="text-red-600 font-medium text-sm">✗ {mapping.unmatchedCount || 0}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Total: {(mapping.matchedCount || 0) + (mapping.unmatchedCount || 0)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">Not synced</span>
                  )}
                </div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-center">
                <div className="text-sm text-gray-900">
                  {mapping.matchedPercentage !== undefined ? (
                    <div className="flex flex-col items-center space-y-1">
                      <div className="flex items-center space-x-1">
                        <span className={`font-bold text-sm ${
                          mapping.matchedPercentage >= 90 ? 'text-green-600' :
                          mapping.matchedPercentage >= 70 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {mapping.matchedPercentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-12 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            mapping.matchedPercentage >= 90 ? 'bg-green-500' :
                            mapping.matchedPercentage >= 70 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${mapping.matchedPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{mapping.languageFolderName}</div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {mapping.lastSync 
                    ? new Date(mapping.lastSync).toLocaleDateString() + ' ' + new Date(mapping.lastSync).toLocaleTimeString()
                    : 'Never'
                  }
                </div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-1">
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