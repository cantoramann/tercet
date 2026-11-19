/** True when a keystroke belongs to the user's typing, not to a page shortcut. */
export function isTyping(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return true;
  const target = event.target;
  return (
    target instanceof Element &&
    target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])") !== null
  );
}
