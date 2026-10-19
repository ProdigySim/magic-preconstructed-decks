import { Card, Cards } from "npm:scryfall-api";
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

const cache = new Map<string, Card>();
async function getCardCached(set: string, number: string) {
  const hash=`${set}-${number}`
  if(cache.get(hash)) return cache.get(hash);
  const card = await Cards.search(`s:${set} cn:${number}`).get(1).then(
    (x) => x[0],
  );
  await delay(600);
  cache.set(hash, card);
  return card;
}
async function validateCard({ name, set, number, finish }: CardId) {
  const card = await getCardCached(set, number);
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
    let error = false;
    let hasTokens = false;
    const lines = contents.split("\n");
    // Skip old fashioned token lists for now
    if(!lines.some(s => s === 'Tokens')) continue;

    for (const line of contents.split("\n")) {
      ++i;
      if (line.includes("[token]")) {
        hasTokens = true;
        for(const item of line.split("//")) {
          const [_match, name, set, number] = /\s+(.*?)\s+\[([^:]+):([^\]]+)\]/.exec(item) ?? [];
          // console.log(name, set, number)
          const finish = line.includes("[foil]") ? "foil" : "nonfoil";
          const validation = await validateCard({name, set, number, finish});
          if (validation.status === "error") {
            console.error(
              `[ERROR] ${entry.path} Line ${i}: ${set}-${number}.`,
              validation.message,
            );
            error = true;
          }
        }
      }
    }
    if(hasTokens) console.log(error ? 'ERROR' : 'OK', entry.path)
  }
}
