import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import TestK10 from '../src/components/Tests/TestK10/TestK10';
import TestLaminas from '../src/components/Tests/TestLaminas/TestLaminas';
import { K10_TEST } from '../src/data/tests/k10';

const engine = vi.hoisted(() => ({ submit: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../src/components/Tests/helpers/useTestEngine', () => ({
  useTestEngine: () => ({ started: true, inputLocked: false, minutes: 29, seconds: 59, submit: engine.submit }),
}));
afterEach(() => { cleanup(); engine.submit.mockClear(); });

describe('assessment presentation', () => {
  it('preserves K10 answers when navigating and only submits a complete questionnaire', () => {
    render(<MemoryRouter><TestK10 userId="preview" /></MemoryRouter>);
    expect((screen.getByRole('button', { name: 'Siguiente' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getAllByRole('radio')[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect((screen.getAllByRole('radio')[1] as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Pregunta 10, pendiente' }));
    expect((screen.getByRole('button', { name: 'Finalizar test' }) as HTMLButtonElement).disabled).toBe(true);
    for (let i = 1; i < K10_TEST.preguntas.length; i++) {
      fireEvent.click(screen.getByRole('button', { name: `Pregunta ${i + 1}, pendiente` }));
      fireEvent.click(screen.getAllByRole('radio')[1]);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar test' }));
    expect(engine.submit).toHaveBeenCalledWith(expect.objectContaining({
      respuestas: Array(10).fill(K10_TEST.opciones[1].valor), metodo: 'K10',
    }));
  });

  it('collects both image groups in one assessment and submits the labelled answers', () => {
    render(<TestLaminas userId="preview" onFinish={vi.fn()} />);
    const fields = screen.getAllByRole('textbox');
    expect(fields).toHaveLength(11);
    expect((screen.getByRole('button', { name: 'Finalizar evaluación completa' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(fields[0], { target: { value: 'Respuesta Zulliger' } });
    fireEvent.change(fields[3], { target: { value: 'Respuesta Bender' } });
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar evaluación completa' }));
    expect(engine.submit).toHaveBeenCalledWith(expect.objectContaining({
      respuestas: expect.arrayContaining([
        { pregunta: 'Zulliger 1', respuesta: 'Respuesta Zulliger' },
        { pregunta: 'Bender 1', respuesta: 'Respuesta Bender' },
      ]),
    }));
  });
});
