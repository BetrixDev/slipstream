import Markdown from "react-markdown";

export function StyledMarkdown({ children }: { children: string }) {
  return (
    <Markdown
      components={{
        h1: ({ node, ...props }) => (
          <h1 className="text-4xl font-semibold text-primary mb-4" {...props} />
        ),
        h2: ({ node, ...props }) => (
          <h2 className="text-3xl text-primary mt-6 mb-4" {...props} />
        ),
        h3: ({ node, ...props }) => (
          <h3 className="text-xl text-primary mt-4 mb-2" {...props} />
        ),
        p: ({ node, ...props }) => <p className="mb-4 font-[300]" {...props} />,
        ul: ({ node, ...props }) => (
          <ul className="list-disc list-inside mb-4" {...props} />
        ),
        li: ({ node, ...props }) => <li className="mb-2" {...props} />,
        a: ({ node, ...props }) => (
          <a className="text-blue-400 hover:underline" {...props} />
        ),
        code: ({ node, ...props }) => (
          <code className="bg-gray-200 p-1 rounded" {...props} />
        ),
      }}
    >
      {children}
    </Markdown>
  );
}
