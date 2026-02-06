import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

const SSE_REPLAY_COUNT = parseInt(process.env.SSE_REPLAY_COUNT || '20');

/**
 * GET /api/events?instance_id={id}&last_event_id={id}
 * Server-Sent Events endpoint for real-time updates.
 * 
 * - Streams new events as they occur
 * - On reconnect (with last_event_id), replays missed events
 */
export async function GET(request: NextRequest) {
    const instanceId = request.nextUrl.searchParams.get('instance_id');
    const lastEventId = request.nextUrl.searchParams.get('last_event_id');

    if (!instanceId) {
        return new Response('instance_id required', { status: 400 });
    }

    // Verify instance exists
    const instance = await db.getInstance(instanceId);
    if (!instance) {
        return new Response('Instance not found', { status: 404 });
    }

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();

            // Helper to send SSE message
            const sendEvent = (eventId: string, data: object) => {
                const message = `id: ${eventId}\ndata: ${JSON.stringify(data)}\n\n`;
                controller.enqueue(encoder.encode(message));
            };

            // Replay events on reconnect
            if (lastEventId) {
                try {
                    const missedEvents = await db.getEventsAfter(instanceId, lastEventId);
                    for (const event of missedEvents) {
                        sendEvent(event.id, event);
                    }
                } catch (error) {
                    // If lastEventId is invalid, send recent events
                    const recentEvents = await db.getRecentEvents(instanceId, SSE_REPLAY_COUNT);
                    for (const event of recentEvents) {
                        sendEvent(event.id, event);
                    }
                }
            } else {
                // New connection - send recent events for context
                const recentEvents = await db.getRecentEvents(instanceId, SSE_REPLAY_COUNT);
                for (const event of recentEvents) {
                    sendEvent(event.id, event);
                }
            }

            // Keep connection alive with periodic heartbeats
            // In production, you'd poll for new events here
            const heartbeatInterval = setInterval(() => {
                try {
                    const heartbeat = `: heartbeat\n\n`;
                    controller.enqueue(encoder.encode(heartbeat));
                } catch {
                    clearInterval(heartbeatInterval);
                }
            }, 30000);

            // Poll for new events
            let lastCheckedId = lastEventId || '';
            const pollInterval = setInterval(async () => {
                try {
                    const newEvents = lastCheckedId
                        ? await db.getEventsAfter(instanceId, lastCheckedId)
                        : await db.getRecentEvents(instanceId, 5);

                    for (const event of newEvents) {
                        sendEvent(event.id, event);
                        lastCheckedId = event.id;
                    }
                } catch (error) {
                    console.error('Error polling events:', error);
                }
            }, 1000);

            // Cleanup on close
            request.signal.addEventListener('abort', () => {
                clearInterval(heartbeatInterval);
                clearInterval(pollInterval);
                controller.close();
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
