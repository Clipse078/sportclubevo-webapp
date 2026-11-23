/**
 * Shared `/` insert menu probe for SCE writing engine browser gates.
 */
import { captureFullViewportShellEvidence } from "./sce-white-edition-rendered-shell-assert.mjs";

export async function exerciseSceWritingInsertMenu(page, _prose, options) {
  const { selectItemId, filterText = "", menuScreenshotPath } = options;
  const prose = page.locator('[data-testid="task-description-editor"] .ProseMirror, [data-testid="tenant-doc-collab-editor"] .ProseMirror').first();

  await prose.scrollIntoViewIfNeeded();
  await prose.click({ force: true });
  await page.waitForTimeout(80);
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("/", { delay: 15 });
  await page.waitForTimeout(250);
  const menu = page.getByTestId("sce-writing-insert-menu");
  await menu.waitFor({ state: "attached", timeout: 15_000 });
  await menu.scrollIntoViewIfNeeded();
  if (!(await menu.isVisible())) {
    throw new Error("Insert menu attached but not visible — check shell overflow clipping");
  }

  let keyboardNavigated = false;
  const initialItemCount = await page.locator("[data-sce-writing-insert-item]").count();
  if (initialItemCount > 1) {
    const firstSelected = await page
      .locator('[data-sce-writing-insert-item][aria-selected="true"]')
      .first()
      .getAttribute("data-sce-writing-insert-item");
    await page.keyboard.press("ArrowDown");
    const afterDown = await page
      .locator('[data-sce-writing-insert-item][aria-selected="true"]')
      .first()
      .getAttribute("data-sce-writing-insert-item");
    keyboardNavigated = firstSelected !== afterDown;
    if (!keyboardNavigated) {
      throw new Error("ArrowDown did not change insert menu selection (initial menu)");
    }
    await page.keyboard.press("ArrowUp");
  }

  if (menuScreenshotPath) {
    await captureFullViewportShellEvidence(page, menuScreenshotPath);
  }

  await page.keyboard.press("Escape");
  await menu.waitFor({ state: "hidden", timeout: 5_000 });

  await prose.click({ force: true });
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("/", { delay: 15 });
  await page.waitForTimeout(250);
  await menu.waitFor({ state: "attached", timeout: 15_000 });
  await menu.scrollIntoViewIfNeeded();
  if (!(await menu.isVisible())) {
    throw new Error("Insert menu attached but not visible — check shell overflow clipping");
  }

  if (filterText) {
    await page.keyboard.type(filterText, { delay: 12 });
  }

  const item = page.locator(`[data-sce-writing-insert-item="${selectItemId}"]`).first();
  await item.waitFor({ state: "visible", timeout: 10_000 });

  const itemCount = await page.locator("[data-sce-writing-insert-item]").count();

  let activeId = await page
    .locator('[data-sce-writing-insert-item][aria-selected="true"]')
    .first()
    .getAttribute("data-sce-writing-insert-item");
  for (let step = 0; step < Math.max(itemCount, 1) + 2 && activeId !== selectItemId; step += 1) {
    await page.keyboard.press("ArrowDown");
    activeId = await page
      .locator('[data-sce-writing-insert-item][aria-selected="true"]')
      .first()
      .getAttribute("data-sce-writing-insert-item");
  }
  if (activeId !== selectItemId) {
    throw new Error(
      `Enter insert target mismatch: expected ${selectItemId}, active ${activeId ?? "null"}`,
    );
  }

  await page
    .locator(`[data-sce-writing-insert-item="${selectItemId}"][aria-selected="true"]`)
    .first()
    .waitFor({ state: "visible", timeout: 5_000 });
  await prose.evaluate((el) => {
    el.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await menu.waitFor({ state: "hidden", timeout: 10_000 });

  if (selectItemId === "task-list") {
    const hasTaskList = await prose.evaluate(
      (el) =>
        !!el.querySelector('ul[data-type="taskList"]') ||
        !!el.querySelector("ul.task-description-checklist") ||
        !!el.querySelector('li[data-checked]'),
    );
    if (!hasTaskList) throw new Error("Insert menu did not create task list");
  }
  if (selectItemId === "heading-2") {
    const hasHeading = await prose.evaluate((el) => !!el.querySelector("h2"));
    if (!hasHeading) throw new Error("Insert menu did not create heading 2");
  }
  if (selectItemId === "bullet-list") {
    const hasBullet = await prose.evaluate((el) => !!el.querySelector("ul:not([data-type])"));
    if (!hasBullet) throw new Error("Insert menu did not create bullet list");
  }

  await page.keyboard.type(` INSERT-${Date.now()}`, { delay: 8 });

  return {
    selectItemId,
    escapeDismissed: true,
    keyboardNavigated,
    enterInserted: true,
  };
}