import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import TestK10 from '../src/components/Tests/TestK10/TestK10';
import TestLaminas from '../src/components/Tests/TestLaminas/TestLaminas';
import { K10_TEST } from '../src/data/tests/k10';
import TestBFQ from '../src/components/Tests/TestBFQ/TestBFQ';
import { BFQ_TEST } from '../src/data/tests/BFQ_TEST';
import TestProgress from '../src/components/Tests/helpers/TestProgress';

const engine = vi.hoisted(() => ({ submit: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../src/components/Tests/helpers/useTestEngine', () => ({
  useTestEngine: () => ({ started: true, inputLocked: false, minutes: 29, seconds: 59, submit: engine.submit }),
}));
beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); engine.submit.mockClear(); vi.unstubAllGlobals(); });

describe('assessment presentation', () => {
  it('keeps BFQ answers, announces progress and focuses the selected question', () => {
    render(<MemoryRouter><TestBFQ userId="preview" onFinish={vi.fn()} /></MemoryRouter>);
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: BFQ_TEST.preguntas[0] }));
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
    fireEvent.click(screen.getAllByRole('radio')[2]);
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: BFQ_TEST.preguntas[1] }));
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect((screen.getAllByRole('radio')[2] as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: `Pregunta ${BFQ_TEST.preguntas.length}, pendiente` }));
    expect((screen.getByRole('button', { name: 'Finalizar evaluación' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Faltan .* preguntas por responder/)).toBeTruthy();
    expect(engine.submit).not.toHaveBeenCalled();
  });

  it('moves focus from the image navigator to its response field', () => {
    render(<><TestProgress total={2} completadas={[false, true]} />
      <section id="test-item-0"><textarea aria-label="Respuesta 1" /></section>
      <section id="test-item-1"><textarea aria-label="Respuesta 2" /></section></>);
    fireEvent.click(screen.getByRole('button', { name: 'Ir a lámina 2. Respondida' }));
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Respuesta 2' }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' });
  });
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
