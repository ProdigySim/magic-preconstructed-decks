import { Cards } from "npm:scryfall-api";
import { expandGlob } from "jsr:@std/fs";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
interface CardId {
  name: string;
  set: string;
  number: string;
  finish: "foil" | "nonfoil";
}
async function validateCard({ name, set, number, finish }: CardId) {
  const card = await Cards.search(`s:${set} cn:${number}`).get(1).then(
    (x) => x[0],
  );
  await delay(600);
  if (card?.name !== name) {
    return {
      status: "error",
      message: `Name '${name}' doesn't match Scryfall: '${card?.name}'`,
    };
  }
  if (!card.finishes.includes(finish)) {
    return {
      status: "error",
      message: `Finish '${finish}' not found in scryfall list ${
        JSON.stringify(card.finishes)
      }`,
    };
  }
  return { status: "ok", message: "OK" };
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
        const finish = line.includes("[foil]") ? "foil" : "nonfoil";
        for (
          const cardInfo of [
            { name: nameA, set: setA, number: cnA, finish },
            { name: nameB, set: setB, number: cnB, finish },
          ] as const
        ) {
          const validation = await validateCard(cardInfo);
          if (validation.status === "error") {
            console.error(
              `[ERROR] ${entry.path} Line ${i}: ${setB}-${cnB}.`,
              validation.message,
            );
          }
        }
      }
    }
  }
}
