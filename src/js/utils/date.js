const date = new Date();
let firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
const month = date.getMonth();
const lastDay = new Date(date.getFullYear(), month + 1, 0);
export const FIRST_DAY = firstDay.getDate();
export const LAST_DAY = lastDay.getDate();
export const MONTH = (month + 1) < 10 ? `0${month + 1}` : month + 1;
export const YEAR = date.getFullYear();