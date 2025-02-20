import './WebChat.css';

import { Components } from 'botframework-webchat';
import {
  TestCanvasBotStrategy,
  createHalfDuplexChatAdapter,
  toDirectLineJS
} from 'copilot-studio-direct-to-engine-chat-adapter';
import { asyncGeneratorWithLastValue } from 'iter-fest';
import { memo } from 'react';

const { BasicWebChat, Composer } = Components;

export default memo(function Chat() {
  const startConversation = createHalfDuplexChatAdapter(
    new TestCanvasBotStrategy({
      botId: 'bot-id',
      environmentId: 'environment-id',
      async getToken() {
        return 'token';
      },
      islandURI: new URL('/api/directtoengine/', location.href),
      transport: 'auto'
    })
  );

  const nextStartConversation: typeof startConversation = (async function* () {
    const turnGenerator = asyncGeneratorWithLastValue(startConversation);

    for await (const activity of turnGenerator) {
      yield activity;
    }

    return turnGenerator.lastValue();
  })();

  const directLine = toDirectLineJS(nextStartConversation);

  return (
    <div className="chat">
      <Composer directLine={directLine}>
        <BasicWebChat />
      </Composer>
    </div>
  );
});
