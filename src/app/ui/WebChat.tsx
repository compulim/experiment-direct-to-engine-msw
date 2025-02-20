import './WebChat.css';

import { Components } from 'botframework-webchat';
import {
  TestCanvasBotStrategy,
  createHalfDuplexChatAdapter,
  toDirectLineJS
} from 'copilot-studio-direct-to-engine-chat-adapter';
import { asyncIteratorToAsyncIterable } from 'iter-fest';
import { memo, useMemo } from 'react';
import spyTurnGenerator from './private/spyTurnGenerator';

const { BasicWebChat, Composer } = Components;

export default memo(function Chat() {
  const strategy = useMemo(
    () =>
      new TestCanvasBotStrategy({
        botId: 'bot-id',
        environmentId: 'environment-id',
        async getToken() {
          return 'token';
        },
        islandURI: new URL('https://example.com/api/directtoengine/', location.href),
        transport: 'auto'
      }),
    []
  );

  const directLine = useMemo(() => {
    const [turnGenerator, spyingActivities] = spyTurnGenerator(createHalfDuplexChatAdapter(strategy));

    (async function () {
      for await (const activity of asyncIteratorToAsyncIterable(spyingActivities)) {
        console.log('SPY', activity);
      }
    })();

    return toDirectLineJS(turnGenerator);
  }, []);

  return (
    <div className="chat">
      <Composer directLine={directLine}>
        <BasicWebChat />
      </Composer>
    </div>
  );
});
