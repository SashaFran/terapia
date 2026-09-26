import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTestEngine } from '../src/components/Tests/helpers/useTestEngine';

vi.mock('../src/firebase/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({ doc: () => ({}), setDoc: async () => undefined }));
vi.mock('../src/components/Tests/helpers/useCameraCapture', () => ({
  useCameraCapture: () => ({ imageUrl: 'test-photo', publicId: 'photo', CameraComponent: () => null }),
}));

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-26T12:00:00Z')); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('test timing', () => {
  it('warns at five minutes, keeps the clock running, and submits the latest answers once', async () => {
    const onFinish = vi.fn().mockResolvedValue(undefined);
    let answers = [1];
    const { result, rerender } = renderHook(() => useTestEngine({
      userId: 'p1', testId: 'k10', timeLimitMs: 30 * 60000, onFinish,
      getResult: () => ({ respuestas: answers, score: 3 }),
    }));
    act(() => result.current.start());
    await act(() => vi.advanceTimersByTimeAsync(25 * 60000 - 1000));
    expect(result.current.feedback).toBeNull();
    await act(() => vi.advanceTimersByTimeAsync(1000));
    const view = render(result.current.feedback);
    expect(screen.getByRole('alert').textContent).toContain('Quedan 5 minutos');
    expect(result.current.minutes).toBe(5);
    answers = [1, 2];
    rerender();
    await act(() => vi.advanceTimersByTimeAsync(5 * 60000));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0][0]).toMatchObject({ respuestas: [1, 2], tiempoTotalMs: 1800000, out_of_time: true });
    await act(() => vi.advanceTimersByTimeAsync(60000));
    expect(onFinish).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it('keeps the original elapsed time and payload on a failed save retry', async () => {
    const onFinish = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const { result } = renderHook(() => useTestEngine({ userId: 'p1', testId: 'bfq', timeLimitMs: 1800000, onFinish }));
    act(() => result.current.start());
    await act(() => vi.advanceTimersByTimeAsync(65000));
    await act(async () => { await expect(result.current.submit({ respuestas: [4] })).rejects.toThrow('offline'); });
    expect(result.current.inputLocked).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(120000));
    await act(() => result.current.submit({ respuestas: [5] }));
    expect(onFinish.mock.calls[1][0]).toMatchObject({ respuestas: [4], tiempoTotalMs: 65000, out_of_time: false });
    expect(onFinish.mock.calls[1][0]).toBe(onFinish.mock.calls[0][0]);
  });

  it('does not submit twice when a manual finish coincides with expiration', async () => {
    const onFinish = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useTestEngine({ userId: 'p1', testId: 'raven', timeLimitMs: 6000, onFinish }));
    act(() => result.current.start());
    await act(() => vi.advanceTimersByTimeAsync(5000));
    await act(() => result.current.submit({ respuestas: [1] }));
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0][0].tiempoTotalMs).toBe(5000);
  });
});
