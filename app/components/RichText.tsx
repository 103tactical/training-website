import type { ReactNode } from "react";

interface LexicalNode {
  type: string;
  children?: LexicalNode[];
  text?: string;
  format?: number;
  // link nodes
  url?: string;
  fields?: { url?: string; newTab?: boolean; linkType?: string };
  // list nodes
  listType?: string;
}

// Lexical text format bit flags
const FORMAT_BOLD      = 1;
const FORMAT_ITALIC    = 2;
const FORMAT_UNDERLINE = 8;

function renderNode(node: LexicalNode, key: string | number): ReactNode {
  switch (node.type) {
    case "root":
      return node.children?.map((child, i) => renderNode(child, i));

    case "paragraph": {
      const children = node.children?.map((child, i) => renderNode(child, i));
      // Render empty paragraphs as a line break spacer
      const isEmpty = !node.children?.length || node.children.every((c) => c.type === "text" && !c.text);
      return isEmpty ? <br key={key} /> : <p key={key} className="richtext__p">{children}</p>;
    }

    case "text": {
      const fmt = node.format ?? 0;
      let content: ReactNode = node.text ?? "";
      if (fmt & FORMAT_UNDERLINE) content = <u>{content}</u>;
      if (fmt & FORMAT_ITALIC)    content = <em>{content}</em>;
      if (fmt & FORMAT_BOLD)      content = <strong>{content}</strong>;
      return <span key={key}>{content}</span>;
    }

    case "link":
    case "autolink": {
      const url     = node.fields?.url ?? node.url ?? "#";
      const newTab  = node.fields?.newTab ?? false;
      return (
        <a
          key={key}
          href={url}
          className="richtext__link"
          target={newTab ? "_blank" : undefined}
          rel={newTab ? "noopener noreferrer" : undefined}
        >
          {node.children?.map((child, i) => renderNode(child, i))}
        </a>
      );
    }

    case "list":
      return (
        <ul key={key} className="richtext__list">
          {node.children?.map((child, i) => renderNode(child, i))}
        </ul>
      );

    case "listitem":
      return (
        <li key={key} className="richtext__listitem">
          {node.children?.map((child, i) => renderNode(child, i))}
        </li>
      );

    default:
      return null;
  }
}

interface RichTextProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  className?: string;
}

export default function RichText({ content, className }: RichTextProps) {
  if (!content?.root) return null;
  return (
    <div className={`richtext${className ? ` ${className}` : ""}`}>
      {(content.root.children as LexicalNode[]).map((node, i) => renderNode(node, i))}
    </div>
  );
}
