import './WebChat.css';

import { Components } from 'botframework-webchat';
import {
  TestCanvasBotAPIStrategy,
  createHalfDuplexChatAdapter,
  toDirectLineJS
} from 'copilot-studio-direct-to-engine-chat-adapter';
import { memo } from 'react';

const { BasicWebChat, Composer } = Components;

export default memo(function Chat() {
  const directLine = toDirectLineJS(
    createHalfDuplexChatAdapter(
      new TestCanvasBotAPIStrategy({
        botId: 'bot-id',
        environmentId: 'environment-id',
        async getTokenCallback() {
          return 'token';
        },
        islandURI: new URL('/api/directtoengine/', location.href)
      })
    )
  );

  return (
    <div className="chat">
      <Composer directLine={directLine}>
        <BasicWebChat />
      </Composer>
    </div>
  );
});
