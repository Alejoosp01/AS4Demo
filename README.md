# AS4 Compara

Aplicación de demostración para AS4 Seguros LTDA, agencia colombiana que intermedia seguros de 8 aseguradoras en 5 ramos (Autos, Salud, Vida y accidentes, Hogar y copropiedades, Pymes y RC). Centraliza la captura de la solicitud, genera el comparativo entre aseguradoras y deja registro de la asesoría, la aceptación y la emisión.

Es un proyecto universitario (PRI2IS, Escuela Colombiana de Ingeniería). **Las aseguradoras, las tarifas, los clientes y las pólizas son ficticios**; no hay conexión con aseguradoras reales.

## Qué hace

El demo sigue el flujo de la matriz de procesos TO-BE (27 tareas, T01 a T17). Cada pantalla indica la tarea a la que corresponde.

| Etapa de la matriz | Quién | Qué pasa en el demo |
|---|---|---|
| 1. Recepción y perfilamiento (T01–T03) | Cliente y plataforma | Solicitud con ciudad, ramo y autorización de datos (fecha, hora y versión; casilla aparte para datos sensibles en Salud y Vida). La plataforma clasifica: persona natural o jurídica (con NIT solo Pymes y RC) y póliza nueva o renovación. Luego el SARLAFT único, con pregunta adicional si es PEP y consulta de listas restrictivas. |
| 2. Captura y validación (T04, T06, T07) | Cliente; asesor solo si se detiene | Formulario del ramo con los datos de la solicitud precargados. Si falta algo, el enlace muestra solo los campos pendientes; recordatorio a las 24 h, alerta al asesor a las 48 h y cierre a los 5 días hábiles con motivo «datos incompletos». El asesor registra el contacto. |
| 3. Cotización (T08) | Plataforma | Comparativo homologado, ordenado por cobertura y precio. La comisión no ordena ni se muestra. |
| 4. Asesoría y decisión (T09–T10) | Asesor y cliente | El asesor registra la recomendación con criterio obligatorio y no editable. El cliente acepta y firma con código, pide ajustes o declina con motivo de lista cerrada. |
| 5. Suscripción, pago y emisión (T11–T14) | Aseguradora, cliente y plataforma | La aseguradora responde (estándar o con condiciones); el cliente acepta las condiciones o vuelve al comparativo, y paga. La póliza se emite y se entrega sola, y la venta queda registrada. **El asesor no digita nada en esta etapa.** |
| 6. Siniestros y PQR (T15–T16) | Cliente y asesor | El cliente reporta desde su póliza con la lista de documentos de su ramo. El asesor radica, acompaña y cierra con resultado y valor pagado. |
| 7. Renovación y retroalimentación (T15–T17) | Plataforma y cliente | 30 días antes del vencimiento la plataforma recotiza y envía la propuesta; el cliente renueva o no desde su enlace. Si pasan 5 días sin respuesta, el asesor lo llama. Todo alimenta el tablero de gerencia. |

Accesos: el cliente entra por enlace, sin iniciar sesión (`/solicitud`); asesor y gerencia por `/ingreso`. Toda la navegación ocurre en la misma pestaña.

- **Asesor.** *Mi trabajo* muestra solo las tareas que el TO-BE deja a su cargo, en orden de prioridad: acompañar siniestros y PQR (T16), registrar asesorías (T09), contactar clientes detenidos (T07) y llamar por renovaciones sin respuesta (T15).
- **Gerencia.** Tablero con las seis variables por ramo y por mes, y control de imparcialidad con aviso cuando una aseguradora supera el 40 % de las ventas.

El orden del comparativo es: mayor puntaje de cobertura y, a igual cobertura, menor prima. **La comisión de la agencia nunca interviene en el orden** ni sale en las respuestas que ven el cliente y el asesor.

## Dónde está cada tarea en el servicio

| Tarea | Regla | Archivo |
|---|---|---|
| T01–T02 | Autorización con versión, datos sensibles, clasificación | `api/src/validacion/solicitud.ts`, `crearSolicitud` en `servicios/solicitudes.ts` |
| T03 | SARLAFT único, PEP y listas restrictivas | `api/src/validacion/sarlaft.ts`, `guardarSarlaft` |
| T04, T06, T07 | Validación por ramo, campos pendientes y plazos | `api/src/validacion/ramos.ts`, `pendientes.ts`, `servicios/seguimiento.ts` |
| T08 | Motor y orden del comparativo | `api/src/cotizacion/` |
| T09 | Criterio obligatorio | `api/src/validacion/asesoria.ts` |
| T10 | Aceptación con código y motivo de no compra | `servicios/solicitudes.ts` |
| T11–T14 | Suscripción, condiciones, pago, emisión y entrega | `api/src/cotizacion/suscripcion.ts`, `responderCondiciones` y `pagarPrima` |
| T15–T16 (siniestros) | Reporte con documentos, radicación y cierre | `api/src/servicios/casos.ts` |
| T15–T16 (renovación) | Recotización y decisión del cliente | `api/src/servicios/renovaciones.ts` |
| T17 | Tablero | `api/src/servicios/tablero.ts` |
| 10.2 del informe | Bitácora de cada paso | `api/src/servicios/bitacora.ts` |

