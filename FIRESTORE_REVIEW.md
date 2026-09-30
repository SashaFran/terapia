# Revisión de reglas y control de acceso

Modelo y alcance: `firestore.rules` documenta las colecciones existentes. Los pacientes solo pueden leer su perfil, asignaciones/sesiones/progreso durante el acceso habilitado y actualizar los dos campos del DNI. Los administradores autenticados con custom claim `admin: true` son operadores de confianza y conservan sus herramientas. Las transiciones, resultados y progreso del paciente pasan por Functions; `accesosPaciente` no admite acceso desde SDK cliente.

Las pruebas de `rules-tests/firestore.test.mjs` se ejecutan en un proyecto demo mediante el emulador, sin datos ni credenciales de producción. Las pruebas de `functions/tests/accesoPaciente.test.ts` ejercitan las transacciones con un doble de Firestore; no sustituyen al emulador ni a una prueba integrada de navegador.

| Intento de abuso revisado | Defensa y comprobación |
| --- | --- |
| 1. Listado público | Consulta anónima denegada; prueba del emulador. |
| 2. Lectura/escritura ajena | UID del perfil y consultas restringidas por paciente; emulador. |
| 3. Crear válido y actualizar inválido | Pacientes no crean perfiles; DNI valida también updates; emulador. |
| 4. Suplantar propietario al crear | Creación de pacientes/asignaciones/progreso denegada; emulador. |
| 5. Cambiar propietario | UID y campos de identidad fuera de la lista de cambios permitidos; emulador. |
| 6. Modificar fechas inmutables | Fechas y lease solo servidor; emulador. |
| 7. Tipos incorrectos | DNI requiere strings; estado/fechas no editables; emulador. |
| 8. Quitar campos obligatorios | Validador de perfil y lista de campos modificables; emulador. |
| 9. Valores excesivos | URL máximo 2048, public ID 512; emulador. Progreso máximo 200000 caracteres y resultado 300000, validación en Function; prueba de progreso. |
| 10. Omitir campos requeridos | Reemplazo incompleto de perfil denegado; emulador. |
| 11. Elevar privilegios | Solo custom claims, nunca localStorage ni un campo del documento; emulador. |
| 12. Campos arbitrarios | Update paciente limitado a DNI; emulador. Resultados tienen lista de campos aceptados en servidor. El mapa de progreso es no autoritativo y tiene límite de tamaño. |
| 13. Saltar estados | Escritura directa de asignaciones/resultados denegada; emulador. Inicio/abandono/finalización validados en transacción; pruebas de Functions. |
| 14. Ámbitos y rutas | IDs validados y rutas de resultado/progreso construidas por el servidor. URL de DNI solo HTTPS Cloudinary; emulador. La regla no certifica el contenido ni la propiedad de una imagen externa; conserva la integración Cloudinary existente. |
| 15. Manipular timestamps | Fechas y duración de evaluación generadas por servidor; cliente no escribe resultados/progreso; emulador y revisión del código. |
| 16. Negativos/desbordes | Cliente no controla duración/lease. Longitudes acotadas. Scoring mantiene la lógica existente del frontend; no se introduce validación clínica nueva. |
| 17. Fuga entre usuarios | Segundo paciente no puede leer el primero ni su resultado; emulador. Perfil propio sigue siendo privado; el inicio de sesión devuelve un perfil sin contraseña. |
| 18. Repetición de acciones | Token de una sesión; finalización idempotente y reingreso rechazado; pruebas de Functions. |
| 19. Hijos huérfanos | Subcolecciones no autorizadas y asignaciones sin perfil denegadas; emulador. Eliminación administrativa borra también el registro de acceso; prueba de pacientes. |
| 20. Consultas de la aplicación | Listado de asignaciones por paciente y lecturas administrativas; emulador. Inventario del código revisado para pacientes/asignaciones/resultados/sesiones/test_progress. |
| 21. Updates sin validar | El único update directo de paciente exige validPatient, acceso vigente y campos permitidos. Progreso/estado/resultados solo servidor. |

Las reglas son un prototipo sujeto a revisión frente a las reglas actuales de producción. El CI compila y prueba su sintaxis en el emulador. El intento local de validación mediante Firebase CLI `--dry-run` fue bloqueado por permisos de Windows. No se desplegó ninguna regla ni Function desde esta tarea.
