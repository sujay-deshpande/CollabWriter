import { NextResponse } from 'next/server';

/**
 * App Router-compatible health endpoint for realtime setup.
 * Note: Socket.io server bootstrap should run in a dedicated Node server
 * or a Pages API route, not in an App Router route handler.
 */

export const runtime = 'nodejs';

export async function GET() {
    return NextResponse.json(
        {
            ok: true,
            message: 'Realtime endpoint reachable',
        },
        { status: 200 }
    );
}
