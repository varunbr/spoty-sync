'use client';

import React from 'react';
import { CheckCircle, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { SyncResult } from '@/types';

interface SyncProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  isProcessing: boolean;
  currentStep: string;
  progress: number;
  results: SyncResult[];
  onDownloadReport: () => void;
}

const SyncProgressModal: React.FC<SyncProgressModalProps> = ({
  isOpen,
  onClose,
  isProcessing,
  currentStep,
  progress,
  results,
  onDownloadReport
}) => {
  const totalTracks = results.reduce((sum, r) => sum + r.totalTracks, 0);
  const matchedTracks = results.reduce((sum, r) => sum + r.matchedTracks, 0);
  const unmatchedTracks = results.reduce((sum, r) => sum + r.unmatchedTracks.length, 0);
  const matchRate = totalTracks > 0 ? (matchedTracks / totalTracks) * 100 : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isProcessing ? 'Syncing Playlists...' : 'Sync Complete'}
      maxWidth="max-w-7xl"
    >
      <div className="space-y-6">
        {isProcessing ? (
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg font-medium text-gray-900 mb-2">{currentStep}</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">{Math.round(progress)}% complete</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="text-lg font-medium text-green-900">Sync Completed Successfully!</h3>
              </div>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{results.length}</p>
                  <p className="text-sm text-gray-600">Playlists</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{totalTracks}</p>
                  <p className="text-sm text-gray-600">Total Tracks</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{matchedTracks}</p>
                  <p className="text-sm text-gray-600">Matched</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{unmatchedTracks}</p>
                  <p className="text-sm text-gray-600">Unmatched</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{Math.round(matchRate)}%</p>
                  <p className="text-sm text-gray-600">Match Rate</p>
                </div>
              </div>
            </div>

            {/* Combined Sync Results */}
            <div className="space-y-6">
              <div className="grid gap-6">
                {/* Playlist Overview */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Playlist Results Overview</h4>
                  <div className="grid gap-3">
                    {results.map((result, playlistIndex) => {
                      const playlistMatchRate = result.totalTracks > 0 ? 
                        (result.matchedTracks / result.totalTracks) * 100 : 0;
                      
                      return (
                        <div key={result.playlistId} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-gray-900">
                              {playlistIndex + 1}. {result.playlistName}
                            </h5>
                            <div className="flex items-center space-x-2">
                              {playlistMatchRate >= 80 ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : playlistMatchRate >= 50 ? (
                                <AlertCircle className="h-4 w-4 text-yellow-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="text-sm font-medium">
                                {result.matchedTracks}/{result.totalTracks} ({Math.round(playlistMatchRate)}%)
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-500 space-y-1">
                            <p>📁 M3U File: {result.m3uFilePath}</p>
                            <p>🕒 Synced: {result.syncedAt.toLocaleString()}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* All Matched Tracks */}
                {results.some(r => r.matchedTracks > 0) && (
                  <div className="space-y-3">
                    <details open className="bg-green-50 p-4 rounded-lg">
                      <summary className="cursor-pointer text-green-700 hover:text-green-800 font-medium text-lg mb-3">
                        ✅ All Matched Tracks ({results.reduce((sum, r) => sum + r.matchedTracks, 0)} total)
                      </summary>
                      <div className="space-y-3">
                        {results.map((result, playlistIndex) => 
                          result.matchedTracksList && result.matchedTracksList.length > 0 ? (
                            <div key={result.playlistId} className="bg-white rounded p-3">
                              <h6 className="font-medium text-green-800 mb-2">
                                {playlistIndex + 1}. {result.playlistName} ({result.matchedTracks} matched)
                              </h6>
                              <div className="space-y-1 max-h-64 overflow-y-auto">
                                {result.matchedTracksList.map((track, trackIndex) => (
                                  <div key={trackIndex} className="border-l-2 border-green-400 pl-3 py-1 bg-green-100 rounded text-sm">
                                    <p className="font-medium text-gray-800">
                                      {trackIndex + 1}. {track.spotifyTrack.artists.map(a => a.name).join(', ')} - {track.spotifyTrack.name}
                                    </p>
                                    {track.localFilePath && (
                                      <p className="text-xs text-green-600">
                                        Found: <code className="bg-green-200 px-1 rounded">{track.localFilePath}</code>
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null
                        )}
                      </div>
                    </details>
                  </div>
                )}

                {/* All Unmatched Tracks */}
                {unmatchedTracks > 0 && (
                  <div className="space-y-3">
                    <details open className="bg-yellow-50 p-4 rounded-lg">
                      <summary className="cursor-pointer text-yellow-700 hover:text-yellow-800 font-medium text-lg mb-3">
                        ⚠️ All Unmatched Tracks ({unmatchedTracks} total)
                      </summary>
                      <div className="space-y-3">
                        {results.map((result, playlistIndex) =>
                          result.unmatchedTracks.length > 0 ? (
                            <div key={result.playlistId} className="bg-white rounded p-3">
                              <h6 className="font-medium text-yellow-800 mb-2">
                                {playlistIndex + 1}. {result.playlistName} ({result.unmatchedTracks.length} unmatched)
                              </h6>
                              <div className="space-y-1 max-h-64 overflow-y-auto">
                                {result.unmatchedTracks.map((track, trackIndex) => (
                                  <div key={trackIndex} className="border-l-2 border-yellow-400 pl-3 py-1 bg-yellow-100 rounded text-sm">
                                    <p className="font-medium text-gray-800">
                                      {trackIndex + 1}. {track.spotifyTrack.artists.map(a => a.name).join(', ')} - {track.spotifyTrack.name}
                                    </p>
                                    {track.expectedFilename && (
                                      <p className="text-xs text-gray-600">
                                        Expected: <code className="bg-gray-200 px-1 rounded">{track.expectedFilename}</code>
                                      </p>
                                    )}
                                    {track.spotifyUrl && (
                                      <p className="text-xs">
                                        <a 
                                          href={track.spotifyUrl} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-green-600 hover:text-green-800 underline"
                                        >
                                          🎵 Listen on Spotify
                                        </a>
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null
                        )}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={onDownloadReport}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
              <Button onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default SyncProgressModal;