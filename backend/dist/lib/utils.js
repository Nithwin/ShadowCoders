"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shuffleArray = void 0;
/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 */
const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
};
exports.shuffleArray = shuffleArray;
//# sourceMappingURL=utils.js.map