import { expect, it, vi } from 'vitest';
import { formatearTiempoTest } from '../src/utils/tiempoTest';
import { generarPdfResultado } from '../src/utils/generarPdfResultado';

const pdf = vi.hoisted(() => ({
  setFontSize: vi.fn(), text: vi.fn(), save: vi.fn(), output: vi.fn(() => new Blob(['pdf'])),
}));
const table = vi.hoisted(() => vi.fn());
vi.mock('jspdf', () => ({ default: class { constructor() { return pdf; } } }));
vi.mock('jspdf-autotable', () => ({ default: table }));

it.each([[0, '0 min 0 s'], [65000, '1 min 5 s'], [1800000, '30 min 0 s'],
  [null, 'No registrado'], [undefined, 'No registrado'], [-1, 'No registrado'], [NaN, 'No registrado']])(
  'formats %s as %s', (value, expected) => expect(formatearTiempoTest(value)).toBe(expected),
);

it('includes duration in a ZIP PDF and keeps date above the answers for legacy results', async () => {
  await generarPdfResultado({ pacienteNombre: 'Prueba', devolverBlob: true,
    resultado: { testId: 'k10', tiempoTotalMs: 65000, respuestas: [1], fecha: new Date() } });
  expect(pdf.text).toHaveBeenCalledWith('Tiempo utilizado: 1 min 5 s', 14, 125);
  expect(pdf.text).toHaveBeenCalledWith('Paciente: Prueba', 14, 30);
  expect(pdf.save).not.toHaveBeenCalled();
  await generarPdfResultado({ pacienteNombre: 'Prueba', resultado: { testId: 'k10', respuestas: [1], fecha: new Date() } });
  expect(pdf.text).toHaveBeenCalledWith('Tiempo utilizado: No registrado', 14, 125);
  expect(table.mock.calls.at(-1)?.[1].startY).toBe(145);
  expect(pdf.save).toHaveBeenCalledTimes(1);
});
