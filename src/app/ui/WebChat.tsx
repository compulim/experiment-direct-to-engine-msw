import './WebChat.css';

import { Components } from 'botframework-webchat';
import {
  TestCanvasBotStrategy,
  createHalfDuplexChatAdapter,
  toDirectLineJS,
  type TurnGenerator
} from 'copilot-studio-direct-to-engine-chat-adapter';
import { asyncGeneratorWithLastValue } from 'iter-fest';
import { memo, useMemo } from 'react';

const { BasicWebChat, Composer } = Components;

export default memo(function Chat() {
  const directLine = useMemo(() => {
    const startConversation = createHalfDuplexChatAdapter(
      new TestCanvasBotStrategy({
        botId: 'bot-id',
        environmentId: 'environment-id',
        async getToken() {
          return 'token';
        },
        islandURI: new URL('https://example.com/api/directtoengine/', location.href),
        transport: 'auto'
      })
    );

    const patchTurnGenerator: (turnGenerator: TurnGenerator) => TurnGenerator = turnGenerator =>
      (async function* () {
        const turnGeneratorWithLastValue = asyncGeneratorWithLastValue(turnGenerator);

        for await (const activity of turnGeneratorWithLastValue) {
          yield activity;
        }

        return (...args) => patchTurnGenerator(turnGeneratorWithLastValue.lastValue()(...args));
      })();

    return toDirectLineJS(patchTurnGenerator(startConversation));
  }, []);

  return (
    <div className="chat">
      <Composer directLine={directLine}>
        <BasicWebChat />
      </Composer>
    </div>
  );
});
