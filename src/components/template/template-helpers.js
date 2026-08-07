/** Shared helpers for editable site templates. */

export function getPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

export function textStyle(content, path, fallbackColor) {
  const style = content?.styles?.[path] || {};
  return {
    color: style.color || fallbackColor,
    fontSize: style.fontSize || undefined,
    fontWeight: style.fontWeight || undefined,
  };
}

export function createTemplateHandlers({ content, editMode, onEdit }) {
  const handle = (path, label, type = "text", fallbackColor) => {
    if (!editMode || !onEdit) return;
    const style = content?.styles?.[path] || {};
    onEdit({
      path,
      label,
      type,
      value: getPath(content, path),
      color: style.color || fallbackColor || "",
      fontSize: style.fontSize || "",
      fontWeight: style.fontWeight || "",
    });
  };

  const editable = () =>
    editMode
      ? "cursor-pointer outline outline-2 outline-transparent transition hover:outline-[#c4a574]/70 rounded-sm"
      : "";

  return { handle, editable };
}
