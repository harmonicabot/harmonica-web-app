'use client';

import { useState, useEffect, useRef } from 'react';
import { QuestionInfo, QuestionType } from 'app/create/types';
import QuestionModal from 'app/create/QuestionModal';
import { QuestionContainer } from 'app/create/QuestionContainer';
import { Button } from '@/components/ui/button';

interface FormBuilderProps {
  questions: QuestionInfo[];
  onQuestionsUpdate: (questions: QuestionInfo[]) => void;
}

export function FormBuilder({
  questions: initialQuestions,
  onQuestionsUpdate,
}: FormBuilderProps) {
  const [questions, setQuestions] = useState<QuestionInfo[]>(initialQuestions);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionInfo | null>(
    null,
  );
  const prevInitialQuestionsRef = useRef<string>(JSON.stringify(initialQuestions));
  const isUserActionRef = useRef(false);

  // Update local state when initialQuestions change (only if different to avoid loops)
  useEffect(() => {
    const currentInitial = JSON.stringify(initialQuestions);
    if (currentInitial !== prevInitialQuestionsRef.current && !isUserActionRef.current) {
      setQuestions(initialQuestions);
      prevInitialQuestionsRef.current = currentInitial;
    }
    isUserActionRef.current = false;
  }, [initialQuestions]);

  const addOrUpdateQuestion = () => {
    if (!currentQuestion) return;

    const cleanedQuestion = {
      ...currentQuestion,
      options: currentQuestion.options
        ?.map((opt: string) => opt.trim())
        ?.filter((opt: string) => opt !== ''),
    };

    isUserActionRef.current = true;
    setQuestions((prev) => {
      const editingIndex = prev.findIndex((q) => q.id === currentQuestion.id);
      let updated;
      if (editingIndex >= 0) {
        updated = prev.map((q) =>
          q.id === currentQuestion.id ? cleanedQuestion : q,
        );
      } else {
        updated = [...prev, cleanedQuestion];
      }
      // Notify parent of the change
      onQuestionsUpdate(updated);
      return updated;
    });

    setModalOpen(false);
    setCurrentQuestion(null);
  };

  const handleDelete = (index: number) => {
    isUserActionRef.current = true;
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
    // Notify parent of the change
    onQuestionsUpdate(updatedQuestions);
  };

  const handleReorder = (reorderedQuestions: QuestionInfo[]) => {
    isUserActionRef.current = true;
    setQuestions(reorderedQuestions);
    // Notify parent of the change
    onQuestionsUpdate(reorderedQuestions);
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

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Pre-survey Form Questions</h3>
        <p className="text-sm text-muted-foreground">
          Collect information from participants before they start the session.
        </p>
      </div>

      <div className="bg-white rounded-lg border p-4">
        <QuestionContainer
          questions={questions}
          openModal={openModal}
          handleDelete={handleDelete}
          onReorder={handleReorder}
        />
      </div>

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

