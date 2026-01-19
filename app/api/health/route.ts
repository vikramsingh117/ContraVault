import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      hasMongoUri: !!process.env.MONGODB_URI,
      hasGeminiApi: !!process.env.GEMINI_API,
      nodeEnv: process.env.NODE_ENV,
    }
  });
}
