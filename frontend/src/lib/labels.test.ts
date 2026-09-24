import { describe, expect, it } from "vitest";
import { assignLabelColors, FIXED_STYLES, labelStyle, PALETTE } from "./labels";

describe("assignLabelColors", () => {
  it("hands out a distinct colour per label, by first appearance", () => {
    const colors = assignLabelColors(["EMAIL", "IBAN", "EMAIL"]);
    expect(colors.size).toBe(2);
    expect(colors.get("EMAIL")).toBe(PALETTE[0]);
    expect(colors.get("IBAN")).toBe(PALETTE[1]);
  });

  it("treats PERSON like any label: the primary is never a data colour", () => {
    const colors = assignLabelColors(["PERSON", "EMAIL"]);
    expect(Object.keys(FIXED_STYLES)).toHaveLength(0);
    expect(colors.get("PERSON")).toBe(PALETTE[0]);
    expect(colors.get("EMAIL")).toBe(PALETTE[1]);
  });

  it("wraps around rather than running out", () => {
    const many = Array.from({ length: PALETTE.length + 1 }, (_, i) => `L${i}`);
    const colors = assignLabelColors(many);
    expect(colors.get(`L${PALETTE.length}`)).toBe(PALETTE[0]);
  });
});

describe("labelStyle", () => {
  it("prefers the colour already assigned in this run", () => {
    const colors = assignLabelColors(["EMAIL"]);
    expect(labelStyle("EMAIL", colors)).toBe(PALETTE[0]);
  });

  it("is stable for a label seen alone, so a page keeps its hue", () => {
    expect(labelStyle("FR_NIR")).toBe(labelStyle("FR_NIR"));
  });
});
