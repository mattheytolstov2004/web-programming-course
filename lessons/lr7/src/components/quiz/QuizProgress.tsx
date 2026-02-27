interface Props {
  current: number;
  total: number;
}

export function QuizProgress({ current, total }: Props) {
  const percentage = ((current + 1) / total) * 100;

  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm text-gray-600 mb-2">
        <span>Вопрос {current + 1} из {total}</span>
        <span>{Math.round(percentage)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}