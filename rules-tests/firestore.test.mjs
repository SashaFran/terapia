import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, deleteDoc, where, Timestamp } from 'firebase/firestore';

let env;
const patient = (uid) => ({ uid, nombre: 'Paciente ficticio', dni: '12345678', activo: true,
  accesoEstado: 'activa', sesionHasta: Timestamp.fromMillis(Date.now() + 600000),
  fechaFinAcceso: Timestamp.fromMillis(Date.now() + 3600000), archivodni: null });
const database = (uid) => env.authenticatedContext(uid).firestore();
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-patient-access', firestore: { rules: await readFile('firestore.rules', 'utf8') } });
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'pacientes/p1'), patient('u1'));
    await setDoc(doc(db, 'pacientes/p2'), patient('u2'));
    await setDoc(doc(db, 'asignaciones/a1'), { pacienteId: 'p1', testId: 'k10', estado: 'pendiente' });
    await setDoc(doc(db, 'asignaciones/a2'), { pacienteId: 'p2', testId: 'bfq', estado: 'pendiente' });
    await setDoc(doc(db, 'resultados/r1'), { pacienteId: 'p1', testId: 'k10' });
    await setDoc(doc(db, 'accesosPaciente/p1'), { tokenHash: 'secret', estado: 'activa' });
  });
});
after(async () => { await env?.cleanup(); });

test('anonymous queries and cross-patient reads fail; scoped assignment query succeeds', async () => {
  await assertFails(getDocs(collection(env.unauthenticatedContext().firestore(), 'pacientes')));
  await assertFails(getDoc(doc(database('u2'), 'pacientes/p1')));
  await assertFails(getDoc(doc(database('u2'), 'asignaciones/a1')));
  await assertFails(getDocs(collection(database('u1'), 'asignaciones')));
  await assertSucceeds(getDocs(query(collection(database('u1'), 'asignaciones'), where('pacienteId', '==', 'p1'))));
  await assertSucceeds(getDoc(doc(database('u1'), 'pacientes/p1')));
});
test('DNI updates require ownership, current access, expected types and bounded URLs', async () => {
  const ref = doc(database('u1'), 'pacientes/p1');
  await assertSucceeds(updateDoc(ref, { archivodni: 'https://res.cloudinary.com/demo/image/upload/dni.png', dni_public_id: 'dni' }));
  await assertFails(updateDoc(ref, { archivodni: 4 }));
  await assertFails(updateDoc(ref, { archivodni: 'javascript:alert(1)' }));
  await assertFails(updateDoc(ref, { archivodni: 'https://res.cloudinary.com/' + 'a'.repeat(3000) }));
  await assertFails(updateDoc(ref, { dni_public_id: 'a'.repeat(513) }));
  await assertFails(updateDoc(doc(database('u2'), 'pacientes/p1'), { archivodni: 'https://res.cloudinary.com/demo/dni.png', dni_public_id: 'dni' }));
  await env.withSecurityRulesDisabled(context => updateDoc(doc(context.firestore(), 'pacientes/p1'), { activo: false }));
  await assertFails(updateDoc(ref, { archivodni: 'https://res.cloudinary.com/demo/dni.png', dni_public_id: 'dni' }));
});
test('patients cannot change identity, dates, access state, privileges, or add fields', async () => {
  const ref = doc(database('u1'), 'pacientes/p1');
  for (const change of [{ uid: 'u2' }, { activo: true }, { accesoEstado: 'activa', sesionHasta: Timestamp.fromMillis(Date.now() + 9000000) },
    { admin: true }, { extraData: 'x' }, { fechaFinAcceso: Timestamp.fromMillis(Date.now() + 9000000) }]) {
    // Set a different activo value, since a no-op update doesn't modify a field.
    if ('activo' in change) change.activo = false;
    await assertFails(updateDoc(ref, change));
  }
  await assertFails(setDoc(ref, { uid: 'u1' }));
  await assertFails(setDoc(doc(database('u1'), 'pacientes/new'), patient('u2')));
  await assertFails(deleteDoc(ref));
});
test('authoritative transitions, results, capability and progress writes are server-only', async () => {
  const db = database('u1');
  await assertFails(updateDoc(doc(db, 'asignaciones/a1'), { estado: 'completado' }));
  await assertFails(setDoc(doc(db, 'asignaciones/new'), { pacienteId: 'p1', testId: 'k10', estado: 'pendiente' }));
  await assertFails(setDoc(doc(db, 'resultados/new'), { pacienteId: 'p1', testId: 'k10' }));
  await assertFails(getDoc(doc(db, 'resultados/r1')));
  await assertFails(getDoc(doc(db, 'accesosPaciente/p1')));
  await assertFails(setDoc(doc(db, 'accesosPaciente/p1'), { estado: 'activa' }));
  await assertFails(setDoc(doc(db, 'test_progress/p1_k10'), { userId: 'p1', testId: 'k10', data: {}, updatedAt: Timestamp.now() }));
  await assertFails(setDoc(doc(db, 'pacientes/p1/private/x'), { extra: true }));
});
test('expired sessions and orphaned parents cannot read assignments', async () => {
  await env.withSecurityRulesDisabled(context => updateDoc(doc(context.firestore(), 'pacientes/p1'), { sesionHasta: Timestamp.fromMillis(1) }));
  await assertFails(getDoc(doc(database('u1'), 'asignaciones/a1')));
  await env.withSecurityRulesDisabled(context => deleteDoc(doc(context.firestore(), 'pacientes/p1')));
  await assertFails(getDoc(doc(database('u1'), 'asignaciones/a1')));
});
test('administration uses verified claims and retains dashboard reads', async () => {
  const db = env.authenticatedContext('admin', { admin: true }).firestore();
  for (const name of ['pacientes', 'asignaciones', 'resultados', 'sesiones']) await assertSucceeds(getDocs(collection(db, name)));
  await assertFails(getDocs(collection(database('admin'), 'pacientes')));
});
