import Markdown from 'react-markdown';

interface HRMarkdownProps {
  content: string;
  className?: string;
}

export function HRMarkdown({ content, className = '' }: HRMarkdownProps) {
  return (
    <Markdown
      className={className}
      components={{
        p: ({ node, ...props }) => <p className="text-base mb-3 last:mb-0" {...props} />,
        ul: ({ node, ...props }) => <ul className="my-2 ml-4 list-disc" {...props} />,
        ol: ({ node, ...props }) => <ol className="my-2 ml-4 list-decimal" {...props} />,
        li: ({ node, ...props }) => <li className="text-base mb-1" {...props} />,
        h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mt-6 mb-4" {...props} />,
        h2: ({ node, ...props }) => <h2 className="text-2xl font-semibold mt-5 mb-3" {...props} />,
        h3: ({ node, ...props }) => <h3 className="text-xl font-semibold mt-4 mb-2" {...props} />,
        h4: ({ node, ...props }) => <h4 className="text-lg font-medium mt-3 mb-2" {...props} />,
        h5: ({ node, ...props }) => <h5 className="text-base font-medium mt-2 mb-1" {...props} />,
        h6: ({ node, ...props }) => <h6 className="text-sm font-medium mt-2 mb-1" {...props} />,
        blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-300 pl-4 py-2 italic my-4" {...props} />,
        a: ({ node, ...props }) => <a className="text-blue-600 hover:underline" {...props} />,
        strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
        em: ({ node, ...props }) => <em className="italic" {...props} />,
        hr: ({ node, ...props }) => <hr className="my-6 border-t border-gray-300" {...props} />,
      }}
    >
      {content}
    </Markdown>
  );
}