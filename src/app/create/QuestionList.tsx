import { Button } from '@/components/ui/button';
import { Pencil, Trash } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { QuestionInfo } from './types';

interface QuestionListProps {
  questions: QuestionInfo[];
  openModal: (question?: QuestionInfo) => void;
  handleDelete: (index: number) => void;
}

const QuestionList: React.FC<QuestionListProps> = ({ questions, openModal, handleDelete }) => {
  return (
    <>
      {questions.map((question, index) => (
        <div key={index} className="flex items-center justify-between mt-4 p-3 me-6 border rounded">
          <div className="flex-1">
            <p className="font-medium">
              {question.label}
              {question.required && <span className="text-black">*</span>}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Type: {question.type}
            </p>
            {question.type === 'Options' && question.options && question.options.length > 0 && (
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
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => openModal(question)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={() => handleDelete(index)}>
              <Trash className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </>
  );
};

export default QuestionList; 