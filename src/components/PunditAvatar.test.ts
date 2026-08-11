import { describe, expect, it } from "vitest";
import { PUNDIT_IDS } from "@/lib/pundit/types";
import { punditAvatarModel } from "@/lib/pundit/avatar-model";

describe("AI Pundit avatar seeds", () => {
  it("stays stable for one approved show", () => {
    expect(punditAvatarModel("drop-one", "stats")).toEqual(punditAvatarModel("drop-one", "stats"));
  });

  it("changes between approved shows", () => {
    expect(punditAvatarModel("drop-one", "stats")).not.toEqual(
      punditAvatarModel("drop-two", "stats"),
    );
  });

  it("gives all six AI Pundits a distinct look", () => {
    const models = PUNDIT_IDS.map((id) => JSON.stringify(punditAvatarModel("drop-one", id)));
    expect(new Set(models)).toHaveLength(PUNDIT_IDS.length);
  });
});
