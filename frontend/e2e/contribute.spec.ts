import { expect, test } from "@playwright/test";

/** Load an existing object into whichever form the kind uses. */
async function forkFrom(page: import("@playwright/test").Page, needle: string) {
  await page.locator("#contribute-base").click();
  await page.getByPlaceholder("Filter by name, label or tag").fill(needle);
  await page.getByRole("option").first().click();
  await page.getByText("Start from this one").click();
}

test.describe("contributing", () => {
  test("writes a pattern from the form and passes every check", async ({
    page,
  }) => {
    await page.goto("/contribute");
    await page.getByPlaceholder("alice").fill("alice");
    await page.getByLabel("Name", { exact: true }).fill("order-id");
    await page.getByLabel("Regex").fill("\\bORD-[0-9]{6}\\b");
    await page
      .getByLabel("Description (en)")
      .fill("Internal order identifier.");
    await page
      .getByLabel("Description (fr)")
      .fill("Identifiant de commande interne.");

    await page.getByPlaceholder("Filter the vocabulary").fill("business");
    await page.getByRole("checkbox").first().check();

    const sentences = page.getByLabel("A sentence");
    const values = page.getByLabel("The value in it");
    await sentences.nth(0).fill("Order ORD-123456 shipped yesterday.");
    await values.nth(0).fill("ORD-123456");
    await sentences.nth(1).fill("Please cancel ORD-987654, wrong size.");
    await values.nth(1).fill("ORD-987654");
    await sentences.nth(2).fill("ORD-12");
    await sentences.nth(3).fill("ORD-1234567");
    await page.getByLabel("Prefix").fill("ORD-");
    await page.getByLabel("Filler").fill("0");
    await page.getByLabel("Suffix").fill("x");

    // Every example is answered by the Python engine, not by the browser.
    await expect(page.getByLabel("Caught as expected")).toHaveCount(4);

    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByText("Every check passed.")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Open the pull request/ }),
    ).toBeVisible();
  });

  test("says what the engine caught instead, before anything is submitted", async ({
    page,
  }) => {
    await page.goto("/contribute");
    await page.getByLabel("Regex").fill("ORD-\\d+");
    await page
      .getByLabel("A sentence")
      .nth(0)
      .fill("Order ORD-123456 shipped.");
    await page.getByLabel("The value in it").nth(0).fill("ORD-12345");
    await expect(
      page.locator("main").getByText("ORD-123456").first(),
    ).toBeVisible();
  });

  test("fills the form from an existing pattern, keeping its label", async ({
    page,
  }) => {
    await page.goto("/contribute");
    await forkFrom(page, "tessera");
    // it-tessera-sanitaria emits IT_HEALTH_CARD. Deriving the label from the
    // name would silently rename every fork.
    await expect(page.getByLabel("Label")).toHaveValue("IT_HEALTH_CARD");
    await expect(page.getByLabel("A sentence").first()).not.toHaveValue("");
  });

  test("stays quiet until something is typed", async ({ page }) => {
    await page.goto("/contribute");
    await expect(page.getByText("Check to see the findings.")).toBeVisible();
    await page.getByLabel("Regex").fill("[a-z]+");
    await expect(
      page.getByText(/lower case words joined by dashes/),
    ).toBeVisible();
  });
});
