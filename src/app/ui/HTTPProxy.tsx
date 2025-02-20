import { readableStreamValues } from 'iter-fest';
import './HTTPProxy.css';

import { http, HttpResponse, passthrough } from 'msw';
import { setupWorker } from 'msw/browser';
import { Fragment, memo, useEffect, useRef, useState } from 'react';
import { useRefFrom } from 'use-ref-from';

type Frame = {
  id: string;
  request: {
    body: string;
    headers: Headers;
  };
  response: {
    body: string;
    headers: Headers;
  };
};

type HTTPProxyProps = {
  onReady: (() => void) | undefined;
};

const HTTPProxy = ({ onReady }: HTTPProxyProps) => {
  const [frames, setFrames] = useState<Frame[]>([]);
  const onReadyRef = useRefFrom(onReady);
  const countRef = useRef(0);

  useEffect(() => {
    const abortController = new AbortController();

    const worker = setupWorker(
      http.post(
        'https://example.com/environments/environment-id/bots/bot-id/test/conversations',
        async ({ request }) => {
          const id = crypto.randomUUID();
          const nextFrame = {
            id,
            request: {
              body: await request.text(),
              headers: request.headers
            },
            response: {
              body: '',
              headers: new Headers()
            }
          };

          setFrames(frames => [...frames, nextFrame]);

          const stream = new ReadableStream({
            start(controller) {
              const encoder = new TextEncoder();

              controller.enqueue(
                encoder.encode(
                  `event: activity\ndata: ${JSON.stringify({
                    from: { role: 'bot' },
                    id: `a-${countRef.current++}`,
                    text: `#${countRef.current}: Hello, World!`,
                    timestamp: new Date().toISOString(),
                    type: 'message'
                  })}\n\nevent: end\ndata: end\n\n\n\n`
                )
              );

              controller.close();
            }
          });

          const [stream1, stream2] = stream.tee();

          (async () => {
            const decoder = new TextDecoder();

            for await (const chunk of readableStreamValues(stream2)) {
              if (abortController.signal.aborted) {
                break;
              }

              setFrames(frames =>
                frames.map(frame => {
                  return frame.id === id
                    ? {
                        ...frame,
                        response: {
                          ...frame.response,
                          body: `${frame.response?.body}${decoder.decode(chunk)}`
                        }
                      }
                    : frame;
                })
              );
            }
          })();

          return new HttpResponse(stream1, {
            headers: { 'content-type': 'text/event-stream', 'x-ms-conversationid': 'c-00001' }
          });
        }
      ),
      http.post(
        'https://example.com/environments/environment-id/bots/bot-id/test/conversations/:conversationId',
        async ({ request }) => {
          const json = await request.text();
          const id = crypto.randomUUID();
          const nextFrame = {
            id,
            request: {
              body: json,
              headers: request.headers
            },
            response: {
              body: '',
              headers: new Headers()
            }
          };

          setFrames(frames => [...frames, nextFrame]);

          const stream = new ReadableStream({
            start(controller) {
              const encoder = new TextEncoder();

              controller.enqueue(
                encoder.encode(
                  `event: activity\ndata: ${JSON.stringify({
                    from: { role: 'bot' },
                    id: `a-${countRef.current++}`,
                    text: `#${countRef.current}: Aloha! "${JSON.parse(json).activity.text}"`,
                    timestamp: new Date().toISOString(),
                    type: 'message'
                  })}\n\nevent: end\ndata: end\n\n\n\n`
                )
              );

              controller.close();
            }
          });

          const [stream1, stream2] = stream.tee();

          (async () => {
            const decoder = new TextDecoder();

            for await (const chunk of readableStreamValues(stream2)) {
              if (abortController.signal.aborted) {
                break;
              }

              setFrames(frames =>
                frames.map(frame => {
                  return frame.id === id
                    ? {
                        ...frame,
                        response: {
                          ...frame.response,
                          body: `${frame.response?.body}${decoder.decode(chunk)}`
                        }
                      }
                    : frame;
                })
              );
            }
          })();

          return new HttpResponse(stream1, { headers: { 'content-type': 'text/event-stream' } });
        }
      ),
      http.all('*', () => passthrough())
    );

    (async signal => {
      await worker.start({
        serviceWorker: {
          url: './mockServiceWorker.js'
        }
      });

      signal.aborted || onReadyRef.current?.();
    })(abortController.signal);

    return () => {
      abortController.abort();
      worker.stop();
    };
  }, [onReadyRef, setFrames]);

  return (
    <Fragment>
      {frames.map(frame => (
        <Fragment>
          <dl>
            <dt>Request</dt>
            <dd>
              <pre className="http-proxy__frame-body">{frame.request.body}</pre>
            </dd>
            <dt>Response</dt>
            <dd>
              <pre className="http-proxy__frame-body">{frame.response.body}</pre>
            </dd>
          </dl>
          <hr />
        </Fragment>
      ))}
    </Fragment>
  );
};

export default memo(HTTPProxy);
