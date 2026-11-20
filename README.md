# AS4 Compara

Prototipo funcional de una plataforma comparativa de seguros para **AS4 Seguros LTDA**, agencia colombiana que intermedia pólizas de 8 aseguradoras en 5 ramos (Autos, Salud, Vida y accidentes, Hogar y copropiedades, Pymes y RC). Centraliza la solicitud del cliente, genera un comparativo homologado entre aseguradoras y deja trazabilidad de la asesoría, la aceptación, la emisión, los siniestros y la renovación.

Proyecto de curso **PRI2IS**, Ingeniería de Sistemas, Escuela Colombiana de Ingeniería Julio Garavito, semestre 2026-2.

> **Aviso.** Las aseguradoras, las tarifas, los clientes y las pólizas son **ficticios**. No hay conexión con aseguradoras reales.

## Contenido

1. [Contexto del proyecto](#1-contexto-del-proyecto)
2. [Solución: proceso TO-BE](#2-solución-proceso-to-be)
3. [Proyectos en desarrollo](#3-proyectos-en-desarrollo)
4. [Funcionalidades del demo](#4-funcionalidades-del-demo)
5. [Cómo levantarlo](#5-cómo-levantarlo)
6. [Pruebas](#6-pruebas)
7. [Detalle técnico](#7-detalle-técnico)
8. [Qué está simulado y qué falta para producción](#8-qué-está-simulado-y-qué-falta-para-producción)
9. [Equipo](#9-equipo)

---

## 1. Contexto del proyecto

### La organización

AS4 Seguros LTDA asesora a personas y empresas en la selección, contratación y renovación de pólizas. El cliente no paga la asesoría: los ingresos de la agencia son las comisiones que pagan las aseguradoras por cada póliza colocada y por su renovación anual.

### Problema

> AS4 carece de una herramienta centralizada que permita cotizar y comparar de manera eficiente los planes de las aseguradoras aliadas. Esto dificulta una asesoría ajustada al presupuesto del cliente y genera dudas recurrentes sobre las diferencias en coberturas, servicios y tarifas.

En el proceso actual (AS-IS):

- Las solicitudes llegan por WhatsApp, teléfono, correo y redes, y quedan en la hoja de cálculo personal de cada asesor.
- El cliente llena el SARLAFT de cada aseguradora (hasta cuatro veces) y el asesor digita el mismo riesgo en tres o cuatro portales.
- Los datos faltantes se descubren tarde, cuando el portal de la aseguradora rechaza la cotización.
- El comparativo se transcribe a mano y se ordena sin una regla fija, lo que deja abierta la posibilidad de favorecer la comisión.
- No se registran el criterio de la recomendación, el motivo de no compra ni los tiempos de los siniestros.
- Las renovaciones se revisan a mano y a veces se contacta al cliente después del vencimiento.

### Cómo se llegó a la solución

El análisis siguió el ciclo de diseño centrado en el usuario:

```
Organización como sistema → Necesidades → Problema → Mapa de empatía → Alternativas
→ Evaluación ponderada → Business Model Canvas → Customer Journey Map
→ Procesos AS-IS y TO-BE → Prototipo funcional
```

Se evaluaron seis alternativas con cinco criterios ponderados (impacto, costo, tiempo, viabilidad y escalabilidad). La **plataforma comparativa centralizada integrada al CRM** obtuvo el mayor puntaje (3,95 de 5,00), por encima del multicotizador externo (3,45) y de las hojas de cálculo dinámicas (3,30).

**Idea central:** automatizar el esfuerzo de comparar para liberar el tiempo del asesor y concentrarlo en el acompañamiento humano en los momentos críticos: el siniestro y la renovación.

## 2. Solución: proceso TO-BE

El cliente diligencia sus datos una sola vez, en autoservicio y con un formulario por ramo. La plataforma valida, cotiza, compara y registra; el asesor se concentra en asesorar y acompañar.

| Indicador (estimado por el equipo) | AS-IS | TO-BE |
|---|---|---|
| Tareas del proceso | 70 | 27 |
| Tareas a cargo del asesor | 51 | 3 |
| Formularios SARLAFT que llena el cliente | 4 | 1 |
| Recorrido promedio de una solicitud | 1.014 min | 281 min (−72 %) |
| Tiempo del asesor por solicitud | 626 min | 53 min (−91 %) |

Los tiempos son estimaciones del equipo y deben validarse con la agencia.

### Las 7 etapas del flujo

El demo sigue la matriz de procesos TO-BE (27 tareas, T01 a T17). Cada pantalla indica la tarea a la que corresponde.

| Etapa | Quién | Qué pasa en el demo |
|---|---|---|
| 1. Recepción y perfilamiento (T01–T03) | Cliente y plataforma | Solicitud con ciudad, ramo y autorización de datos (fecha, hora y versión; casilla aparte para datos sensibles en Salud y Vida). La plataforma clasifica: persona natural o jurídica (con NIT solo Pymes y RC) y póliza nueva o renovación. Luego el SARLAFT único, con pregunta adicional si es PEP y consulta de listas restrictivas. |
| 2. Captura y validación (T04, T06, T07) | Cliente; asesor solo si se detiene | Formulario del ramo con los datos de la solicitud precargados. Si falta algo, el enlace muestra solo los campos pendientes; recordatorio a las 24 h, alerta al asesor a las 48 h y cierre a los 5 días hábiles con motivo «datos incompletos». El asesor registra el contacto. |
| 3. Cotización (T08) | Plataforma | Comparativo homologado, ordenado por cobertura y precio. La comisión no ordena ni se muestra. |
| 4. Asesoría y decisión (T09–T10) | Asesor y cliente | El asesor registra la recomendación con criterio obligatorio y no editable. El cliente acepta y firma con código, pide ajustes o declina con motivo de lista cerrada. |
| 5. Suscripción, pago y emisión (T11–T14) | Aseguradora, cliente y plataforma | La aseguradora responde (estándar o con condiciones); el cliente acepta las condiciones o vuelve al comparativo, y paga. La póliza se emite y se entrega sola, y la venta queda registrada. **El asesor no digita nada en esta etapa.** |
| 6. Siniestros y PQR (T15–T16) | Cliente y asesor | El cliente reporta desde su póliza con la lista de documentos de su ramo. El asesor radica, acompaña y cierra con resultado y valor pagado. |
| 7. Renovación y retroalimentación (T15–T17) | Plataforma y cliente | 30 días antes del vencimiento la plataforma recotiza y envía la propuesta; el cliente renueva o no desde su enlace. Si pasan 5 días sin respuesta, el asesor lo llama. Todo alimenta el tablero de gerencia. |

### Imparcialidad verificable

La agencia cobra comisión a las mismas aseguradoras que compara. Para que la imparcialidad sea comprobable y no solo declarada:

- El comparativo se ordena por **mayor puntaje de cobertura** y, a igual cobertura, por **menor prima**. **La comisión nunca interviene en el orden** ni sale en las respuestas que ven el cliente y el asesor. Una prueba automática lo verifica.
- El criterio de cada recomendación queda registrado y no se puede editar, y cada paso queda en la bitácora de la solicitud.
- El tablero de gerencia mide la distribución de ventas por aseguradora y avisa si una supera el 40 % del periodo.

## 3. Proyectos en desarrollo

El repositorio tiene dos proyectos independientes, la **API** y la **Web**, que se levantan juntos con Docker Compose:

| Proyecto | Carpeta | Tecnología | Responsabilidad |
|---|---|---|---|
| **API** | `api/` | Node 20, Express, TypeScript, Prisma, Zod, PostgreSQL 16 | Reglas del proceso TO-BE: validaciones, motor de cotización, suscripción, seguimiento de plazos, renovaciones, siniestros, bitácora, sesión y datos del tablero. |
| **Web** | `web/` | React 18, Vite, TypeScript, React Router, CSS propio | Pantallas del cliente, del asesor y de gerencia, y el centro de la demo (mapa del flujo, misiones, guía flotante y juego). |
| Infraestructura | `docker/`, `docker-compose.yml` | Docker Compose, Nginx | Servicios `db`, `api` y `web`; Nginx sirve la web, reenvía `/api` al servicio y no guarda en caché `index.html`. |

```
Navegador ──► web (Nginx :8080) ──/api──► api (Express :3000) ──► db (PostgreSQL)
```

### Estado por etapa de construcción

| # | Etapa | Estado |
|---|---|---|
| 1 | Plan: estructura, modelo de datos y pantallas | Terminada |
| 2 | Base de datos, datos de ejemplo y Docker | Terminada |
| 3 | Motor de cotización con pruebas | Terminada |
| 4 | Flujo del cliente (etapas 1 a 7 del TO-BE) | Implementada |
| 5 | Sección del asesor | Implementada |
| 6 | Tablero de gerencia y vencimientos | Implementada |
| 7 | Centro de la demo, rediseño visual y documentación | En curso |

### Entregables académicos (fuera del repositorio)

El informe, las presentaciones de sustentación, los diagramas BPMN AS-IS y TO-BE (Bizagi), el mapa mental y el modelo financiero (Excel) se entregan aparte.

## 4. Funcionalidades del demo

### Accesos

| Ruta | Quién | Contenido |
|---|---|---|
| `/demo` (también `/`) | Cualquiera | Centro de la demo y entrada con un clic para cada rol. |
| `/solicitud` | Cliente, por enlace y sin iniciar sesión | Solicitud, formulario del ramo, comparativo, aceptación, pago, póliza, siniestros y renovación. |
| `/ingreso` → `/asesor` | Asesor | *Mi trabajo*, bandeja de solicitudes, detalle con el comparativo y renovaciones. |
| `/ingreso` → `/gerencia` | Gerencia | Tablero, control de imparcialidad y vencimientos (`/gerencia/renovaciones`). |

Toda la navegación ocurre en la misma pestaña.

### Por rol

- **Cliente.** Recorre las etapas del TO-BE desde su enlace: solicitud con autorización de datos, SARLAFT único, formulario del ramo, comparativo en tarjetas con medidor de cobertura, aceptación con código o «No me interesa» con motivo, condiciones de la aseguradora, pago, póliza, reporte de siniestros y decisión de renovación.
- **Asesor.** *Mi trabajo* muestra solo las tareas que el TO-BE deja a su cargo, en orden de prioridad: acompañar siniestros y PQR (T16), registrar asesorías (T09), contactar clientes detenidos (T07) y llamar por renovaciones sin respuesta (T15).
- **Gerencia.** Tablero con seis variables por ramo y por mes (siniestros, tasa de renovación, PQR, motivos de no compra, productos más cotizados y cotizado frente a vendido), control de imparcialidad y vencimientos de la cartera en los próximos 30 días.

### Recorrido interactivo

Pensado para presentar el proyecto y para que cualquier persona lo explore sola:

- **Centro de la demo (`/demo`).** Mapa interactivo del flujo completo (7 etapas × 5 actores: cliente, plataforma, asesor, aseguradora y gerencia) que se reproduce como animación o etapa por etapa. Cada etapa explica qué hace cada actor y tiene un botón «Probar esta etapa» que entra con el rol adecuado. Incluye cifras animadas y un juego de preguntas «¿Quién lo hace?».
- **Misiones por rol.** 14 retos (5 de cliente, 5 de asesor y 4 de gerencia) que se marcan solos al recorrer la aplicación. El avance queda en el navegador y se puede reiniciar.
- **Guía flotante.** Botón en la esquina inferior izquierda (pestaña lateral en celular) que explica la pantalla actual: rol, etapa y tareas TO-BE, ubicación en el mapa del flujo, qué probar y las misiones del rol.
- **Avisos de renovaciones por vencer.**
  - *Asesor:* pólizas que vencen en 30 días por urgencia (7 días o menos, 8 a 15), las que llevan 5 días sin respuesta y la prima en juego.
  - *Gerencia:* el mismo aviso con el resumen de la cartera y la página **Vencimientos**, de solo consulta, con línea de tiempo y filtros.
  - *Cliente:* cuenta regresiva, costo de renovar con su aseguradora y posible ahorro, con acceso directo a la propuesta.
  - Aparecen una vez por sesión del navegador; la campana de la barra superior los vuelve a abrir.
- **Datos de ejemplo con un clic.** El botón «Llenar con datos de ejemplo» completa la solicitud, el SARLAFT y los datos de cada ramo con un cliente ficticio válido.

### Interfaz

Paleta azul y roja tomada del logotipo de AS4 (`web/src/styles/variables.css`): formularios en tarjetas numeradas, ramos como tarjetas con ícono, pasos con riel de avance, gráficas animadas y confeti al emitir o renovar una póliza (`web/src/efectos.ts`). Las animaciones se desactivan si el sistema pide reducir el movimiento.

## 5. Cómo levantarlo

Requisito: Docker Desktop (o Docker Engine con Compose v2). No hace falta Node.

```bash
docker compose up --build
```

La aplicación queda en http://localhost:8080:

- Centro de la demo: http://localhost:8080/demo
- Cliente: http://localhost:8080/solicitud
- Asesor y gerencia: http://localhost:8080/ingreso

Al arrancar, el servicio `api` aplica las migraciones y carga los datos de ejemplo si la base está vacía. Para detener y borrar todo, incluida la base:

```bash
docker compose down -v
```

Los valores por defecto están en `.env.example`. Solo hace falta crear un `.env` para cambiar alguno (por ejemplo, el puerto o la clave de la sesión).

### Usuarios de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Asesor | laura.restrepo@as4.example | Asesor2026* |
| Asesor | camilo.vargas@as4.example | Asesor2026* |
| Gerencia | gerencia@as4.example | Gerencia2026* |

### Datos de ejemplo

- 8 aseguradoras ficticias, 2 asesores y 1 gerente.
- 63 solicitudes en todos los estados, con su comparativo calculado por el motor y su bitácora.
- 6 solicitudes con datos pendientes, una en cada tramo del seguimiento: al arrancar, el servicio envía los recordatorios, alerta a los asesores y cierra la vencida.
- 23 pólizas emitidas hace un año, para que la tasa de renovación y la lista de vencimientos tengan contenido; las 5 que vencen en los próximos 30 días reciben su propuesta de renovación al arrancar.
- Siniestros y PQR repartidos en los últimos 6 meses.
- Aseguradora Andina concentra a propósito cerca de la mitad de las ventas recientes, para que el control de imparcialidad muestre el aviso.

Las fechas se calculan respecto al día en que arranca el contenedor. El código de confirmación se muestra en pantalla y en el registro del servicio (`docker compose logs api`).

## 6. Pruebas

**Vitest (api):** motor de cotización, orden del comparativo (incluida la prueba de que la comisión no lo altera), validaciones, sesión firmada, control de imparcialidad, plazos del seguimiento, campos pendientes, siguiente paso, suscripción, reporte de siniestros y renovación.

```bash
cd api
npm install
npm test
```

Sin Node instalado, desde PowerShell en la carpeta del proyecto:

```powershell
docker run --rm -v "${PWD}\api:/app" -v as4_api_node_modules:/app/node_modules -w /app node:20 sh -c "npm ci && npx prisma generate && npm run typecheck && npm test"
```

**Playwright (web):** corre contra la aplicación levantada con Docker, en escritorio y en celular. Cubre el centro de la demo, los avisos de renovación de los tres roles, el recorrido del cliente por las etapas 1 a 6 en Autos (hasta reportar un siniestro), «No me interesa», el inicio y la bandeja del asesor, la asesoría con criterio obligatorio, los campos pendientes, la emisión sin intervención del asesor, el cierre de un siniestro, las renovaciones y el tablero.

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

## 7. Detalle técnico

### Estructura

```
api/                 Node 20, Express, TypeScript, Prisma, Zod
  prisma/            esquema, migraciones y datos de ejemplo
  src/auth/          sesión con cookie httpOnly firmada
  src/cotizacion/    adaptadores, tarifas, motor, orden del comparativo y suscripción
  src/validacion/    esquemas Zod (solicitud, ramos, SARLAFT, pendientes, asesoría)
  src/servicios/     solicitudes, asesor, seguimiento, renovaciones, casos, bitácora y tablero
  src/routes/        rutas del cliente, autenticación, asesor y gerencia
  test/              pruebas de Vitest
web/                 React, Vite, TypeScript, React Router, CSS propio
  src/demo/          centro de la demo, mapa del flujo, misiones, guía flotante y juego
  src/components/    campos, comparativo, estados, gráficas SVG
  src/pages/         cliente, asesor y gerencia
  e2e/               pruebas de Playwright
docker/nginx.conf    sirve la web y reenvía /api al servicio
docker-compose.yml   servicios db, api y web
```

### Modelo de datos

Entidades principales (`api/prisma/schema.prisma`): `Usuario`, `Aseguradora`, `Solicitud`, `Oferta`, `Aceptacion`, `Asesoria`, `Poliza`, `PropuestaRenovacion`, `Evento` (bitácora), `Siniestro` y `Pqr`.

Una solicitud pasa por `NUEVA → COTIZADA → ASESORADA → ACEPTADA → EMITIDA`, o termina en `NO_INTERESADA` (con motivo), `CERRADA` (datos incompletos a los 5 días hábiles) o `EN_CUMPLIMIENTO` (coincidencia en listas restrictivas).

### Dónde está cada tarea en el servicio

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

### Motor de cotización

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

## 8. Qué está simulado y qué falta para producción

### Simulado

- Las 8 aseguradoras, sus tarifas, deducibles y amparos.
- Los recordatorios al cliente, las alertas al asesor y el envío de la propuesta de renovación: quedan en la bitácora de la solicitud, no se manda correo ni SMS.
- El envío del código de confirmación: el código se muestra en pantalla y en el registro del servicio.
- La consulta de listas restrictivas del SARLAFT: solo los documentos ficticios `1000000001` y `900000001` producen coincidencia.
- La suscripción de la aseguradora (T11): responde de inmediato con reglas fijas por ramo (`suscripcion.ts`); en la operación real tarda horas o días.
- El pago (T12), la emisión (T13) y la sincronización con el CRM (T14): no hay pasarela, sistema de la aseguradora ni CRM conectados.
- Los documentos del siniestro: el cliente los marca en la lista; no se suben archivos.
- Los clientes, siniestros y PQR de los datos de ejemplo.

### Pendiente para producción

- Adaptadores reales con las aseguradoras y manejo de sus credenciales en un gestor de secretos.
- Envío real del código, los recordatorios y las propuestas por SMS o correo; calendario de festivos para los días hábiles.
- Consulta real de listas restrictivas (SARLAFT) y firma electrónica de la solicitud.
- Tareas de la matriz no implementadas, por depender de servicios externos o de captura muy detallada: consulta por placa y guía Fasecolda, inspección virtual con fotos, cuestionario de salud por asegurado, calculadora de suma asegurada y beneficiarios, georreferenciación del inmueble, plantilla de activos y estudio de cupo de Pymes (T05), y alertas de plazo de pago y de un mes sin pago del siniestro.
- Límite de intentos de ingreso, recuperación de contraseña, administración de usuarios y auditoría de accesos.
- HTTPS con cookie `Secure`, copias de seguridad de la base y monitoreo.
- Política de tratamiento de datos publicada y procedimiento para consultas y reclamos de los titulares (Ley 1581 de 2012).
- Validación de los tiempos, reglas y tarifas con la agencia.

## 9. Equipo

- Cristian Aristizábal
- Santiago Pinzón
- Alejandro Ospina

Profesora: Yulieth Quintero López.
