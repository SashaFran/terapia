# Activacion de las correcciones

El frontend utiliza las funciones `crearPacienteAuth` y `eliminarPacienteAuth`
en `us-central1`. Publicar solamente GitHub Pages no activa el alta y la baja.
Desplegar primero Firebase y luego integrar el frontend en `main`.

## Firebase

1. En un entorno de confianza con credenciales de administrador del proyecto,
   ejecutar `npm ci` dentro de `functions/`.
2. Habilitar cada cuenta administradora existente con
   `node scripts/habilitar-admin.cjs terapiavr UID_ADMIN` desde `functions/`.
   El script usa Application Default Credentials. No guardar credenciales en Git.
   El permiso es el custom claim `admin: true`; el valor de `localStorage` no autoriza
   operaciones del servidor. Cerrar sesion y volver a ingresar despues.
3. Comprobar que las reglas existentes de Firestore no permitan a clientes escribir
   en `pacienteOperaciones` (coleccion interna de bloqueos). El repositorio no incluye
   las reglas actualmente desplegadas. Las reglas del proyecto deben reservar el alta
   y la baja de pacientes a administradores, y aislar datos por paciente.
4. Desde la raiz: `firebase deploy --only functions:crearPacienteAuth,functions:eliminarPacienteAuth --project terapiavr`.
5. Probar con datos ficticios en un entorno de prueba: alta con varios tests, baja,
   nueva alta con el mismo DNI, y recuperacion de una cuenta de Auth sin perfil.
   Un usuario sin el claim de administrador debe recibir `permission-denied`.
6. Integrar el PR en `main` para ejecutar el despliegue existente de GitHub Pages.

El alta guarda el perfil y todas sus asignaciones en un solo batch de Firestore.
Si falla, elimina la cuenta Auth recien creada cuando puede confirmar que el perfil
no se guardo. Las operaciones simultaneas sobre el mismo DNI se bloquean durante
un maximo de dos minutos (las funciones usan el timeout predeterminado de 60 segundos).
Una baja fallida conserva el perfil para reintentar. Las cuentas antiguas sin perfil
se reemplazan durante el alta solo si no estan vinculadas ni tienen custom claims.

No se borran archivos externos de Cloudinary: la baja elimina Auth y los documentos
de paciente, asignaciones, resultados, sesiones y progreso en Firestore.

## Informes y tiempo

Los nuevos resultados guardan `tiempoTotalMs` y `out_of_time`. Los informes antiguos
sin duracion muestran "No registrado": no se puede reconstruir un tiempo que nunca
se guardo. Los PDFs individuales y dentro del ZIP usan el mismo formato.

El aviso de cinco minutos aparece sin detener el reloj. El cierre automatico usa
las respuestas actuales, y un error al guardar permite reintentar el mismo resultado.

## Verificacion local

Desde la raiz: `npm ci`, `npm test`, `npm run build`.
Desde `functions/`: `npm ci`, `npm run lint`, `npm run build`.
