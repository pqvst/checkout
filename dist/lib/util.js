"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCardExpired = exports.formatUnixDate = void 0;
const month_names_1 = __importDefault(require("../data/month_names"));
function formatUnixDate(unix) {
    const date = new Date(unix * 1000);
    if (isNaN(date.valueOf())) {
        return '';
    }
    else {
        const month = month_names_1.default[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();
        return `${month} ${day}, ${year}`;
    }
}
exports.formatUnixDate = formatUnixDate;
function isCardExpired(exp_month, exp_year) {
    const date = new Date;
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return exp_year < year || (exp_year == year && exp_month < month);
}
exports.isCardExpired = isCardExpired;
//# sourceMappingURL=util.js.map