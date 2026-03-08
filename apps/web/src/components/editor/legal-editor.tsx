"use client";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import { useEffect } from "react";

import { EditorToolbar } from "./editor-toolbar";

interface LegalEditorProps {
  content: string;
  onChange?: (html: string) => void;
  onTextChange?: (text: string) => void;
  editable?: boolean;
  className?: string;
}

/** Convert plain text (from AI generation) to basic HTML for the editor */
function plainTextToHtml(text: string): string {
  const lines = text.split("\n");
  const htmlParts: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line === "") {
      htmlParts.push("<p></p>");
      i++;
      continue;
    }

    // All-caps headings (legal style)
    if (
      line === line.toUpperCase() &&
      line.length > 3 &&
      !/^\d/.test(line) &&
      !line.startsWith("---")
    ) {
      htmlParts.push(`<h2>${escHtml(line)}</h2>`);
      i++;
      continue;
    }

    // Lines starting with "ARTICLE" or "SECTION" or "CLAUSE"
    if (/^(ARTICLE|SECTION|CLAUSE|SCHEDULE|ANNEXURE)\s/i.test(line)) {
      htmlParts.push(`<h3>${escHtml(line)}</h3>`);
      i++;
      continue;
    }

    // Numbered sections like "1." "1.1" "a)" etc
    if (/^(\d+\.|\d+\.\d+|\([a-z]\)|\([ivx]+\))/.test(line)) {
      htmlParts.push(`<p>${escHtml(line)}</p>`);
      i++;
      continue;
    }

    // Horizontal rules
    if (/^[-=_]{3,}$/.test(line)) {
      htmlParts.push("<hr>");
      i++;
      continue;
    }

    // Bold markers: **text** or __text__
    let processed = escHtml(line);
    processed = processed.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );
    processed = processed.replace(
      /__(.*?)__/g,
      "<strong>$1</strong>"
    );

    htmlParts.push(`<p>${processed}</p>`);
    i++;
  }

  return htmlParts.join("");
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function LegalEditor({
  content,
  onChange,
  onTextChange,
  editable = true,
  className = "",
}: LegalEditorProps) {
  const isHtml = content.trim().startsWith("<");
  const initialContent = isHtml ? content : plainTextToHtml(content);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        horizontalRule: {},
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({
        placeholder: "Start drafting your legal document...",
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TextStyle,
      FontFamily,
    ],
    content: initialContent,
    editable,
    editorProps: {
      attributes: {
        class: "legal-editor-content",
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange?.(e.getHTML());
      onTextChange?.(e.getText());
    },
  });

  // Update content when it changes externally
  useEffect(() => {
    if (!editor) return;
    const newHtml = isHtml ? content : plainTextToHtml(content);
    const currentHtml = editor.getHTML();
    if (newHtml !== currentHtml) {
      editor.commands.setContent(newHtml);
    }
  }, [content]);

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {editable && editor && <EditorToolbar editor={editor} />}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-950">
        <div className="legal-editor-wrapper max-w-[816px] mx-auto py-8 px-12 min-h-full">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

export { type Editor };
export { plainTextToHtml };
