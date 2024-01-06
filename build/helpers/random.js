"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomInt = exports.getId = void 0;
// short random string for ids - not guaranteed to be unique
const randomId = function (length = 8) {
    return Math.random().toString(36).substring(2, length + 2);
};
const existing = [];
const checkId = (id) => {
    let match = existing.find((item) => item === id);
    return match ? false : true;
};
// generate a unique id
const getId = function (length = 8) {
    const limit = 100; // max tries to create unique id
    let attempts = 0; // how many attempts
    let id;
    while (!id && attempts < limit) {
        id = randomId(length); // create id
        if (!checkId(id)) { // check unique
            id = undefined; // reset id
            attempts++; // record failed attempt
        }
    }
    const result = id ?? "defaultId";
    existing.push(result);
    return result;
};
exports.getId = getId;
const getRandomInt = (max) => {
    return Math.floor(Math.random() * Math.floor(max));
};
exports.getRandomInt = getRandomInt;
