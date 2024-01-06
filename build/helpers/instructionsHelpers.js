"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareInstructionsFromGroup = void 0;
const colors_1 = require("../constants/colors");
const regex_1 = require("../constants/regex");
const random_1 = require("./random");
const prepareInstructionsFromGroup = (group) => {
    const _groupColor = (0, regex_1.validateHexColor)(group.groupColor ?? "") ? group.groupColor : colors_1.COLORS[(0, random_1.getRandomInt)(colors_1.COLORS.length)];
    return group.groupInstructions.map((el) => {
        return {
            ...el,
            _groupId: group.groupId,
            _groupDescription: group.groupDescription,
            _groupColor
        };
    });
};
exports.prepareInstructionsFromGroup = prepareInstructionsFromGroup;
