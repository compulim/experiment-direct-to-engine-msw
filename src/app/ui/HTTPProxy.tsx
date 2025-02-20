import './HTTPProxy.css';

import { readableStreamValues } from 'iter-fest';
import { http, HttpResponse, passthrough, type StrictRequest } from 'msw';
import { setupWorker } from 'msw/browser';
import { Fragment, memo, useEffect, useState } from 'react';
import { useRefFrom } from 'use-ref-from';
import executeTurn from '../handlers/executeTurn';
import startConversation from '../handlers/startConversation';

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

  useEffect(() => {
    const abortController = new AbortController();
    const trace = (request: StrictRequest<any>, requestBody: ReadableStream | null | undefined) => {
      const id = crypto.randomUUID();

      const nextFrame = {
        id,
        request: {
          body: '',
          headers: request.headers
        },
        response: {
          body: '',
          headers: new Headers()
        }
      };

      setFrames(frames => [...frames, nextFrame]);

      (async signal => {
        requestBody =
          requestBody ||
          new ReadableStream({
            async start(controller) {
              controller.enqueue(await request.arrayBuffer());
            }
          });

        const decoder = new TextDecoder();

        for await (const chunk of readableStreamValues(requestBody)) {
          if (signal.aborted) {
            break;
          }

          setFrames(frames =>
            frames.map(frame =>
              frame.id === id
                ? {
                    ...frame,
                    request: {
                      ...frame.request,
                      body: `${frame.request?.body}${decoder.decode(chunk, { stream: true })}`
                    }
                  }
                : frame
            )
          );
        }
      })(abortController.signal);

      return (response: HttpResponse): HttpResponse => {
        const body =
          response.body ??
          new ReadableStream({
            async start(controller) {
              controller.enqueue(new Uint8Array(await response.arrayBuffer()));
            }
          });

        const [stream1, stream2] = body.tee();

        (async () => {
          const decoder = new TextDecoder();

          for await (const chunk of readableStreamValues(stream2)) {
            if (abortController.signal.aborted) {
              break;
            }

            setFrames(frames =>
              frames.map(frame =>
                frame.id === id
                  ? {
                      ...frame,
                      response: {
                        ...frame.response,
                        body: `${frame.response?.body}${decoder.decode(chunk, { stream: true })}`
                      }
                    }
                  : frame
              )
            );
          }
        })();

        return new HttpResponse(stream1, {
          headers: { 'content-type': 'text/event-stream', 'x-ms-conversationid': 'c-00001' }
        });
      };
    };

    const worker = setupWorker(
      startConversation(trace),
      executeTurn(trace),
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
