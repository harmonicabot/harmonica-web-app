import { useState, useEffect } from 'react';
import { QuestionInfo, QuestionType } from './types';
import QuestionModal from './QuestionModal';
import { QuestionContainerHeader } from './QuestionContainerHeader';
import { QuestionContainer } from './QuestionContainer';
import { HRMarkdown } from '@/components/HRMarkdown';
import { Check } from 'lucide-react';

interface ShareParticipantsProps {
  onQuestionsUpdate: (questions: QuestionInfo[]) => void;
  sessionPreview?: string; // Add session preview prop
}

export default function ShareParticipants({
  onQuestionsUpdate,
  sessionPreview,
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
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Session Preview - Left Column */}
        <div className="rounded-xl p-6 h-fit">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-yellow-500" />
              <h3 className="text-lg font-medium">Your Generated Session</h3>
            </div>
            
            {sessionPreview ? (
              <div className="bg-white rounded-lg p-6 border [&_h2]:!text-base [&_h2]:!font-medium">
                <HRMarkdown content={sessionPreview} />
              </div>
            ) : (
              <div className="bg-white rounded-lg p-4 border border-purple-100">
                <div className="text-sm text-gray-500 italic">
                  Session structure will appear here once generated...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Participant Info Form - Right Column */}
        <div className="bg-yellow-50 rounded-2xl border shadow-sm p-8">
          <QuestionContainerHeader />
          <QuestionContainer
            questions={questions}
            openModal={openModal}
            handleDelete={handleDelete}
            onReorder={handleReorder}
          />
        </div>
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
