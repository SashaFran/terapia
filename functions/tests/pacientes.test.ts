// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  docs: new Map<string, any>(), users: new Map<string, any>(), counter: 0,
  failBatch: false, failDelete: false,
}));
const email = vi.hoisted(() => vi.fn());
vi.mock('resend', () => ({ Resend: class { emails = { send: email }; } }));

vi.mock('firebase-admin', () => {
  const snapshot = (path: string) => ({ id: path.split('/')[1], ref: reference(path),
    exists: state.docs.has(path), data: () => state.docs.get(path) });
  const reference = (path: string): any => ({ path, id: path.split('/')[1],
    get: async () => snapshot(path), delete: async () => { state.docs.delete(path); } });
  const collection = (name: string) => ({
    doc: (id = `id${++state.counter}`) => reference(`${name}/${id}`),
    where: (field: string, _op: string, value: unknown) => {
      let limit = Infinity;
      const query = { limit: (n: number) => { limit = n; return query; }, get: async () => {
        const docs = [...state.docs].filter(([path, data]) => path.startsWith(`${name}/`) && data[field] === value)
          .slice(0, limit).map(([path]) => snapshot(path));
        return { docs, empty: docs.length === 0 };
      } };
      return query;
    },
  });
  const db = {
    collection,
    runTransaction: async (fn: any) => fn({
      get: (ref: any) => ref.get(),
      set: (ref: any, value: any) => state.docs.set(ref.path, value),
      delete: (ref: any) => state.docs.delete(ref.path),
    }),
    batch: () => {
      const writes: (() => void)[] = [];
      return {
        set: (ref: any, data: any) => writes.push(() => { state.docs.set(ref.path, data); }),
        delete: (ref: any) => writes.push(() => { state.docs.delete(ref.path); }),
        commit: async () => { if (state.failBatch) throw new Error('write failed'); writes.forEach((fn) => fn()); },
      };
    },
  };
  const auth = {
    getUserByEmail: async (email: string) => {
      const user = [...state.users.values()].find((u) => u.email === email);
      if (!user) throw { code: 'auth/user-not-found' };
      return user;
    },
    createUser: async (data: any) => {
      if ([...state.users.values()].some((u) => u.email === data.email)) throw { code: 'auth/email-already-exists' };
      const user = { uid: `uid${++state.counter}`, ...data };
      state.users.set(user.uid, user);
      return user;
    },
    deleteUser: async (uid: string) => {
      if (state.failDelete) throw new Error('auth failed');
      state.users.delete(uid);
    },
  };
  return { initializeApp: vi.fn(), auth: () => auth, firestore: Object.assign(() => db, {
    Timestamp: { fromDate: (date: Date) => date, fromMillis: (ms: number) => new Date(ms) },
    FieldValue: { serverTimestamp: () => new Date() },
  }) };
});

import { crearPaciente, eliminarPaciente, validarAlta } from '../src/pacientes';
import { crearPacienteAuth, eliminarPacienteAuth } from '../src/index';

const alta = { nombre: 'Paciente ficticio', dni: '12345678', contacto: 'paciente@example.com',
  fechaIngreso: '2099-01-01', testsSeleccionados: ['k10', 'bfq', 'raven'] };
beforeEach(() => { vi.stubEnv('RESEND_API_KEY', ''); vi.spyOn(console, 'error').mockImplementation(() => {}); state.docs.clear(); state.users.clear(); state.counter = 0; state.failBatch = false; state.failDelete = false; });

afterEach(() => vi.unstubAllEnvs());

it('creates the patient with every selected assignment under the same patient ID', async () => {
  const result = await crearPaciente(alta);
  const asignaciones = [...state.docs].filter(([path]) => path.startsWith('asignaciones/')).map(([, data]) => data);
  expect(asignaciones.map((a) => a.testId)).toEqual(alta.testsSeleccionados);
  expect(asignaciones.every((a) => a.pacienteId === result.pacienteId && a.estado === 'pendiente')).toBe(true);
  expect(state.docs.get(`pacientes/${result.pacienteId}`).uid).toBe(result.uid);
});

it('emails only the assessment count and explains preparation and single-use access', async () => {
  vi.stubEnv('RESEND_API_KEY', 'test-key-not-real');
  email.mockResolvedValue({ error: null });
  await crearPaciente(alta);
  const html = email.mock.calls.at(-1)?.[0].html;
  expect(html).toContain('3 evaluaciones asignadas');
  expect(html).toContain('30 minutos');
  expect(html).toContain('JPEG, JPG o PNG');
  expect(html).toContain('computadora con cámara');
  expect(html).toContain('inhabilitada');
  expect(html).not.toMatch(/BFQ|Big Five|Raven|K10/i);
});

