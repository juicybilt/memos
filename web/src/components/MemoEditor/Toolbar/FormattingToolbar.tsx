import {
  BoldIcon,
  CheckSquareIcon,
  CodeIcon,
  Heading2Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  QuoteIcon,
  StrikethroughIcon,
  SquareCodeIcon,
} from "lucide-react";
import { type FC, type RefObject, useCallback } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { EditorRefActions } from "../Editor";
import { insertHyperlink } from "../Editor/shortcuts";

interface FormattingToolbarProps {
  editorRef: RefObject<EditorRefActions | null>;
}

interface ToolbarAction {
  icon: FC<{ className?: string }>;
  label: string;
  shortcut?: string;
  action: (editor: EditorRefActions) => void;
  separator?: boolean;
}

function toggleWrap(editor: EditorRefActions, delimiter: string) {
  const cursor = editor.getCursorPosition();
  const selected = editor.getSelectedContent();
  if (selected.startsWith(delimiter) && selected.endsWith(delimiter) && selected.length >= delimiter.length * 2) {
    const unwrapped = selected.slice(delimiter.length, -delimiter.length);
    editor.insertText(unwrapped);
    editor.setCursorPosition(cursor, cursor + unwrapped.length);
  } else {
    editor.insertText(`${delimiter}${selected}${delimiter}`);
    if (selected.length === 0) {
      editor.setCursorPosition(cursor + delimiter.length);
    } else {
      editor.setCursorPosition(cursor + delimiter.length, cursor + delimiter.length + selected.length);
    }
  }
}

function toggleLinePrefix(editor: EditorRefActions, prefix: string) {
  const lineNumber = editor.getCursorLineNumber();
  const line = editor.getLine(lineNumber);
  if (line.startsWith(prefix)) {
    editor.setLine(lineNumber, line.slice(prefix.length));
  } else {
    // Remove any existing heading/list prefixes before applying new one
    const cleaned = line.replace(/^(#{1,6}\s|[-*+]\s|\d+[.)]\s|- \[[ xX]\]\s|>\s)/, "");
    editor.setLine(lineNumber, prefix + cleaned);
  }
}

const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const modKey = isMac ? "⌘" : "Ctrl+";

const ACTIONS: ToolbarAction[] = [
  {
    icon: Heading2Icon,
    label: "Heading",
    action: (e) => toggleLinePrefix(e, "## "),
  },
  {
    icon: BoldIcon,
    label: "Bold",
    shortcut: `${modKey}B`,
    action: (e) => toggleWrap(e, "**"),
  },
  {
    icon: ItalicIcon,
    label: "Italic",
    shortcut: `${modKey}I`,
    action: (e) => toggleWrap(e, "*"),
  },
  {
    icon: StrikethroughIcon,
    label: "Strikethrough",
    action: (e) => toggleWrap(e, "~~"),
  },
  {
    icon: CodeIcon,
    label: "Inline Code",
    action: (e) => toggleWrap(e, "`"),
    separator: true,
  },
  {
    icon: ListIcon,
    label: "Bullet List",
    action: (e) => toggleLinePrefix(e, "- "),
  },
  {
    icon: ListOrderedIcon,
    label: "Numbered List",
    action: (e) => toggleLinePrefix(e, "1. "),
  },
  {
    icon: CheckSquareIcon,
    label: "Task List",
    action: (e) => toggleLinePrefix(e, "- [ ] "),
    separator: true,
  },
  {
    icon: QuoteIcon,
    label: "Quote",
    action: (e) => toggleLinePrefix(e, "> "),
  },
  {
    icon: SquareCodeIcon,
    label: "Code Block",
    action: (e) => {
      const selected = e.getSelectedContent();
      if (selected) {
        e.insertText("", "```\n", "\n```");
      } else {
        const cursor = e.getCursorPosition();
        e.insertText("```\n\n```");
        e.setCursorPosition(cursor + 4);
      }
    },
  },
  {
    icon: LinkIcon,
    label: "Link",
    shortcut: `${modKey}K`,
    action: (e) => insertHyperlink(e),
  },
  {
    icon: MinusIcon,
    label: "Horizontal Rule",
    action: (e) => {
      const cursor = e.getCursorPosition();
      const content = e.getContent();
      const needsNewline = cursor > 0 && content[cursor - 1] !== "\n";
      e.insertText(`${needsNewline ? "\n" : ""}---\n`);
    },
  },
];

const FormattingToolbar: FC<FormattingToolbarProps> = ({ editorRef }) => {
  const handleAction = useCallback(
    (action: ToolbarAction["action"]) => {
      const editor = editorRef.current;
      if (!editor) return;
      action(editor);
      editor.focus();
    },
    [editorRef],
  );

  return (
    <div className="w-full flex flex-row items-center gap-0.5 py-1 overflow-x-auto" role="toolbar" aria-label="Formatting options">
      {ACTIONS.map((action, i) => (
        <span key={action.label} className="contents">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors",
                  "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                )}
                onClick={() => handleAction(action.action)}
                aria-label={action.label}
              >
                <action.icon className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              {action.label}
              {action.shortcut && <span className="ml-1.5 text-xs opacity-70">{action.shortcut}</span>}
            </TooltipContent>
          </Tooltip>
          {action.separator && i < ACTIONS.length - 1 && <div className="mx-0.5 h-4 w-px bg-border shrink-0" />}
        </span>
      ))}
    </div>
  );
};

export default FormattingToolbar;
