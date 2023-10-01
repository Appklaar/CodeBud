import { COLORS } from "../constants/colors";
import { validateHexColor } from "../constants/regex";
import { Instruction, InstructionGroup } from "../types";
import { getRandomInt } from "./random";

export const prepareInstructionsFromGroup = (group: InstructionGroup): Instruction[] => {
  const _groupColor = validateHexColor(group.groupColor ?? "") ? group.groupColor : COLORS[getRandomInt(COLORS.length)];

  return group.groupInstructions.map((el) => {
    return {
      ...el, 
      _groupId: group.groupId,
      _groupDescription: group.groupDescription,
      _groupColor
    }
  });
};