# Acceso de una sola sesión

El paciente se autentica con Firebase Auth (DNI convertido al email interno existente). El servidor consume el acceso una sola vez y entrega el perfil sin contraseña. La capacidad aleatoria de sesión permanece únicamente en memoria de la pestaña: otra pestaña, una recarga o un login posterior no pueden reabrirla.

Cerrar sesión o recibir `pagehide` cierra toda la cuenta. Las asignaciones completadas y sus resultados se conservan; las restantes pasan a `abandono`. El navegador decide el texto del diálogo nativo al cerrar. El texto personalizado se muestra antes del login y en la confirmación de logout.

Durante una evaluación, `blur`/`visibilitychange` registran un vencimiento de 120 segundos en el servidor. Volver antes del plazo permite continuar sin pausar el tiempo del test. Al vencer se abandona solamente ese test. No se usa el movimiento del mouse como prueba de presencia y el sonido es complementario: puede estar silenciado.

El cierre brusco del equipo, la pérdida de conexión o la suspensión del navegador no garantizan el envío de eventos. La sesión no admite nuevos logins desde que se consumió el acceso; un latido cada 15 segundos renueva un vencimiento de 120 segundos. Una función programada cada minuto materializa el cierre de sesiones vencidas. Por eso el estado visible puede tardar aproximadamente 2–3 minutos en actualizarse tras un cierre sin aviso. No se promete detección instantánea de un proceso terminado ni impedir búsquedas desde otro dispositivo.

## Publicación coordinada

Esta actualización requiere publicar Functions y las reglas, además del frontend. Fusionar la PR solo dispara el despliegue web actual; no publica Firebase Functions.

1. Verificar Firebase Auth Email/Password y las cuentas de pacientes con UID asociado. Las cuentas heredadas sin usuario de Auth necesitan migración administrativa; no se usa la contraseña almacenada en Firestore como alternativa.
2. Revisar las reglas propuestas frente a las reglas actuales de producción y probar con cuentas ficticias. Las reglas de pacientes impiden cambiar `activo`, el estado de acceso, asignaciones y resultados desde el navegador. No desplegar únicamente el frontend.
3. Publicar Functions (`iniciarAccesoPaciente`, `actualizarAccesoPaciente`, `cerrarAccesoPaciente`, `expirarSesionesPaciente`) y las reglas con Firebase CLI. La función programada requiere facturación/Cloud Scheduler habilitados.
4. Publicar el frontend y probar una sesión nueva completa. No reutilizar pacientes reales durante las pruebas: el acceso se consume al ingresar.

Verificar: DNI pendiente en un paciente nuevo, JPG/PNG, cámara denegada antes de iniciar, cambio de pestaña y regreso antes/después de 120 segundos, navegación atrás, abandono explícito, logout, recarga, cierre de pestaña, red desconectada y preservación de resultados completados. Los permisos y el rendimiento de la cámara virtual dependen del sistema operativo y del navegador.

Las reglas son un prototipo que requiere revisión y verificación en emulador antes de publicación amplia. El código no despliega ni modifica reglas de producción automáticamente.
