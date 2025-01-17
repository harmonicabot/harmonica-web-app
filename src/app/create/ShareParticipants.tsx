import { useState, useEffect } from 'react';
import { QuestionInfo, QuestionType } from './types';
import QuestionModal from './QuestionModal';
import { QuestionContainerHeader } from './QuestionContainerHeader';
import { QuestionContainer } from './QuestionContainer';

interface ShareParticipantsProps {
  onQuestionsUpdate: (questions: QuestionInfo[]) => void;
}

export default function ShareParticipants({
  onQuestionsUpdate,
}: ShareParticipantsProps) {
  const [questions, setQuestions] = useState<QuestionInfo[]>([
    {
      id: 'name',
      label: 'Name',
      type: QuestionType.SHORT_FIELD,
      typeValue: 'SHORT_FIELD',
      required: false,
    },
    {
      id: 'email',
      label: 'Email',
      type: QuestionType.EMAIL,
      typeValue: 'EMAIL',
      required: false,
    },
  ]);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionInfo | null>(
    null,
  );

  const addOrUpdateQuestion = () => {
    if (!currentQuestion) return;

    const cleanedQuestion = {
      ...currentQuestion,
      options: currentQuestion.options
        ?.map((opt) => opt.trim())
        ?.filter((opt) => opt !== ''),
    };

    setQuestions((prev) => {
      const editingIndex = prev.findIndex((q) => q.id === currentQuestion.id);
      if (editingIndex >= 0) {
        return prev.map((q) =>
          q.id === currentQuestion.id ? cleanedQuestion : q,
        );
      } else {
        return [...prev, cleanedQuestion];
      }
    });

    setModalOpen(false);
    setCurrentQuestion(null);
  };

  const handleDelete = (index: number) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
  };

  const handleReorder = (reorderedQuestions: QuestionInfo[]) => {
    setQuestions(reorderedQuestions);
  };

  const openModal = (question?: QuestionInfo) => {
    setCurrentQuestion(
      () =>
        question || {
          id: Math.random().toString(36).substr(2, 9),
          label: '',
          type: QuestionType.SHORT_FIELD,
          typeValue: 'SHORT_FIELD',
          required: false,
          options: [],
          optionsInput: '',
        },
    );
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentQuestion(null);
  };

  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [modalOpen]);

  useEffect(() => {
    onQuestionsUpdate(questions);
  }, [questions, onQuestionsUpdate]);

  return (
    <div className="bg-white mx-auto rounded-xl shadow p-6">
      <QuestionContainerHeader />
      <QuestionContainer
        questions={questions}
        openModal={openModal}
        handleDelete={handleDelete}
        onReorder={handleReorder}
      />
      <QuestionModal
        currentQuestion={currentQuestion}
        setCurrentQuestion={setCurrentQuestion}
        modalOpen={modalOpen}
        closeModal={closeModal}
        addOrUpdateQuestion={addOrUpdateQuestion}
      />
    </div>
  );
}
