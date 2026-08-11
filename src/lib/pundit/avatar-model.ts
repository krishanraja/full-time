import type { PunditId } from "./types";

function hashSeed(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number) {
  let value = seed || 1;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 4_294_967_296;
  };
}

export function punditAvatarModel(editionSeed: string, punditId: PunditId) {
  const random = seededRandom(hashSeed(`${editionSeed}:${punditId}`));
  return {
    turn: Math.round(random() * 32 - 16),
    orbit: 24 + Math.round(random() * 8),
    dots: Array.from({ length: 5 }, () => ({
      x: 15 + Math.round(random() * 70),
      y: 15 + Math.round(random() * 70),
      size: 2 + Math.round(random() * 4),
      opacity: 0.22 + random() * 0.34,
    })),
  };
}
