import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { formatearTiempoTest } from '../src/utils/tiempoTest';
import { generarPdfResultado } from '../src/utils/generarPdfResultado';

const pdf = vi.hoisted(() => ({
  setTextColor: vi.fn(), setFillColor: vi.fn(), setDrawColor: vi.fn(),
  setLineWidth: vi.fn(), setFont: vi.fn(), setFontSize: vi.fn(),
  rect: vi.fn(), roundedRect: vi.fn(), line: vi.fn(), addImage: vi.fn(),
  addPage: vi.fn(), setPage: vi.fn(), getNumberOfPages: vi.fn(() => 1),
  splitTextToSize: vi.fn((text: string) => [text]),
  text: vi.fn(), save: vi.fn(), output: vi.fn(() => new Blob(['pdf'])),
}));
const table = vi.hoisted(() => vi.fn());
vi.mock('jspdf', () => ({ default: class { constructor() { return pdf; } } }));
vi.mock('jspdf-autotable', () => ({ default: table }));

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    blob: async () => new Blob(['logo'], { type: 'image/png' }),
  }));

  vi.stubGlobal('Image', class {
    width = 100;
    height = 40;
    naturalWidth = 100;
    naturalHeight = 40;
    onload?: () => void;
    onerror?: () => void;

    set src(_value: string) {
      queueMicrotask(() => this.onload?.());
    }
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it.each([[0, '0 min 0 s'], [65000, '1 min 5 s'], [1800000, '30 min 0 s'],
  [null, 'No registrado'], [undefined, 'No registrado'], [-1, 'No registrado'], [NaN, 'No registrado']])(
  'formats %s as %s', (value, expected) => expect(formatearTiempoTest(value)).toBe(expected),
);

it('includes duration in the PDF and supports legacy results without duration', async () => {
  await generarPdfResultado({ pacienteNombre: 'Prueba', devolverBlob: true,
    resultado: { testId: 'k10', tiempoTotalMs: 65000, respuestas: [1], fecha: new Date() } });
  expect(pdf.text).toHaveBeenCalledWith(['1 min 5 s'], 110, 112);
  expect(pdf.text).toHaveBeenCalledWith(['Prueba'], 25, 92);
  expect(pdf.save).not.toHaveBeenCalled();
  await generarPdfResultado({ pacienteNombre: 'Prueba', resultado: { testId: 'k10', respuestas: [1], fecha: new Date() } });
  expect(pdf.text).toHaveBeenCalledWith(['No registrado'], 110, 112);
  expect(pdf.save).toHaveBeenCalledTimes(1);
});
