import { readFileSync } from "node:fs";

const skillFile = new URL("../client/src/game/content/skills.ts", import.meta.url);
const content = readFileSync(skillFile, "utf8");
const forbidden = ["score", "band", "correctCount", "threshold", "rating"];
const hit = forbidden.find((term) => new RegExp(`\\b${term}\\b`, "i").test(content));
if (hit) throw new Error(`Skill boundary violation: forbidden academic field '${hit}' found in SkillEffect content.`);
const academicRouter = readFileSync(new URL("../server/gameRouter.ts", import.meta.url), "utf8");
if (academicRouter.includes("content/skills")) throw new Error("Skill boundary violation: academic referee must not import SkillEffect content.");
console.log("skill boundary: ok");
