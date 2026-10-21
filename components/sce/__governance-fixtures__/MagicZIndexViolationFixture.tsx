/** DS-11 governance test fixture — unexplained z-index in canonical SCE tree. */
export function MagicZIndexViolationFixture() {
  return <div className="fixed z-[999]">Floating rogue layer</div>;
}
