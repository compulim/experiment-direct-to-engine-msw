import { type TurnGenerator } from 'copilot-studio-direct-to-engine-chat-adapter';
import { asyncGeneratorWithLastValue } from 'iter-fest';

type Patch<T> = (value: T) => T;

export default function samplePatchTurnGenerator(turnGenerator: TurnGenerator): TurnGenerator {
  const patchTurnGenerator: Patch<TurnGenerator> = turnGenerator =>
    (async function* () {
      const turnGeneratorWithLastValue = asyncGeneratorWithLastValue(turnGenerator);

      for await (const activity of turnGeneratorWithLastValue) {
        yield activity;
      }

      return (...args) => patchTurnGenerator(turnGeneratorWithLastValue.lastValue()(...args));
    })();

  return patchTurnGenerator(turnGenerator);
}
