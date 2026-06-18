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
import { useEffect, useRef } from "react";
import { marked } from "marked";

import { EditorToolbar } from "./editor-toolbar";

// Configure marked for legal document rendering
marked.setOptions({ breaks: true, gfm: true });

interface LegalEditorProps {
  content: string;
  onChange?: (html: string) => void;
  onTextChange?: (text: string) => void;
  editable?: boolean;
  className?: string;
}

/** Convert markdown/plain text (from AI generation) to HTML for the editor */
function plainTextToHtml(text: string): string {
  return marked.parse(text, { async: false }) as string;
}

export function LegalEditor({
  content,
  onChange,
  onTextChange,
  editable = true,
  className = "",
}: LegalEditorProps) {
  const onChangeRef = useRef(onChange);
  const onTextChangeRef = useRef(onTextChange);

  useEffect(() => {
    onChangeRef.current = onChange;
    onTextChangeRef.current = onTextChange;
  }, [onChange, onTextChange]);

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
    onCreate: ({ editor: e }) => {
      onChangeRef.current?.(e.getHTML());
      onTextChangeRef.current?.(e.getText());
    },
    onUpdate: ({ editor: e }) => {
      onChangeRef.current?.(e.getHTML());
      onTextChangeRef.current?.(e.getText());
    },
  });

  // Update content when it changes externally
  useEffect(() => {
    if (!editor) return;
    const newHtml = isHtml ? content : plainTextToHtml(content);
    const currentHtml = editor.getHTML();
    if (newHtml !== currentHtml) {
      editor.commands.setContent(newHtml);
      onChangeRef.current?.(editor.getHTML());
      onTextChangeRef.current?.(editor.getText());
    }
  }, [content, editor, isHtml]);

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
