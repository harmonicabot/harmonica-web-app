import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Pencil, Trash, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { QuestionInfo } from './types';

interface QuestionListProps {
  questions: QuestionInfo[];
  openModal: (question?: QuestionInfo) => void;
  handleDelete: (index: number) => void;
}

const SortableQuestion = ({
  question,
  index,
  openModal,
  handleDelete,
}: {
  question: QuestionInfo;
  index: number;
  openModal: (question?: QuestionInfo) => void;
  handleDelete: (index: number) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
    position: 'relative' as const,
    backgroundColor: 'white',
    opacity: isDragging ? 1 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between mt-4 p-3 me-6 border rounded bg-white shadow-sm
        ${isDragging ? 'shadow-md ring-2 ring-black ring-opacity-5' : ''}`}
    >
      <div className="flex items-center gap-3">
        <button
          className="cursor-grab hover:bg-gray-100 p-1 rounded touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </button>
        <div className="flex-1">
          <p className="font-medium">
            {question.label}
            {question.required && <span className="text-black">*</span>}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Type: {question.type}
          </p>
          {question.type === 'Options' &&
            question.options &&
            question.options.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {question.options.map((option, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="bg-black text-white hover:bg-black"
                  >
                    {option}
                  </Badge>
                ))}
              </div>
            )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="outline" onClick={() => openModal(question)}>
          <Pencil className="w-4 h-4" />
        </Button>
        <Button variant="outline" onClick={() => handleDelete(index)}>
          <Trash className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

const QuestionList: React.FC<QuestionListProps> = ({
  questions,
  openModal,
  handleDelete,
}) => {
  return (
    <>
      {questions.map((question, index) => (
        <SortableQuestion
          key={question.id}
          question={question}
          index={index}
          openModal={openModal}
          handleDelete={handleDelete}
        />
      ))}
    </>
  );
};

export default QuestionList;
