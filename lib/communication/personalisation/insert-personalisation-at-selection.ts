/**
 * Insert text at the current selection in a subject input or body textarea.
 */
export function insertPersonalisationAtSelection(input: {
  element: HTMLInputElement | HTMLTextAreaElement | null;
  currentValue: string;
  token: string;
  onValueChange: (next: string) => void;
}): void {
  const { element, currentValue, token, onValueChange } = input;
  if (element) {
    const start = element.selectionStart ?? currentValue.length;
    const end = element.selectionEnd ?? currentValue.length;
    const next = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;
    onValueChange(next);
    requestAnimationFrame(() => {
      element.focus();
      const pos = start + token.length;
      element.setSelectionRange(pos, pos);
    });
    return;
  }
  onValueChange(`${currentValue}${token}`);
}
