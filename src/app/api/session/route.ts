import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import SessionManager from '@/lib/auth/session-manager';
import { UserPreferences } from '@/types';
import { z } from 'zod';

function getUserId(user: { name?: string | null; email?: string | null; image?: string | null } & Record<string, unknown>): string | undefined {
  return (user as any).id ?? user.email ?? undefined;
}

const sessionManager = SessionManager.getInstance();

const PreferencesUpdateSchema = z.object({
  theme: z.enum(['light', 'dark']).optional(),
  defaultProviders: z.array(z.string()).optional(),
  chatViewMode: z.enum(['tabs', 'quad', 'comparison']).optional(),
  autoSave: z.boolean().optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    browser: z.boolean().optional(),
    apiAlerts: z.boolean().optional(),
  }).optional(),
});

const ApiKeySchema = z.object({
  providerId: z.string().min(1),
  apiKey: z.string().min(1),
});

// Get or create session
export async function GET(request: NextRequest) {
  try {
    const authSession = await getServerSession();
    if (!authSession?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const sessionId = request.nextUrl.searchParams.get('sessionId');
    
    let userSession;
    
    if (sessionId) {
      userSession = sessionManager.getSession(sessionId);
      if (userSession && userSession.userId !== getUserId(authSession.user!)) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        );
      }
    }
    
    if (!userSession) {
      userSession = sessionManager.createSession(getUserId(authSession.user!));
    }

    return NextResponse.json({
      success: true,
      session: {
        id: userSession.id,
        preferences: userSession.preferences,
        apiUsage: userSession.apiUsage,
        chatSessions: userSession.chatSessions.length,
        createdAt: userSession.createdAt,
        updatedAt: userSession.updatedAt,
      },
    });
  } catch (error) {
    console.error('Session GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get session' },
      { status: 500 }
    );
  }
}

// Update session preferences
export async function PUT(request: NextRequest) {
  try {
    const authSession = await getServerSession();
    if (!authSession?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const sessionId = request.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate the request body
    const validatedData = PreferencesUpdateSchema.parse(body);

    const existingSession = sessionManager.getSession(sessionId);
    if (existingSession && existingSession.userId !== getUserId(authSession.user!)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }
    
    const success = sessionManager.updatePreferences(sessionId, validatedData as Partial<UserPreferences>);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const updatedSession = sessionManager.getSession(sessionId);
    
    return NextResponse.json({
      success: true,
      preferences: updatedSession?.preferences,
    });
  } catch (error) {
    console.error('Session PUT error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

// Store API key
export async function POST(request: NextRequest) {
  try {
    const authSession = await getServerSession();
    if (!authSession?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const sessionId = request.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { providerId, apiKey } = ApiKeySchema.parse(body);

    const existingSession = sessionManager.getSession(sessionId);
    if (existingSession && existingSession.userId !== getUserId(authSession.user!)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }
    
    const success = sessionManager.storeApiKey(sessionId, providerId, apiKey);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `API key stored for ${providerId}`,
    });
  } catch (error) {
    console.error('Session POST error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to store API key' },
      { status: 500 }
    );
  }
}

// Delete session
export async function DELETE(request: NextRequest) {
  try {
    const authSession = await getServerSession();
    if (!authSession?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const sessionId = request.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const existingSession = sessionManager.getSession(sessionId);
    if (existingSession && existingSession.userId !== getUserId(authSession.user!)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const success = sessionManager.deleteSession(sessionId);
    
    return NextResponse.json({
      success,
      message: success ? 'Session deleted' : 'Session not found',
    });
  } catch (error) {
    console.error('Session DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}