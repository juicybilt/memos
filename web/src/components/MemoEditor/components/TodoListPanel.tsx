import { useCallback, useEffect, useRef, useState } from "react";
import { PlusIcon, TrashIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEditorContext } from "../state";

interface TodoItem {
  id: string;
  text: string;
}

let _counter = 0;
const generateId = () => `todo-${++_counter}-${Date.now()}`;

const TASK_LINE_RE = /^- \[[ xX]\] /;

function parseContent(content: string): { preContent: string; items: TodoItem[]; postContent: string } {
  const lines = content.split("\n");
  let firstTaskIdx = -1;
  let lastTaskIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (TASK_LINE_RE.test(lines[i])) {
      if (firstTaskIdx === -1) firstTaskIdx = i;
      lastTaskIdx = i;
    }
  }

  if (firstTaskIdx === -1) {
    // No existing task items — start with one empty item
    return {
      preContent: content.trimEnd(),
      items: [{ id: generateId(), text: "" }],
      postContent: "",
    };
  }

  const preLines = lines.slice(0, firstTaskIdx);
  const taskLines = lines.slice(firstTaskIdx, lastTaskIdx + 1);
  const postLines = lines.slice(lastTaskIdx + 1);

  // Trim trailing blank lines from pre-content
  while (preLines.length > 0 && preLines[preLines.length - 1] === "") preLines.pop();
  // Trim leading blank lines from post-content
  while (postLines.length > 0 && postLines[0] === "") postLines.shift();

  return {
    preContent: preLines.join("\n"),
    items: taskLines.map((line) => ({
      id: generateId(),
      text: line.replace(TASK_LINE_RE, ""),
    })),
    postContent: postLines.join("\n"),
  };
}

function buildContent(preContent: string, items: TodoItem[], postContent: string): string {
  const taskLines = items.map((item) => `- [ ] ${item.text}`);
  const parts: string[] = [];
  if (preContent) {
    parts.push(preContent);
    parts.push("");
  }
  parts.push(...taskLines);
  if (postContent) {
    parts.push("");
    parts.push(postContent);
  }
  return parts.join("\n");
}

interface TodoListPanelProps {
  onClose: () => void;
}

export const TodoListPanel: React.FC<TodoListPanelProps> = ({ onClose }) => {
  const { state, actions, dispatch } = useEditorContext();

  // Capture pre/post content once on mount so surrounding text is preserved
  const surroundRef = useRef<{ preContent: string; postContent: string } | null>(null);

  const [items, setItems] = useState<TodoItem[]>(() => {
    const parsed = parseContent(state.content);
    surroundRef.current = { preContent: parsed.preContent, postContent: parsed.postContent };
    return parsed.items;
  });

  // Only sync to editor content when items actually change (not on initial mount).
  // Using a ref comparison is StrictMode-safe: React's double-invoke in dev keeps
  // the same array reference for the initial state, so both effect runs will see
  // prevRef === items and skip. Only a real setItems call produces a new reference.
  const prevItemsRef = useRef(items);

  useEffect(() => {
    if (prevItemsRef.current === items) return;
    prevItemsRef.current = items;
    const { preContent, postContent } = surroundRef.current!;
    const newContent = buildContent(preContent, items, postContent);
    dispatch(actions.updateContent(newContent));
  }, [items, dispatch, actions]);

  // Refs for auto-focus on newly added items
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const handleAddItem = useCallback(() => {
    const newId = generateId();
    setItems((prev) => [...prev, { id: newId, text: "" }]);
    // Focus the new input after render
    requestAnimationFrame(() => {
      inputRefs.current.get(newId)?.focus();
    });
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      // Always keep at least one (empty) item so the panel isn't empty
      return next.length === 0 ? [{ id: generateId(), text: "" }] : next;
    });
  }, []);

  const handleChangeItem = useCallback((id: string, text: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, text } : item)));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, id: string, text: string) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddItem();
      }
      if (e.key === "Backspace" && text === "" && items.length > 1) {
        e.preventDefault();
        handleRemoveItem(id);
      }
    },
    [handleAddItem, handleRemoveItem, items.length],
  );

  return (
    <div className="w-full border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Todo List</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground hover:text-foreground"
          onClick={onClose}
          aria-label="Close todo list panel"
        >
          <XIcon className="size-3.5" />
        </Button>
      </div>

      {/* Items */}
      <div className="p-2 flex flex-col gap-0.5">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              "group flex items-center gap-2 px-2 py-1 rounded-md",
              "hover:bg-muted/50 transition-colors",
            )}
          >
            {/* Decorative checkbox outline */}
            <div className="size-3.5 rounded border border-muted-foreground/40 shrink-0" />

            <input
              ref={(el) => {
                if (el) inputRefs.current.set(item.id, el);
                else inputRefs.current.delete(item.id);
              }}
              type="text"
              value={item.text}
              placeholder={`Item ${index + 1}`}
              onChange={(e) => handleChangeItem(item.id, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, item.id, item.text)}
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/40 min-w-0"
            />

            <button
              type="button"
              onClick={() => handleRemoveItem(item.id)}
              aria-label="Remove item"
              className={cn(
                "shrink-0 p-0.5 rounded text-muted-foreground/50",
                "opacity-0 group-hover:opacity-100 transition-opacity",
                "hover:text-destructive hover:bg-destructive/10",
              )}
            >
              <TrashIcon className="size-3.5" />
            </button>
          </div>
        ))}

        {/* Add item button */}
        <button
          type="button"
          onClick={handleAddItem}
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-md mt-0.5",
            "text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50",
            "transition-colors",
          )}
        >
          <PlusIcon className="size-3.5" />
          <span>Add item</span>
        </button>
      </div>
    </div>
  );
};
