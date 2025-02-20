import { type Activity, type TurnGenerator } from 'copilot-studio-direct-to-engine-chat-adapter';
import { asyncGeneratorWithLastValue, readableStreamValues } from 'iter-fest';

type Patcher<T> = (value: T) => T;

export default function spyTurnGenerator(
  turnGenerator: TurnGenerator
): readonly [TurnGenerator, AsyncIterator<Activity>] {
  let controller: ReadableStreamDefaultController<Activity>;

  const readableStream = new ReadableStream<Activity>({
    start(controller_) {
      controller = controller_;
    }
  });

  const patchTurnGenerator: Patcher<TurnGenerator> = turnGenerator =>
    (async function* () {
      const turnGeneratorWithLastValue = asyncGeneratorWithLastValue(turnGenerator);

      for await (const activity of turnGeneratorWithLastValue) {
        controller.enqueue(activity);

        yield activity;
      }

      return (...args) => patchTurnGenerator(turnGeneratorWithLastValue.lastValue()(...args));
    })();

  return Object.freeze([patchTurnGenerator(turnGenerator), readableStreamValues<Activity>(readableStream)]);
}
