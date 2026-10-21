/** DS-11 governance test fixture — must never ship to production imports. */
export function BinaryCheckboxViolationFixture() {
  return (
    <label>
      Enable feature
      <input type="checkbox" name="enableFeature" />
    </label>
  );
}
