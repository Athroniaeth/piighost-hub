import { describe, expect, it } from "vitest";
import { labelsIn, placeholderLabel } from "./placeholders";

describe("placeholderLabel", () => {
  it("reads the label out of a counted token", () => {
    expect(placeholderLabel("<<EMAIL:1>>")).toBe("EMAIL");
  });

  it("reads a token with no counter", () => {
    expect(placeholderLabel("<<EMAIL>>")).toBe("EMAIL");
  });

  it("refuses anything that is not a whole token", () => {
    expect(placeholderLabel("see <<EMAIL:1>>")).toBeNull();
    expect(placeholderLabel("<<email:1>>")).toBeNull();
    expect(placeholderLabel("EMAIL")).toBeNull();
  });
});

describe("labelsIn", () => {
  it("lists each label once, in the order it first appears", () => {
    const text = "<<FR_PHONE:1>> then <<EMAIL:1>> then <<FR_PHONE:2>>";
    expect(labelsIn(text)).toEqual(["FR_PHONE", "EMAIL"]);
  });

  it("returns nothing for a text with no token", () => {
    expect(labelsIn("just words")).toEqual([]);
  });

  it("is not confused by the global regex keeping its lastIndex", () => {
    // PLACEHOLDER is a module-level global regex, so a second call reusing it
    // would start mid-string and silently drop the first token.
    const text = "<<EMAIL:1>> and <<IBAN:1>>";
    expect(labelsIn(text)).toEqual(labelsIn(text));
  });
});
