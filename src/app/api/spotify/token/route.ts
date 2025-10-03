import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    console.log('Token exchange request body:', requestBody);
    
    const { code, codeVerifier, redirectUri, clientId } = requestBody;

    // Validate required parameters
    const missingParams = [];
    if (!code) missingParams.push('code');
    if (!codeVerifier) missingParams.push('codeVerifier');
    if (!redirectUri) missingParams.push('redirectUri');
    if (!clientId) missingParams.push('clientId');
    
    if (missingParams.length > 0) {
      console.log('Missing parameters:', missingParams);
      console.log('Received values - code:', !!code, 'codeVerifier:', !!codeVerifier, 'redirectUri:', redirectUri, 'clientId:', clientId);
      return NextResponse.json(
        { 
          error: `Missing required parameters: ${missingParams.join(', ')}`,
          received: { code: !!code, codeVerifier: !!codeVerifier, redirectUri: !!redirectUri, clientId: !!clientId }
        },
        { status: 400 }
      );
    }

    // Load configuration to validate client ID
    const configPath = path.join(process.cwd(), 'data', 'config.json');
    
    try {
      const configData = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configData);
      
      // Validate that the clientId matches configuration
      if (config.spotifyClientId !== clientId) {
        return NextResponse.json(
          { error: 'Client ID mismatch' },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { 
          error: 'Configuration not found',
          message: 'Please configure Spotify Client ID first'
        },
        { status: 400 }
      );
    }

    // Exchange authorization code for tokens using PKCE (no client secret needed)
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      return NextResponse.json(
        { error: `Token exchange failed: ${error.error_description || error.error}` },
        { status: tokenResponse.status }
      );
    }

    const tokens = await tokenResponse.json();
    return NextResponse.json(tokens);

  } catch (error) {
    console.error('Token exchange error:', error);
    return NextResponse.json(
      { error: 'Internal server error during token exchange' },
      { status: 500 }
    );
  }
}