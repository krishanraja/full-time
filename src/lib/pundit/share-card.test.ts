import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { renderPunditShareCard } from "./share-card.server";

describe("pundit share cards", () => {
  it("renders a valid 1200 by 630 PNG and escapes source text", async () => {
    const card = await renderPunditShareCard({
      punditId: "zen",
      title: "A measured <verdict>",
      portableLine: "The score is a receipt, not an explanation & not a shortcut.",
      coverageDate: "2026-08-08",
    });
    const metadata = await sharp(card).metadata();
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(1200);
    expect(metadata.height).toBe(630);
  });
});
