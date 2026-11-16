import katex from "katex";
import "katex/dist/katex.min.css";

type MathProps = {
  children: string;
  block?: boolean;
};

/** Only project-authored expressions are rendered; KaTeX trusted commands stay disabled. */
export function Math({ children, block = false }: MathProps) {
  const html = katex.renderToString(children, {
    displayMode: block,
    throwOnError: false,
    trust: false,
    strict: "warn",
    output: "htmlAndMathml",
  });

  return (
    <span
      className={`math-expression ${block ? "math-block" : "math-inline"}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default Math;
