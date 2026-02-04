
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '@/components/ui/Input';
import { describe, it, expect, vi } from 'vitest';

describe('Input Component', () => {
  it('renders correctly with default props', () => {
    render(<Input placeholder="Enter your name" />);
    const input = screen.getByPlaceholderText(/enter your name/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('flex h-10 w-full');
  });

  it('updates value correctly on change', () => {
    render(<Input placeholder="Type here" />);
    const input = screen.getByPlaceholderText(/type here/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Hello World' } });
    expect(input.value).toBe('Hello World');
  });

  it('renders correctly with different types', () => {
    render(<Input type="password" placeholder="Password" />);
    const input = screen.getByPlaceholderText(/password/i);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Input disabled placeholder="Disabled" />);
    const input = screen.getByPlaceholderText(/disabled/i);
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:opacity-50');
  });
});