it('allows recreation after deleting both Auth and patient data', async () => {
  const first = await crearPaciente(alta);
  state.docs.set('resultados/r1', { pacienteId: first.pacienteId });
  state.docs.set('test_progress/t1', { userId: first.pacienteId });
  state.docs.set(`accesosPaciente/${first.pacienteId}`, { estado: 'activa' });
  await eliminarPaciente(first.pacienteId, 'admin');
  expect(state.users.size).toBe(0);
  expect(state.docs.size).toBe(0);
  const second = await crearPaciente(alta);
  expect(second.uid).not.toBe(first.uid);
});

it('refuses an existing Auth account without deleting it', async () => {
  state.users.set('legacy', { uid: 'legacy', email: '12345678@paciente.com' });
  await expect(crearPaciente(alta)).rejects.toMatchObject({ code: 'already-exists' });
  expect(state.users.has('legacy')).toBe(true);
  expect(state.docs.size).toBe(0);
});

it('refuses an existing patient without changing assignments', async () => {
  const patient = await crearPaciente(alta);
  const documentCount = state.docs.size;
  await expect(crearPaciente(alta)).rejects.toMatchObject({ code: 'already-exists' });
  expect(state.users.has(patient.uid)).toBe(true);
  expect(state.docs.size).toBe(documentCount);
});

it('does not replace a privileged or otherwise linked account', async () => {
  state.users.set('admin', { uid: 'admin', email: '12345678@paciente.com', customClaims: { admin: true } });
  await expect(crearPaciente(alta)).rejects.toMatchObject({ code: 'already-exists' });
  expect(state.users.has('admin')).toBe(true);
  state.users.set('admin', { uid: 'admin', email: '12345678@paciente.com' });
  state.docs.set('pacientes/other', { uid: 'admin', dni: '87654321' });
  await expect(crearPaciente(alta)).rejects.toMatchObject({ code: 'already-exists' });
});

it('rolls back a new Auth user when saving assignments fails', async () => {
  state.failBatch = true;
  await expect(crearPaciente(alta)).rejects.toThrow('write failed');
  expect(state.users.size).toBe(0);
  expect(state.docs.size).toBe(0);
});

it('retains the profile when Auth deletion fails, allowing a retry', async () => {
  const patient = await crearPaciente(alta);
  state.failDelete = true;
  await expect(eliminarPaciente(patient.pacienteId, 'admin')).rejects.toThrow('auth failed');
  expect(state.docs.has(`pacientes/${patient.pacienteId}`)).toBe(true);
  state.failDelete = false;
  await eliminarPaciente(patient.pacienteId, 'admin');
  expect(state.docs.size).toBe(0);
});

it('retries a partial deletion after Auth was already removed', async () => {
  const patient = await crearPaciente(alta);
  state.failBatch = true;
  await expect(eliminarPaciente(patient.pacienteId, 'admin')).rejects.toThrow('write failed');
  expect(state.users.size).toBe(0);
  expect(state.docs.has(`pacientes/${patient.pacienteId}`)).toBe(true);
  state.failBatch = false;
  await eliminarPaciente(patient.pacienteId, 'admin');
  expect(state.docs.size).toBe(0);
});

it('rejects concurrent operations for the same DNI', async () => {
  const first = crearPaciente(alta);
  await expect(crearPaciente(alta)).rejects.toMatchObject({ code: 'aborted' });
  await first;
});

it.each([{ ...alta, testsSeleccionados: [] }, { ...alta, testsSeleccionados: ['unknown'] },
  { ...alta, contacto: '' }, { ...alta, contacto: 'invalid' }, { ...alta, dni: '1234' }, { ...alta, fechaIngreso: '2099-02-31' }])('validates input before Auth changes', (input) => {
  expect(() => validarAlta(input)).toThrow();
  expect(state.users.size).toBe(0);
});

it('rejects anonymous and patient callers even with a local admin role', async () => {
  await expect(crearPacienteAuth.run(alta, {} as any)).rejects.toMatchObject({ code: 'unauthenticated' });
  const context = { auth: { uid: 'patient', token: { rol: 'admin' } } } as any;
  await expect(crearPacienteAuth.run(alta, context)).rejects.toMatchObject({ code: 'permission-denied' });
  await expect(eliminarPacienteAuth.run({ pacienteId: 'p' }, context)).rejects.toMatchObject({ code: 'permission-denied' });
});
