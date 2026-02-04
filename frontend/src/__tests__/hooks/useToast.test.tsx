
import { renderHook, act } from '@testing-library/react';
import { useToast } from '../../../hooks/useToast';
import { describe, it, expect } from 'vitest';

describe('useToast Hook', () => {
  it('should initialize with empty toasts', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it('should add a toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Test Message', 'success');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Test Message');
    expect(result.current.toasts[0].type).toBe('success');
  });

  it('should remove a toast', () => {
    const { result } = renderHook(() => useToast());

    let toastId: string;
    act(() => {
      toastId = result.current.showToast('To be removed');
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      // @ts-ignore - id is assigned inside act
      result.current.removeToast(toastId);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should verify helper methods', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.success('Success msg');
      result.current.error('Error msg');
    });

    expect(result.current.toasts).toHaveLength(2);
    expect(result.current.toasts[0].type).toBe('success');
    expect(result.current.toasts[1].type).toBe('error');
  });
});
