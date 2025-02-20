import { http, HttpResponse, type StrictRequest } from 'msw';
import incrementGlobalCount from './private/incrementGlobalCount';

export default function startConversation(
  trace: (request: StrictRequest<any>, requestBody: ReadableStream | null) => (response: HttpResponse) => HttpResponse
) {
  return http.post(
    'https://example.com/environments/environment-id/bots/bot-id/test/conversations',
    async function startConversation({ request }) {
      const postTrace = trace(request, request.body);

      const stream = new ReadableStream({
        start(controller) {
          const count = incrementGlobalCount();
          const encoder = new TextEncoder();

          controller.enqueue(
            encoder.encode(
              `event: activity\ndata: ${JSON.stringify({
                from: { role: 'bot' },
                id: `a-${count}`,
                text: `#${count}: Hello, World!`,
                timestamp: new Date().toISOString(),
                type: 'message'
              })}\n\nevent: end\ndata: end\n\n\n\n`
            )
          );

          controller.close();
        }
      });

      return postTrace(
        new HttpResponse(stream, {
          headers: { 'content-type': 'text/event-stream' }
        })
      );
    }
  );
}
