import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    const errorDescription = searchParams.get('error_description') || error;
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(errorDescription)}`, request.url));
  }

  // Validate required parameters
  if (!code || !state) {
    return NextResponse.redirect(new URL('/?error=Missing required parameters', request.url));
  }

  // Redirect back to main page with auth parameters
  const redirectUrl = new URL('/', request.url);
  redirectUrl.searchParams.set('code', code);
  redirectUrl.searchParams.set('state', state);
  redirectUrl.searchParams.set('auth_success', 'true');

  return NextResponse.redirect(redirectUrl);
}