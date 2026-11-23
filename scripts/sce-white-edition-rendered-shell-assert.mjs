/**
 * Disposable browser gate — assert authenticated shell renders DS2 White Edition canvas.
 *
 * Fails when SCE_WHITE_EDITION is off (legacy tactical PNG / blue gutters) while editor
 * functional checks might still pass.
 */

const SHELL_SELECTOR = ".sce-authenticated-app-shell";
const WHITE_RGB = new Set(["rgb(255, 255, 255)", "rgba(255, 255, 255, 1)"]);

/**
 * @param {import('playwright').Page} page
 * @param {{ label?: string; allowDocumentationWhiteSurface?: boolean }} [opts]
 */
export async function assertAuthenticatedWhiteEditionShell(page, opts = {}) {
  const label = opts.label ?? "authenticated-shell";
  const shell = page.locator(SHELL_SELECTOR).first();
  await shell.waitFor({ state: "attached", timeout: 60_000 });

  const theme = await shell.getAttribute("data-sce-theme");
  if (theme !== "white") {
    throw new Error(
      `[${label}] expected data-sce-theme="white" on ${SHELL_SELECTOR}, got "${theme ?? "null"}" — set SCE_WHITE_EDITION=1 on build and server`,
    );
  }

  const canvas = await shell.evaluate((el) => {
    const style = getComputedStyle(el);
    const bgImage = style.backgroundImage ?? "";
    const bgColor = style.backgroundColor ?? "";
  const main = el.querySelector(".sce-app-main-with-mobile-nav");
    const mainBg = main ? getComputedStyle(main).backgroundColor : null;
    return {
      backgroundImage: bgImage,
      backgroundColor: bgColor,
      mainBackgroundColor: mainBg,
    };
  });

  if (canvas.backgroundImage && canvas.backgroundImage !== "none") {
    throw new Error(
      `[${label}] legacy shell background-image still rendered: ${canvas.backgroundImage}`,
    );
  }

  if (!WHITE_RGB.has(canvas.backgroundColor)) {
    throw new Error(
      `[${label}] expected white shell background-color, got ${canvas.backgroundColor}`,
    );
  }

  if (
    canvas.mainBackgroundColor &&
    !WHITE_RGB.has(canvas.mainBackgroundColor)
  ) {
    throw new Error(
      `[${label}] expected white main column background, got ${canvas.mainBackgroundColor}`,
    );
  }

  if (opts.allowDocumentationWhiteSurface) {
    const docSurface = page.getByTestId("tenant-documentation-white-surface");
    const visible = await docSurface.isVisible().catch(() => false);
    if (visible) {
      const docBg = await docSurface.evaluate((el) => getComputedStyle(el).backgroundColor);
      if (!WHITE_RGB.has(docBg)) {
        throw new Error(
          `[${label}] tenant-documentation-white-surface background is ${docBg}, expected white`,
        );
      }
    }
  }

  return { label, theme, canvas };
}

/**
 * @param {import('playwright').Page} page
 * @param {string} outputPath
 * @param {{ viewport?: { width: number; height: number } }} [opts]
 */
export async function captureFullViewportShellEvidence(page, outputPath, opts = {}) {
  const viewport = opts.viewport ?? { width: 1440, height: 900 };
  await page.setViewportSize(viewport);
  await page.screenshot({ path: outputPath, fullPage: false });
  return { outputPath, viewport };
}