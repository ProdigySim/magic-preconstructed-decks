import { Cards } from "npm:scryfall-api";
import { expandGlob } from "jsr:@std/fs";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
if (import.meta.main) {
  for await (const entry of expandGlob("data/**/*.txt")) {
    const contents = await Deno.readTextFile(entry.path);
    let i = 0;
    for (const line of contents.split("\n")) {
      ++i;
      if (line.includes("[token]")) {
        const [_match, _comment, nameA, nameB, setA, cnA, setB, cnB] =
          /(\/\/)?\s*\d+\s+(.*)\s+\/\/\s+(.*)\s+\[(.+):(.+)\|(.+):([^\]]+)\]/
            .exec(line) ?? [];

        if (!_match) continue;
        // console.log(`A: ${setA}-${cnA}. '${nameA}'`);
        // console.log(`B: ${setB}-${cnB}. '${nameB}'`);
        const cardA = await Cards.search(`s:${setA} cn:${cnA}`).all().then(
          (x) => x[0],
        );
        const cardB = await Cards.search(`s:${setB} cn:${cnB}`).all().then(
          (x) => x[0],
        );
        await delay(1000);
        if (cardA?.name !== nameA) {
          console.error(
            `[ERROR] ${entry.path} Line ${i}: ${setA}-${cnA}. '${nameA}' doesn't match Scryfall: '${cardA?.name}'`,
          );
        }
        if (cardB?.name !== nameB) {
          console.error(
            `[ERROR] ${entry.path} Line ${i}: ${setB}-${cnB}. '${nameB}' doesn't match Scryfall: '${cardB?.name}'`,
          );
        }
      }
    }
  }
}
