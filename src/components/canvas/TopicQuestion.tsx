'use client';

interface TopicQuestionProps {
  question: string;
  showAtTop: boolean;
}

export default function TopicQuestion({
  question,
  showAtTop,
}: TopicQuestionProps) {
  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 w-[736px] z-10 transition-all duration-700 ease-in-out ${
        showAtTop ? 'top-8' : 'top-60'
      }`}
    >
      <div className="bg-white border border-border rounded-lg px-7 py-6">
        <ol className="list-decimal ml-8 text-xl font-medium leading-normal">
          <li>
            <span>{question}</span>
          </li>
        </ol>
      </div>
    </div>
  );
}

