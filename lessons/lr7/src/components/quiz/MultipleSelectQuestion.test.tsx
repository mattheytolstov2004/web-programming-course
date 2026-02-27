import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MultipleSelectQuestion } from './MultipleSelectQuestion';

const mockQuestion = {
  id: 'q1',
  type: 'multiple' as const,
  question: 'Which are React hooks?',
  options: ['useState', 'useEffect', 'useClass', 'useMemo'],
  difficulty: 'easy' as const,
  correctAnswers: [0,1],
};

describe('MultipleSelectQuestion', () => {
  it('renders all options', () => {
    render(
      <MultipleSelectQuestion
        question={mockQuestion}
        selectedAnswers={[]}
        onToggleAnswer={() => {}}
      />
    );
    expect(screen.getByText(/useState/)).toBeInTheDocument();
    expect(screen.getByText(/useEffect/)).toBeInTheDocument();
    expect(screen.getByText(/useClass/)).toBeInTheDocument();
    expect(screen.getByText(/useMemo/)).toBeInTheDocument();
  });

  it('calls onToggleAnswer', async () => {
    const handleToggle = vi.fn();
    render(
      <MultipleSelectQuestion
        question={mockQuestion}
        selectedAnswers={[]}
        onToggleAnswer={handleToggle}
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByText(/useState/));
    expect(handleToggle).toHaveBeenCalledWith(0);
  });
});
