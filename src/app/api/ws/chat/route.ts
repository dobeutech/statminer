import { NextRequest } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { parse } from 'url';
import { WebSocketMessage, ChatRequestSchema } from '@/types';
import { sendToLLMProviders } from '@/lib/llm-providers';
import { validateApiKey } from '@/lib/auth/validate-api-key';
import { z } from 'zod';

let io: SocketIOServer | undefined;

const initializeSocketIO = () => {
  if (!io) {
    const httpServer = createServer();
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? process.env.NEXTAUTH_URL 
          : "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('join-session', (sessionId: string) => {
        socket.join(sessionId);
        console.log(`Socket ${socket.id} joined session ${sessionId}`);
      });

      socket.on('leave-session', (sessionId: string) => {
        socket.leave(sessionId);
        console.log(`Socket ${socket.id} left session ${sessionId}`);
      });

      socket.on('chat-message', async (data: WebSocketMessage) => {
        try {
          const validatedData = ChatRequestSchema.parse(data.payload);
          
          const authToken = socket.handshake.auth?.token;
          if (!authToken) {
            socket.emit('error', {
              type: 'auth_error',
              message: 'Authentication required. Provide a token in handshake auth.',
            });
            return;
          }

          const isValidUser = await validateApiKey(authToken);
          if (!isValidUser) {
            socket.emit('error', {
              type: 'auth_error',
              message: 'Invalid or expired authentication token.',
            });
            return;
          }
          
          await handleChatMessage(socket, validatedData, data.sessionId);
          
        } catch (error) {
          console.error('Chat message error:', error);
          socket.emit('error', {
            type: 'validation_error',
            message: error instanceof z.ZodError 
              ? 'Invalid message format' 
              : 'Failed to process message',
            details: error instanceof z.ZodError ? error.issues : undefined,
          });
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }
  
  return io;
};

async function handleChatMessage(
  socket: any, 
  data: z.infer<typeof ChatRequestSchema>, 
  sessionId?: string
) {
  const { message, providers, streaming } = data;

  // Send acknowledgment
  socket.emit('message-received', {
    messageId: `msg-${Date.now()}`,
    timestamp: new Date().toISOString(),
  });

  try {
    if (streaming) {
      // Handle streaming responses
      await sendToLLMProviders(
        message,
        providers,
        {
          onStream: (providerId: string, chunk: string, isComplete: boolean) => {
            socket.emit('stream-chunk', {
              providerId,
              chunk,
              isComplete,
              timestamp: new Date().toISOString(),
            });
            
            // Also emit to session room if available
            if (sessionId) {
              socket.to(sessionId).emit('stream-chunk', {
                providerId,
                chunk,
                isComplete,
                timestamp: new Date().toISOString(),
              });
            }
          },
          onComplete: (providerId: string, response: string, metadata: any) => {
            socket.emit('message-complete', {
              providerId,
              response,
              metadata,
              timestamp: new Date().toISOString(),
            });
          },
          onError: (providerId: string, error: string) => {
            socket.emit('provider-error', {
              providerId,
              error,
              timestamp: new Date().toISOString(),
            });
          },
        }
      );
    } else {
      // Handle batch responses
      const responses = await sendToLLMProviders(message, providers);
      
      socket.emit('batch-responses', {
        responses,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('LLM Provider error:', error);
    socket.emit('error', {
      type: 'provider_error',
      message: 'Failed to get response from AI providers',
      timestamp: new Date().toISOString(),
    });
  }
}

// WebSocket upgrade handler for Next.js
export async function GET(req: NextRequest) {
  const { pathname } = parse(req.url || '');
  
  if (pathname === '/api/ws/chat') {
    try {
      const io = initializeSocketIO();
      
      return new Response(
        JSON.stringify({
          message: 'WebSocket server initialized',
          endpoint: '/api/ws/chat',
          transports: ['websocket', 'polling'],
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('WebSocket initialization error:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to initialize WebSocket server',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  }
  
  return new Response('Not Found', { status: 404 });
}

// Handle Socket.IO polling fallback
export async function POST(req: NextRequest) {
  const { pathname, query } = parse(req.url || '', true);
  
  if (pathname === '/api/ws/chat' && query.transport === 'polling') {
    try {
      const io = initializeSocketIO();
      // Handle Socket.IO polling requests
      return new Response('OK', { status: 200 });
    } catch (error) {
      return new Response('Internal Server Error', { status: 500 });
    }
  }
  
  return new Response('Not Found', { status: 404 });
}