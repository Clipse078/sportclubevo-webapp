/**
 * SCE-DS2-05B-R10 — desktop header crest box.
 *
 * The crest sits in the navigation spine brand rail. That rail is a fixed-width
 * flex row. A raw `<img>` is a shrinkable flex item once preflight sets
 * `max-width: 100%` (automatic minimum size 0). The club name then takes the
 * rail and the crest width collapses. The crest slot is a non-replaced box
 * with a definite size; the image is painted inside it.
 */

export type HeaderCrestBox = {
  flex: "0 0 auto";
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
};

export function headerCrestBox(size: number): HeaderCrestBox {
  return {
    flex: "0 0 auto",
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    maxWidth: size,
  };
}

export type BrandRailFlexItem = {
  flexShrink: number;
  flexBasis: number;
  minWidth: number;
};

export function resolveBrandRailItemWidths(input: {
  railContentWidth: number;
  gap: number;
  crest: BrandRailFlexItem;
  nameMaxContent: number;
  nameFlexShrink: number;
  nameMinWidth: number;
}): { crestWidth: number; nameWidth: number } {
  const available = Math.max(0, input.railContentWidth - input.gap);
  const crestBase = input.crest.flexBasis;
  const nameBase = input.nameMaxContent;

  if (input.crest.flexShrink === 0) {
    const crestWidth = Math.max(input.crest.minWidth, crestBase);
    const nameWidth = Math.max(0, Math.min(nameBase, available - crestWidth));
    return { crestWidth, nameWidth };
  }

  const overflow = crestBase + nameBase - available;
  if (overflow <= 0) {
    return { crestWidth: crestBase, nameWidth: nameBase };
  }

  const crestWeight = input.crest.flexShrink * Math.max(crestBase, 1);
  const nameWeight = input.nameFlexShrink * Math.max(nameBase, 1);
  const weight = crestWeight + nameWeight;
  const crestWidth =
    weight === 0
      ? input.crest.minWidth
      : Math.max(
          input.crest.minWidth,
          crestBase - (overflow * crestWeight) / weight,
        );
  const nameWidth =
    input.nameFlexShrink === 0 || weight === 0
      ? nameBase
      : Math.max(
          input.nameMinWidth,
          nameBase - (overflow * nameWeight) / weight,
        );
  return { crestWidth, nameWidth };
}
