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

    // Load configuration to get client secret
    const configPath = path.join(process.cwd(), 'data', 'config.json');
    let clientSecret: string;
    
    try {
      const configData = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configData);
      clientSecret = config.spotifyClientSecret;
      
      if (!clientSecret) {
        return NextResponse.json(
          { 
            error: 'Client secret not configured',
            message: 'Please configure Spotify Client Secret in the application settings'
          },
          { status: 400 }
        );
      }
      
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
          message: 'Please configure Spotify credentials first'
        },
        { status: 400 }
      );
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
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