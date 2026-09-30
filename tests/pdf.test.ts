import { expect, it, vi } from 'vitest';
import { formatearTiempoTest } from '../src/utils/tiempoTest';
import { generarPdfResultado } from '../src/utils/generarPdfResultado';

const pdf = vi.hoisted(() => ({ docs: [] as any[] }));
vi.mock('jspdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jspdf')>();
  return { ...actual, default: class extends actual.default {
    constructor(options: any) {
      super(options);
      vi.spyOn(this, 'text');
      vi.spyOn(this, 'save').mockReturnValue(this);
      pdf.docs.push(this);
    }
  } };
});

it.each([[0, '0 min 0 s'], [65000, '1 min 5 s'], [1800000, '30 min 0 s'],
  [null, 'No registrado'], [undefined, 'No registrado'], [-1, 'No registrado'], [NaN, 'No registrado']])(
  'formats %s as %s', (value, expected) => expect(formatearTiempoTest(value)).toBe(expected),
);

it('includes duration and patient details in the current PDF layout, including legacy results', async () => {
  const blob = await generarPdfResultado({ pacienteNombre: 'Prueba', devolverBlob: true,
    resultado: { testId: 'k10', tiempoTotalMs: 65000, respuestas: [1], fecha: new Date() } });
  const first = pdf.docs.at(-1);
  expect(blob).toBeInstanceOf(Blob);
  const text = JSON.stringify(first.text.mock.calls);
  expect(text).toContain('1 min 5 s');
  expect(text).toContain('Prueba');
  expect(first.save).not.toHaveBeenCalled();
  await generarPdfResultado({ pacienteNombre: 'Prueba', resultado: { testId: 'k10', respuestas: [1], fecha: new Date() } });
  const legacy = pdf.docs.at(-1);
  expect(JSON.stringify(legacy.text.mock.calls)).toContain('No registrado');
  expect(legacy.save).toHaveBeenCalledTimes(1);
});