El seguimiento (T07 y T15) corre al arrancar el servicio y luego cada 10 minutos. Los días hábiles son de lunes a viernes; no se descuentan festivos.

La interfaz usa la paleta y el logotipo del informe del proyecto: títulos en azul oscuro con tipografía serif, filete azul y tablas con encabezado azul claro (`web/src/styles/variables.css`).

## Cómo levantarlo

Requisito: Docker Desktop (o Docker Engine con Compose v2). No hace falta Node ni ninguna otra herramienta.

```bash
docker compose up --build
```

La aplicación queda en http://localhost:8080:

- Cliente: http://localhost:8080/solicitud
- Asesor y gerencia: http://localhost:8080/ingreso

Al arrancar, el servicio `api` aplica las migraciones y carga los datos de ejemplo si la base está vacía. Para detener y borrar todo, incluida la base de datos:

```bash
docker compose down -v
```

Los valores por defecto están en `.env.example`. Solo hace falta crear un `.env` si se quiere cambiar alguno (por ejemplo, el puerto o la clave de la sesión).

## Usuarios de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Asesor | laura.restrepo@as4.example | Asesor2026* |
| Asesor | camilo.vargas@as4.example | Asesor2026* |
| Gerencia | gerencia@as4.example | Gerencia2026* |

## Datos de ejemplo

- 8 aseguradoras ficticias, 2 asesores y 1 gerente.
- 63 solicitudes en todos los estados, con su comparativo calculado por el motor y su bitácora.
- 6 solicitudes con datos pendientes, una en cada tramo del seguimiento: al arrancar, el servicio envía los recordatorios, alerta a los asesores y cierra la vencida.
- 23 pólizas emitidas hace un año, para que la tasa de renovación y la lista de vencimientos tengan contenido; las 5 que vencen en los próximos 30 días reciben su propuesta de renovación al arrancar.
- Siniestros y PQR repartidos en los mismos 6 meses.
- Aseguradora Andina concentra a propósito cerca de la mitad de las ventas recientes, para que el control de imparcialidad muestre el aviso.

Las fechas se calculan respecto al día en que arranca el contenedor. El código de confirmación del paso 4 se muestra en pantalla y en el registro del servicio (`docker compose logs api`).

## Estructura

```
api/                 Node 20, Express, TypeScript, Prisma, Zod
  prisma/            esquema, migración y datos de ejemplo
  src/auth/          sesión con cookie httpOnly firmada
  src/cotizacion/    adaptadores, tarifas, motor y orden del comparativo
  src/validacion/    esquemas Zod (solicitud, ramos, SARLAFT, asesoría, emisión)
  src/servicios/     solicitudes, asesor, seguimiento, renovaciones, bitácora y tablero
  src/routes/        rutas del cliente, autenticación, asesor y gerencia
  test/              pruebas de Vitest
web/                 React, Vite, TypeScript, React Router, CSS propio
  src/components/    campos, tabla del comparativo, estados, gráficas SVG
  src/pages/         cliente, asesor y gerencia
  e2e/               pruebas de Playwright
docker/nginx.conf    sirve la web y reenvía /api al servicio
docker-compose.yml   servicios db, api y web
```

## Pruebas

**Vitest (api), 70 pruebas:** motor de cotización, orden del comparativo (incluida la prueba de que la comisión no lo altera), validaciones, sesión firmada, control de imparcialidad, plazos del seguimiento, campos pendientes, siguiente paso, suscripción, reporte de siniestros y renovación.

```bash
cd api
npm install
npm test
```

Sin Node instalado, desde PowerShell en la carpeta del proyecto:

```powershell
docker run --rm -v "${PWD}\api:/app" -v as4_api_node_modules:/app/node_modules -w /app node:20 sh -c "npm ci && npx prisma generate && npm run typecheck && npm test"
```

**Playwright (web):** corre contra la aplicación levantada con Docker, en escritorio y en celular. Cubre el recorrido del cliente por las etapas 1 a 6 en Autos (hasta reportar un siniestro), «No me interesa», el inicio y la bandeja del asesor, la asesoría con criterio obligatorio, los campos pendientes, la emisión sin intervención del asesor, el cierre de un siniestro, las renovaciones y el tablero.

