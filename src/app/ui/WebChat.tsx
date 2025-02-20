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

type Patcher<T> = (value: T) => T;

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
    const patchTurnGenerator: Patcher<TurnGenerator> = turnGenerator =>
      (async function* () {
        const turnGeneratorWithLastValue = asyncGeneratorWithLastValue(turnGenerator);

        for await (const activity of turnGeneratorWithLastValue) {
          yield activity;
        }

        return (...args) => patchTurnGenerator(turnGeneratorWithLastValue.lastValue()(...args));
      })();

    return toDirectLineJS(patchTurnGenerator(createHalfDuplexChatAdapter(strategy)));
  }, []);

  return (
    <div className="chat">
      <Composer directLine={directLine}>
        <BasicWebChat />
      </Composer>
    </div>
  );
});
