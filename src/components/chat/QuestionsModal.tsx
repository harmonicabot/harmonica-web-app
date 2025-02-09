import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { QuestionInfo, QuestionType } from 'app/create/types';

interface QuestionsModalProps {
  questions: QuestionInfo[];
  onSubmit: (answers: Record<string, string>) => void;
}

export const QuestionsModal = ({
  questions,
  onSubmit,
}: QuestionsModalProps) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInputChange = (id: string, value: string, type: QuestionType) => {
    setAnswers({ ...answers, [id]: value });
  };

  const handleInputBlur = (id: string, value: string, type: QuestionType) => {
    setTouched({ ...touched, [id]: true });

    if (type === QuestionType.EMAIL) {
      const question = questions.find((q) => q.id === id);
      if (question?.required && !value) {
        setErrors({ ...errors, [id]: 'Email is required' });
      } else if (value && !validateEmail(value)) {
        setErrors({ ...errors, [id]: 'Please enter a valid email address' });
      } else {
        const newErrors = { ...errors };
        delete newErrors[id];
        setErrors(newErrors);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    questions.forEach((q) => {
      if (q.required && !answers[q.id]) {
        newErrors[q.id] = `${q.label} is required`;
      }
      if (
        q.type === QuestionType.EMAIL &&
        answers[q.id] &&
        !validateEmail(answers[q.id])
      ) {
        newErrors[q.id] = 'Please enter a valid email address';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Transform answers from id:value to label:value
    const transformedAnswers = Object.entries(answers).reduce(
      (acc, [id, value]) => {
        const question = questions.find((q) => q.id === id);
        return {
          ...acc,
          [question?.label || id]: value,
        };
      },
      {},
    );

    const finalAnswers = {
      ...transformedAnswers,
      preferred_language: answers.preferred_language || 'English',
    };

    onSubmit(finalAnswers);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-[calc(100%-2rem)] max-w-lg bg-white h-5/6 overflow-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-gray-900">
            A bit about you
          </CardTitle>
          <CardDescription className="text-gray-500">
            Share a few details about you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {questions.map((q, index) => (
                <div key={`_${index}`} className="space-y-2">
                  <Label className="text-gray-700">
                    {q.label}{' '}
                    {q.required && <span className="text-gray-400">*</span>}
                  </Label>
                  {q.type === QuestionType.OPTIONS && q.options ? (
                    <Select
                      required={q.required}
                      onValueChange={(value) =>
                        handleInputChange(q.id, value, q.type)
                      }
                      value={answers[q.id]}
                    >
                      <SelectTrigger className="w-full bg-white border-gray-200 focus:ring-gray-200">
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from(new Set(q.options)).map((opt, index) => (
                          <SelectItem
                            key={`${q.id}_${opt}`}
                            value={opt}
                            className="text-gray-700"
                          >
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="space-y-1">
                      <Input
                        type={q.type === QuestionType.EMAIL ? 'email' : 'text'}
                        required={q.required}
                        value={answers[q.id] || ''}
                        onChange={(e) =>
                          handleInputChange(q.id, e.target.value, q.type)
                        }
                        onBlur={(e) =>
                          handleInputBlur(q.id, e.target.value, q.type)
                        }
                        className="bg-white border-gray-200 focus:ring-gray-200"
                      />
                      {touched[q.id] && errors[q.id] && (
                        <p className="text-sm text-red-500">{errors[q.id]}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Language Selector */}
              <div className="space-y-2">
                <Label className="text-gray-700">Select Language</Label>
                <Select
                  onValueChange={(value) =>
                    handleInputChange(
                      'preferred_language',
                      value,
                      QuestionType.OPTIONS,
                    )
                  }
                  value={answers['preferred_language'] || 'en'}
                >
                  <SelectTrigger className="w-[200px] bg-white border-gray-200 focus:ring-gray-200">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                      <SelectItem
                        key={`lang_${code}`}
                        value={code}
                        className="text-gray-700"
                      >
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Button
                type="submit"
                className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white"
              >
                Get started <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export const SUPPORTED_LANGUAGES = {
  en: 'English',
  ar: 'Arabic',
  bn: 'Bengali',
  zh: 'Chinese',
  cs: 'Czech',
  da: 'Danish',
  nl: 'Dutch',
  fi: 'Finnish',
  fr: 'French',
  de: 'German',
  el: 'Greek',
  he: 'Hebrew',
  hi: 'Hindi',
  hu: 'Hungarian',
  id: 'Indonesian',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  no: 'Norwegian',
  fa: 'Persian',
  pl: 'Polish',
  pt: 'Portuguese',
  ro: 'Romanian',
  ru: 'Russian',
  es: 'Spanish',
  sv: 'Swedish',
  th: 'Thai',
  tr: 'Turkish',
  uk: 'Ukrainian',
  vi: 'Vietnamese',
} as const;
