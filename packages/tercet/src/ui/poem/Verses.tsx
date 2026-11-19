import { toStanzas } from "../../poems/text.js";

/** A poem's text as stanzas of lines. Rendered as text nodes only, never as markup. */
export default function Verses({ content }: { content: string }) {
  return (
    <div className="poem-body">
      {toStanzas(content).map((lines, s) => (
        <p key={s} className="stanza">
          {lines.map((line, l) => (
            <span key={l} className="line">
              {line || " "}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}
