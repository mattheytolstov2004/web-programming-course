interface QuizButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export function QuizButton({
  children,
  onClick,
  disabled,
  variant = 'primary'
}: QuizButtonProps) {
  const baseClass = 'px-4 py-2 rounded font-medium transition-colors';
  const variantClass = variant === 'primary'
    ? 'bg-blue-500 text-white hover:bg-blue-600'
    : 'bg-gray-200 text-gray-800 hover:bg-gray-300';
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${variantClass} ${disabledClass}`}
    >
      {children}
    </button>
  );
}