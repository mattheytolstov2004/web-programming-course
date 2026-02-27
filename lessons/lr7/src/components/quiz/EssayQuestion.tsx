import type { Question, EssayQuestionType } from '../../types/quiz';

interface Props {
  question: Question;
  textAnswer: string;
  onTextChange: (text: string) => void;
}

export function EssayQuestion({ question, textAnswer, onTextChange }: Props) {
  if (question.type !== 'essay') {
    return null;
  }

  const essayQuestion = question as EssayQuestionType;

  const charCount: number = textAnswer.length;
  const minLength: number = essayQuestion.minLength ?? 0;
  const maxLength: number = essayQuestion.maxLength ?? 1000;
  const isValid: boolean = charCount >= minLength;

  return (
    <div className="space-y-2">
      <textarea
        value={textAnswer}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          onTextChange(e.target.value)
        }
        placeholder="Введите развернутый ответ..."
        minLength={minLength}
        maxLength={maxLength}
        rows={10}
        className="w-full p-4 border-2 border-gray-300 rounded focus:border-blue-500 focus:outline-none"
      />
      <div className={`text-sm ${isValid ? 'text-gray-500' : 'text-red-500'}`}>
        Символов: {charCount}
        {minLength > 0 && ` (минимум: ${minLength})`}
        {` (максимум: ${maxLength})`}
      </div>
    </div>
  );
}
