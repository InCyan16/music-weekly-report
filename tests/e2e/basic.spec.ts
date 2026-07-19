import { test, expect } from "@playwright/test";

test.describe("Music Diary E2E", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("音乐日记")).toBeVisible();
    await expect(page.getByText("开始聆听")).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("登录")).toBeVisible();
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
  });

  test("mock mode today page structure", async ({ page }) => {
    // This test requires mock mode enabled
    test.skip(
      process.env.NEXT_PUBLIC_USE_MOCK_MUSIC_PROVIDER !== "true",
      "Requires mock mode",
    );

    await page.goto("/today");
    await expect(
      page.getByText("你今天喜欢听什么音乐？"),
    ).toBeVisible();
  });
});
