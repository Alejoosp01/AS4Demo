# AS4 Compara

Aplicación de demostración para AS4 Seguros LTDA, agencia colombiana que intermedia seguros de 8 aseguradoras en 5 ramos (Autos, Salud, Vida y accidentes, Hogar y copropiedades, Pymes y RC). Centraliza la captura de la solicitud, genera el comparativo entre aseguradoras y deja registro de la asesoría, la aceptación y la emisión.

Es un proyecto universitario (PRI2IS, Escuela Colombiana de Ingeniería). **Las aseguradoras, las tarifas, los clientes y las pólizas son ficticios**; no hay conexión con aseguradoras reales.

## Qué hace

| Rol | Acceso | Funciones |
|---|---|---|
| Cliente | Enlace, sin iniciar sesión (`/solicitud`) | 1. Solicitud con autorización de datos (Ley 1581 de 2012; se guardan fecha, hora y versión). 2. Formulario del ramo y SARLAFT único; puede guardar y volver por el mismo enlace, donde solo ve los campos pendientes. 3. Comparativo con explicación de cada amparo; elegir una oferta o «No me interesa» con motivo. 4. Aceptación con código de confirmación y constancia. |
| Asesor | Ingreso (`/ingreso`) | **Mi trabajo**: sus tareas en orden de prioridad (emitir, asesorar, contactar clientes detenidos, renovaciones). **Solicitudes**: bandeja con la columna «Qué sigue» y filtros por tarea, ramo y estado. **Detalle guiado**: recorrido del proceso, panel «Qué sigue» con una sola acción a la vez, el mismo comparativo del cliente, bitácora. Asesoría con criterio obligatorio (mínimo 30 caracteres, no editable). Emisión. **Renovaciones** de los próximos 30 días con la recotización automática. |
| Gerencia | Ingreso (`/ingreso`) | Tablero con seis variables por ramo y por mes: siniestros, tasa de renovación, PQR, motivos de no compra, productos más cotizados y cotizado frente a vendido. Control de imparcialidad con aviso cuando una aseguradora supera el 40 % de las ventas del periodo. |

El orden del comparativo es: mayor puntaje de cobertura y, a igual cobertura, menor prima. **La comisión de la agencia nunca interviene en el orden** ni sale en las respuestas que ven el cliente y el asesor.

## Reglas del proceso TO-BE en el servicio

| Regla | Tarea | Dónde está |
|---|---|---|
| Autorización de datos con fecha, hora y versión | T01 | `api/src/servicios/solicitudes.ts`, `VERSION_AUTORIZACION` |
| SARLAFT único | T03 | `api/src/validacion/sarlaft.ts` |
| Validación campo por campo y enlace con solo los campos pendientes | T04, T06 | `api/src/validacion/`, `pendientes.ts`, `PUT /solicitudes/:token/borrador` |
| Recordatorio a las 24 h, alerta al asesor a las 48 h, cierre a los 5 días hábiles | T07 | `api/src/servicios/seguimiento.ts` |
| Comparativo sin comisión | T08 | `api/src/cotizacion/ordenarOfertas.ts` |
| Criterio de la recomendación obligatorio | T09 | `api/src/validacion/asesoria.ts` |
| Motivo de no compra de lista cerrada y aceptación con código | T10 | `api/src/servicios/solicitudes.ts` |
| Renovación anticipada: recotización 30 días antes del vencimiento | T15 | `api/src/servicios/renovaciones.ts` |
| Tablero con las seis variables y control de imparcialidad | T17 | `api/src/servicios/tablero.ts` |
| Trazabilidad: bitácora de cada paso y cada aviso | 10.2 | `api/src/servicios/bitacora.ts` |

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

**Vitest (api), 64 pruebas:** motor de cotización, orden del comparativo (incluida la prueba de que la comisión no lo altera), validaciones, sesión firmada, control de imparcialidad, plazos del seguimiento, campos pendientes, siguiente paso y renovación anticipada.

```bash
cd api
npm install
npm test
```

Sin Node instalado, desde PowerShell en la carpeta del proyecto:

```powershell
docker run --rm -v "${PWD}\api:/app" -v as4_api_node_modules:/app/node_modules -w /app node:20 sh -c "npm ci && npx prisma generate && npm run typecheck && npm test"
```

**Playwright (web):** corre contra la aplicación levantada con Docker, en escritorio y en celular. Cubre el flujo completo del cliente en Autos, «No me interesa», el inicio y la bandeja del asesor, la asesoría con criterio obligatorio, los campos pendientes, la emisión y el tablero.

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
- La consulta de listas restrictivas del SARLAFT, que no se hace.
- La emisión: el asesor registra a mano el número y la vigencia de la póliza que expediría la aseguradora.
- Los clientes, siniestros y PQR de los datos de ejemplo.

## Qué faltaría para producción

- Adaptadores reales con las aseguradoras y manejo de sus credenciales en un gestor de secretos.
- Envío real del código, los recordatorios y las propuestas por SMS o correo; calendario de festivos para los días hábiles.
- Consulta de listas restrictivas (SARLAFT) y firma electrónica de la solicitud.
- Registro de siniestros y PQR desde la aplicación (hoy solo existen como datos de ejemplo para el tablero).
- Límite de intentos de ingreso, recuperación de contraseña, administración de usuarios y auditoría de accesos.
- HTTPS con cookie `Secure`, copias de seguridad de la base y monitoreo.
- Política de tratamiento de datos publicada y procedimiento para consultas y reclamos de los titulares (Ley 1581 de 2012).
- Validación de los tiempos, reglas y tarifas con la agencia.
