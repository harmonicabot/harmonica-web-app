import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuestionInfo, QuestionType } from './types';

interface QuestionModalProps {
  currentQuestion: QuestionInfo | null;
  setCurrentQuestion: React.Dispatch<React.SetStateAction<QuestionInfo | null>>;
  modalOpen: boolean;
  closeModal: () => void;
  addOrUpdateQuestion: () => void;
}

const QuestionModal: React.FC<QuestionModalProps> = ({
  currentQuestion,
  setCurrentQuestion,
  modalOpen,
  closeModal,
  addOrUpdateQuestion,
}) => {
  return (
    modalOpen && (
      <>
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 overflow-hidden" onClick={closeModal} />
        <div className="fixed inset-0 flex items-center justify-center z-50 overflow-hidden">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md relative">
            <h2 className="text-2xl font-semibold">
              {currentQuestion?.label ? 'Edit Question' : 'Add Question'}
            </h2>
            <p className="pb-6">Add a question before the participant starts</p>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-base">Question</label>
                <input
                  type="text"
                  value={currentQuestion?.label || ''}
                  onChange={(e) => setCurrentQuestion((prev): QuestionInfo => ({
                    ...prev!,
                    label: e.target.value,
                  }))}
                  placeholder="What is your role?"
                  className="border p-2 rounded w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-base">Type</label>
                <Select
                  value={currentQuestion?.type || QuestionType.SHORT_FIELD}
                  onValueChange={(value) => setCurrentQuestion((prev): QuestionInfo => ({
                    ...prev!,
                    type: value as QuestionType
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={0}>
                    <SelectItem value={QuestionType.SHORT_FIELD}>Short field</SelectItem>
                    <SelectItem value={QuestionType.EMAIL}>Email</SelectItem>
                    <SelectItem value={QuestionType.OPTIONS}>Options</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {currentQuestion?.type === 'Options' && (
                <div className="space-y-2">
                  <label className="text-base">Add select options</label>
                  <input
                    type="text"
                    value={currentQuestion.optionsInput || ''}
                    onChange={(e) => setCurrentQuestion((prev): QuestionInfo => ({
                      ...prev!,
                      optionsInput: e.target.value,
                      options: e.target.value.split(',')
                    }))}
                    placeholder="Option 1, Option 2, Option 3"
                    className="border p-2 rounded w-full"
                  />
                  <p className="text-sm text-gray-500">Separate values with comma</p>
                </div>
              )}

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={currentQuestion?.required || false}
                  onChange={(e) => setCurrentQuestion((prev): QuestionInfo => ({
                    ...prev!,
                    required: e.target.checked
                  }))}
                  className="mr-2"
                />
                <span className="text-base">Required</span>
              </label>
            </div>
            <div className="flex justify-between gap-2 mt-8">
              <Button variant="outline" onClick={closeModal}>Back</Button>
              <Button 
                onClick={addOrUpdateQuestion}
                className="normal-case"
                disabled={
                  !currentQuestion?.label || 
                  (currentQuestion.type === 'Options' && 
                   (!currentQuestion.options || currentQuestion.options.length < 2))
                }
              >
                {currentQuestion?.label ? 'Save changes' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      </>
    )
  );
};

export default QuestionModal; 