```bash
cd web
npm install
npx playwright install chromium
npm run e2e
```

Sin Node instalado, con la aplicación arriba en el puerto 8080:

```powershell
docker run --rm --add-host=host.docker.internal:host-gateway -e BASE_URL=http://host.docker.internal:8080 -v "${PWD}\web:/app" -v as4_web_node_modules:/app/node_modules -w /app mcr.microsoft.com/playwright:v1.48.2-jammy sh -c "npm ci && npx playwright test"
```

Las pruebas de Playwright crean solicitudes nuevas en la base. Para volver a los datos iniciales: `docker compose down -v` y `docker compose up --build`.

## Motor de cotización

Cada aseguradora es un adaptador que cumple la interfaz `AdaptadorAseguradora` (`api/src/cotizacion/AdaptadorAseguradora.ts`):

```ts
interface AdaptadorAseguradora {
  readonly codigo: string;
  cotizar(solicitud: SolicitudCotizable): Promise<Oferta | null>;
}
```

- `AdaptadorSimulado.ts` calcula la oferta con las reglas de `tarifas.config.ts`: prima base por ramo y aseguradora; factores por ciudad, uso, antigüedad del vehículo, edad, ocupación, valor asegurado o contenidos; deducibles; amparos incluidos y restricciones de suscripción. No usa azar: la misma solicitud produce la misma oferta.
- `motor.ts` consulta todos los adaptadores en paralelo. Si uno falla o no responde en 8 segundos, queda por fuera del comparativo y los demás siguen.
- `ordenarOfertas.ts` ordena por puntaje de cobertura (suma de los pesos de los amparos incluidos) y, a igualdad, por menor prima. La comisión no es un dato de entrada de esa función.

Para conectar una aseguradora real:

1. Crear una clase, por ejemplo `AdaptadorAndinaApi`, que implemente `AdaptadorAseguradora`.
2. En `cotizar`, traducir la `SolicitudCotizable` al formato del servicio de la aseguradora, llamarlo con sus credenciales (desde variables de entorno) y traducir la respuesta a `Oferta`. Las coberturas deben mapearse a los códigos del catálogo `COBERTURAS` para que el puntaje sea comparable entre aseguradoras.
3. Devolver `null` cuando la aseguradora no cotice el riesgo, y lanzar un error cuando el servicio falle; el motor ya maneja ambos casos.
4. En `crearAdaptadoresSimulados` (o en una función equivalente), reemplazar el adaptador simulado de esa aseguradora por el nuevo.

## Qué está simulado

- Las 8 aseguradoras, sus tarifas, deducibles y amparos.
- Los recordatorios al cliente, las alertas al asesor y el envío de la propuesta de renovación: quedan en la bitácora de la solicitud, no se manda correo ni SMS.
- El envío del código de confirmación: no se manda SMS; el código se muestra en pantalla y en el registro del servicio.
- La consulta de listas restrictivas del SARLAFT: solo los documentos ficticios `1000000001` y `900000001` producen coincidencia.
- La suscripción de la aseguradora (T11): responde de inmediato con reglas fijas por ramo (`suscripcion.ts`); en la operación real tarda horas o días.
- El pago (T12), la emisión (T13) y la sincronización con el CRM (T14): no hay pasarela, sistema de la aseguradora ni CRM conectados.
- Los documentos del siniestro: el cliente los marca en la lista; no se suben archivos.
- Los clientes, siniestros y PQR de los datos de ejemplo.

## Qué faltaría para producción

- Adaptadores reales con las aseguradoras y manejo de sus credenciales en un gestor de secretos.
- Envío real del código, los recordatorios y las propuestas por SMS o correo; calendario de festivos para los días hábiles.
- Consulta de listas restrictivas (SARLAFT) y firma electrónica de la solicitud.
- De la matriz no se implementaron, por depender de servicios externos o de captura muy detallada: la consulta por placa y la guía Fasecolda, la inspección virtual con fotos, el cuestionario de salud por asegurado, la calculadora de suma asegurada y los beneficiarios, la georreferenciación del inmueble, la plantilla de activos y el estudio de cupo de Pymes (T05), y las alertas de plazo de pago y de un mes sin pago del siniestro.
- Límite de intentos de ingreso, recuperación de contraseña, administración de usuarios y auditoría de accesos.
- HTTPS con cookie `Secure`, copias de seguridad de la base y monitoreo.
- Política de tratamiento de datos publicada y procedimiento para consultas y reclamos de los titulares (Ley 1581 de 2012).
- Validación de los tiempos, reglas y tarifas con la agencia.
