// The Casebook's version 8 outline: every part, re-exported for build.mjs. Old material until rebuilt in canon/.
export * from "./p1-front.mjs";
export * from "./p2-words.mjs";
export * from "./p2-cast.mjs";
export * from "./p3-mystery.mjs";
export * from "./p5-threads.mjs";
export * from "./p6-appendices.mjs";
import { BOOKS_A, CHAPTERS_A } from "./p4-books-1.mjs";
import { BOOKS_B, CHAPTERS_B } from "./p4-books-2.mjs";
export const BOOKS = [...BOOKS_A, ...BOOKS_B];
export const CHAPTERS = [...CHAPTERS_A, ...CHAPTERS_B];
