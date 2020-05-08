"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const checkout_1 = __importDefault(require("./checkout"));
module.exports = function (stripe) {
    return new checkout_1.default(stripe);
};
//# sourceMappingURL=index.js.map