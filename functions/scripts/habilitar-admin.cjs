const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const [projectId, uid] = process.argv.slice(2);
if (!projectId || !uid) {
  console.error('Uso: node scripts/habilitar-admin.cjs PROYECTO UID_ADMIN');
  process.exit(1);
}
initializeApp({ credential: applicationDefault(), projectId });
(async () => {
  const user = await getAuth().getUser(uid);
  if (!user.email || user.email.endsWith('@paciente.com')) {
    throw new Error('Seleccione una cuenta administradora, no una cuenta de paciente.');
  }
  await getAuth().setCustomUserClaims(uid, { ...user.customClaims, admin: true });
  console.log('Permiso asignado. Cierre sesion y vuelva a ingresar.');
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
