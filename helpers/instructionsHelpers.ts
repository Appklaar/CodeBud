import { INSTRUCTION_GROUP_COLORS } from "../constants/colors";
import { EXISTING_SPECIAL_INSTRUCTION_IDS } from "../constants/events";
import { validateHexColor } from "../constants/regex";
import { Instruction, InstructionGroup } from "../types/types";
import { getRandomInt } from "./random";

export const prepareInstructionsFromGroup = (group: InstructionGroup): Instruction[] => {
  const _groupColor = validateHexColor(group.groupColor ?? "") ? group.groupColor : INSTRUCTION_GROUP_COLORS[getRandomInt(INSTRUCTION_GROUP_COLORS.length)];

  return group.groupInstructions.map((el) => {
    return {
      ...el, 
      _groupId: group.groupId,
      _groupDescription: group.groupDescription,
      _groupColor
    }
  });
};

export const prepareInstructionsFromInstructionsAndGroups = (instructions: (Instruction | InstructionGroup)[]) => {
  // Из переданного массива инструкций и групп инструкций формируется чистый массив инструкций
  const processedInstructions: Instruction[] = [];

  for (let el of instructions) {
    if ("groupId" in el) { // el is InstructionGroup
      processedInstructions.push(...prepareInstructionsFromGroup(el));
    } else { // el is Instruction
      processedInstructions.push(el);
    }
  }

  return processedInstructions;
};

// Валидация инструкций
// В т.ч. проверка на коллизии id(шников)
export const validateInstructions = (instructions: Instruction[]) => {
  const instructionIds = new Set<string>();
  const instructionPrototypes = new Set<string>();

  for (let el of instructions) {
    if (EXISTING_SPECIAL_INSTRUCTION_IDS.has(el.id as any))
      return {
        ok: false,
        message: `Instruction id: ${el.id} is reserved for special instruction. You should change it for something else.`
      };

    if (instructionIds.has(el.id)) {
      return {
        ok: false,
        message: `Duplicate instruction id passed; InstructionId: ${el.id}`
      };
    } else {
      instructionIds.add(el.id);
    }

    if (el.handler.length > 1)
      return {
        ok: false,
        message: `Instruction id: ${el.id} handler takes ${el.handler.length} args. Your handler should accept max 1 object as arguement. Number of fields is not limited.`
      };

    if (el.prototype)
      instructionPrototypes.add(el.prototype);
  }

  return {ok: true};
};