"use client";
import type { Editor } from "@tiptap/react";
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered,
  Undo2, Redo2,
  Minus, Quote, Highlighter,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ToolbarProps {
  editor: Editor;
}

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        h-8 w-8 flex items-center justify-center rounded-md transition-colors
        ${active
          ? "bg-primary/10 text-primary border border-primary/20"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-border mx-1" />;
}

function FontSelect({ editor }: { editor: Editor }) {
  const currentFont = editor.getAttributes("textStyle").fontFamily || "Inter";

  return (
    <select
      value={currentFont}
      onChange={(e) => {
        if (e.target.value === "default") {
          editor.chain().focus().unsetFontFamily().run();
        } else {
          editor.chain().focus().setFontFamily(e.target.value).run();
        }
      }}
      title="Font family"
      className="h-8 text-xs bg-transparent border border-border rounded-md px-2 pr-6 text-foreground cursor-pointer hover:bg-accent focus:outline-none focus:ring-1 focus:ring-primary/30 appearance-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
        backgroundPosition: "right 4px center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "16px",
      }}
    >
      <option value="Inter">Inter</option>
      <option value="Arial">Arial</option>
      <option value="Helvetica">Helvetica</option>
      <option value="Courier New">Courier New</option>
      <option value="default">System Default</option>
    </select>
  );
}

function HeadingDropdown({ editor }: { editor: Editor }) {
  const level = editor.isActive("heading", { level: 1 })
    ? "1"
    : editor.isActive("heading", { level: 2 })
    ? "2"
    : editor.isActive("heading", { level: 3 })
    ? "3"
    : editor.isActive("heading", { level: 4 })
    ? "4"
    : "p";

  return (
    <select
      value={level}
      onChange={(e) => {
        const val = e.target.value;
        if (val === "p") {
          editor.chain().focus().setParagraph().run();
        } else {
          editor
            .chain()
            .focus()
            .setHeading({ level: parseInt(val) as 1 | 2 | 3 | 4 })
            .run();
        }
      }}
      title="Block type"
      className="h-8 text-xs bg-transparent border border-border rounded-md px-2 pr-6 text-foreground cursor-pointer hover:bg-accent focus:outline-none focus:ring-1 focus:ring-primary/30 min-w-[110px] appearance-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
        backgroundPosition: "right 4px center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "16px",
      }}
    >
      <option value="p">Normal Text</option>
      <option value="1">Heading 1</option>
      <option value="2">Heading 2</option>
      <option value="3">Heading 3</option>
      <option value="4">Heading 4</option>
    </select>
  );
}

export function EditorToolbar({ editor }: ToolbarProps) {
  const mobileActions = [
    { label: "Undo", action: () => editor.chain().focus().undo().run() },
    { label: "Redo", action: () => editor.chain().focus().redo().run() },
    { label: "Normal Text", action: () => editor.chain().focus().setParagraph().run() },
    { label: "Heading 1", action: () => editor.chain().focus().setHeading({ level: 1 }).run() },
    { label: "Heading 2", action: () => editor.chain().focus().setHeading({ level: 2 }).run() },
    { label: "Bold", action: () => editor.chain().focus().toggleBold().run() },
    { label: "Italic", action: () => editor.chain().focus().toggleItalic().run() },
    { label: "Underline", action: () => editor.chain().focus().toggleUnderline().run() },
    { label: "Highlight", action: () => editor.chain().focus().toggleHighlight().run() },
    { label: "Align Left", action: () => editor.chain().focus().setTextAlign("left").run() },
    { label: "Align Center", action: () => editor.chain().focus().setTextAlign("center").run() },
    { label: "Justify", action: () => editor.chain().focus().setTextAlign("justify").run() },
    { label: "Bullet List", action: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Numbered List", action: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Quote", action: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "Divider", action: () => editor.chain().focus().setHorizontalRule().run() },
  ];

  return (
    <>
      <div className="flex items-center justify-between border-b border-border bg-accent/30 px-3 py-2 shrink-0 sm:hidden">
        <span className="text-xs font-medium text-muted-foreground">Edit document</span>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground">
            Formatting
            <ChevronDown className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48">
            {mobileActions.map((item) => (
              <DropdownMenuItem key={item.label} onClick={item.action}>
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="hidden border-b border-border bg-accent/30 px-3 py-1.5 shrink-0 sm:flex sm:flex-wrap sm:items-center sm:gap-1">
      {/* Undo/Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (Ctrl+Z)"
      >
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (Ctrl+Y)"
      >
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Font & Heading */}
      <FontSelect editor={editor} />
      <HeadingDropdown editor={editor} />

      <ToolbarDivider />

      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="Underline (Ctrl+U)"
      >
        <Underline className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        active={editor.isActive("highlight")}
        title="Highlight"
      >
        <Highlighter className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title="Align left"
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title="Align center"
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        title="Align right"
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        active={editor.isActive({ textAlign: "justify" })}
        title="Justify"
      >
        <AlignJustify className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Bullet list"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Numbered list"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Blocks */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        title="Block quote"
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal rule"
      >
        <Minus className="h-4 w-4" />
      </ToolbarButton>
      </div>
    </>
  );
}
