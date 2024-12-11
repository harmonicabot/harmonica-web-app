import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { QuestionInfo } from './types';
import QuestionList from './QuestionList';
import EmptyQuestions from './EmptyQuestions';
import { Button } from '@/components/ui/button';

interface QuestionContainerProps {
  questions: QuestionInfo[];
  openModal: (question?: QuestionInfo) => void;
  handleDelete: (index: number) => void;
  onReorder: (questions: QuestionInfo[]) => void;
}

export function QuestionContainer({
  questions,
  openModal,
  handleDelete,
  onReorder,
}: QuestionContainerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);

      onReorder(arrayMove(questions, oldIndex, newIndex));
    }
  };

  return (
    <>
      {questions.length === 0 ? (
        <EmptyQuestions openModal={openModal} />
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={questions.map((q) => q.id)}
              strategy={verticalListSortingStrategy}
            >
              <QuestionList
                questions={questions}
                openModal={openModal}
                handleDelete={handleDelete}
              />
            </SortableContext>
          </DndContext>
          <Button
            variant="outline"
            onClick={() => openModal()}
            className="mt-4"
          >
            + Add Question
          </Button>
        </>
      )}
    </>
  );
}
