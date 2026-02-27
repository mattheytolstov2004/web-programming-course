import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { QuizButton } from './QuizButton';

describe('QuizButton', () => {
  it('renders with children text', () => {
    render(<QuizButton onClick={() => {}}>Click me</QuizButton>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<QuizButton onClick={handleClick}>Submit</QuizButton>);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<QuizButton onClick={() => {}} disabled>Disabled</QuizButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    render(<QuizButton onClick={handleClick} disabled>Disabled</QuizButton>);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies primary variant styles by default', () => {
    render(<QuizButton onClick={() => {}}>Primary</QuizButton>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-blue-500');
  });

  it('applies secondary variant styles when specified', () => {
    render(<QuizButton onClick={() => {}} variant="secondary">Secondary</QuizButton>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-gray-200');
  });
});