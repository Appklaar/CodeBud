import { SpecialInstructionsTable, SpecialInstructionId, Instruction } from './../types';
import { delay as customDelay } from '../helperFunctions';

export const EXISTING_SPECIAL_INSTRUCTION_IDS: Set<SpecialInstructionId> = new Set([
  "delay"
]);

export const SPECIAL_INSTRUCTIONS_TABLE: SpecialInstructionsTable = {
  delay: {
    id: "delay",
    description: "Adds delay between events. Has 1 parameter - delay in ms",
    parametersDescription: {
      delayInMs: "number"
    },
    handler: async (data: {delayInMs: number}) => {
      await customDelay(data.delayInMs);
    }
  }
};

export const SPECIAL_INSTRUCTIONS: Instruction[] = Object.values(SPECIAL_INSTRUCTIONS_TABLE);