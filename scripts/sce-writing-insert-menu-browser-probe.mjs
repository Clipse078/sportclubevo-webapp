/**
 * Shared `/` insert menu probe for SCE writing engine browser gates.
 */
export async function exerciseSceWritingInsertMenu(page, _prose, options) {
  const { selectItemId, filterText = "" } = options;
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

  await item.click();
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
    keyboardSelected: true,
  };
}