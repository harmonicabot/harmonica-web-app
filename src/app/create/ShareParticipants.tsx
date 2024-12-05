import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import QuestionList from './QuestionList';
import QuestionModal from './QuestionModal';
import { ClipboardList, Plus } from 'lucide-react';
import EmptyQuestions from './EmptyQuestions';
import { QuestionInfo, QuestionType, isQuestionType } from './types';

interface ShareParticipantsProps {
  onQuestionsUpdate: (questions: QuestionInfo[]) => void;
}

export default function ShareParticipants({ onQuestionsUpdate }: ShareParticipantsProps) {
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
    }
  ]);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionInfo | null>(null);

  const addOrUpdateQuestion = () => {
    if (!currentQuestion) return;

    const cleanedQuestion = {
      ...currentQuestion,
      options: currentQuestion.options
        ?.map(opt => opt.trim())
        ?.filter(opt => opt !== '')
    };

    setQuestions(prev => {
      const editingIndex = prev.findIndex(q => q.id === currentQuestion.id);
      if (editingIndex >= 0) {
        return prev.map((q) => 
          q.id === currentQuestion.id ? cleanedQuestion : q
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

  const openModal = (question?: QuestionInfo) => {
    setCurrentQuestion(() => question || {
      id: Math.random().toString(36).substr(2, 9),
      label: '',
      type: QuestionType.SHORT_FIELD,
      typeValue: 'SHORT_FIELD',
      required: false,
      options: [],
      optionsInput: ''
    });
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

  // Update questions state to notify parent
  useEffect(() => {
    onQuestionsUpdate(questions);
  }, [questions, onQuestionsUpdate]);

  return (
    <div   className="bg-white mx-auto p-10 rounded-xl shadow p-6">
      <div className="space-y-2.5 mb-8">
        <h2 className="text-2xl font-semibold">Your participants</h2>
        <p className="text-base text-black pt-8 font-semibold">
          What information do you want participants to share?
        </p>
        <p className="text-sm">
          This information can be used to identify responses in your results.
        </p>
      </div>

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