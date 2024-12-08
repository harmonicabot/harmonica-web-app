import { QuestionInfo } from './types';
import QuestionList from './QuestionList';
import EmptyQuestions from './EmptyQuestions';
import { Button } from '@/components/ui/button';

interface QuestionContainerProps {
  questions: QuestionInfo[];
  openModal: (question?: QuestionInfo) => void;
  handleDelete: (index: number) => void;
}

export function QuestionContainer({ questions, openModal, handleDelete }: QuestionContainerProps) {
  return (
    <>
      {questions.length === 0 ? (
        <EmptyQuestions openModal={openModal} />
      ) : (
        <>
          <QuestionList 
            questions={questions} 
            openModal={openModal} 
            handleDelete={handleDelete} 
          />
          <Button variant="outline" onClick={() => openModal()} className="mt-4">
            + Add Question
          </Button>
        </>
      )}
    </>
  );
} 