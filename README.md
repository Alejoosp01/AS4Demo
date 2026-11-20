<div align="center">

# AS4 Compara

**Plataforma comparativa de seguros para AS4 Seguros LTDA**

Cotiza en paralelo con 8 aseguradoras, presenta un comparativo homologado e imparcial y deja trazabilidad de todo el ciclo de la póliza: asesoría, emisión, siniestros y renovación.

![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

[Inicio rápido](#inicio-rápido) · [Proyectos](#proyectos) · [Pruebas](#pruebas) · [Equipo](#equipo)

</div>

> [!NOTE]
> Prototipo académico del curso PRI2IS (Escuela Colombiana de Ingeniería Julio Garavito, 2026-2). Las aseguradoras, las tarifas, los clientes y las pólizas son **ficticios**; no hay conexión con aseguradoras reales.

---

## Tabla de contenido

- [Descripción](#descripción)
- [Inicio rápido](#inicio-rápido)
- [Proceso TO-BE](#proceso-to-be)
- [Proyectos](#proyectos)
  - [API](#api)
  - [Web](#web)
  - [Infraestructura](#infraestructura)
- [Estado del desarrollo](#estado-del-desarrollo)
- [Pruebas](#pruebas)
- [Alcance del prototipo](#alcance-del-prototipo)
- [Equipo](#equipo)

---

## Descripción

AS4 Seguros LTDA es una agencia colombiana que intermedia pólizas de varias aseguradoras en cinco ramos: **Autos, Salud, Vida y accidentes, Hogar y copropiedades, y Pymes y RC**. Sus ingresos provienen de las comisiones que pagan las aseguradoras por cada póliza colocada y renovada.

### El problema

La agencia no cuenta con una herramienta centralizada para cotizar y comparar los planes de sus aseguradoras aliadas. Hoy:

- Las solicitudes llegan por WhatsApp, teléfono, correo y redes, y viven en hojas de cálculo personales.
- El cliente diligencia hasta cuatro formularios SARLAFT y el asesor digita el mismo riesgo en varios portales.
- Los errores en los datos se detectan tarde, cuando la aseguradora rechaza la cotización.
- El comparativo se arma a mano, sin una regla fija que garantice imparcialidad frente a la comisión.
- No queda registro del criterio de la recomendación, de los motivos de no compra ni de los tiempos de siniestros.

### La solución

Una plataforma que **automatiza el esfuerzo de comparar** para que el asesor concentre su tiempo en el acompañamiento humano: el siniestro y la renovación. Fue la alternativa mejor evaluada (3,95 de 5,00) entre seis opciones analizadas con criterios ponderados de impacto, costo, tiempo, viabilidad y escalabilidad.

| Indicador | Proceso actual | Con AS4 Compara |
|---|:---:|:---:|
| Tareas del proceso | 70 | **27** |
| Tareas a cargo del asesor | 51 | **3** |
| Formularios SARLAFT por cliente | 4 | **1** |
| Recorrido promedio de una solicitud | 1.014 min | **281 min** (−72 %) |
| Tiempo del asesor por solicitud | 626 min | **53 min** (−91 %) |

<sub>Tiempos estimados por el equipo; deben validarse con la agencia.</sub>

### Imparcialidad verificable

- El comparativo se ordena por **mayor cobertura** y, a igual cobertura, por **menor prima**. La comisión nunca interviene en el orden ni se muestra al cliente o al asesor, y una prueba automática lo verifica.
- El criterio de cada recomendación es obligatorio, no editable y queda en la bitácora.
- La gerencia recibe una alerta cuando una aseguradora supera el **40 %** de las ventas del periodo.

---

## Inicio rápido

**Requisito:** Docker Desktop o Docker Engine con Compose v2.

```bash
docker compose up --build
```

| Acceso | URL |
|---|---|
| Centro de la demo | http://localhost:8080/demo |
| Cliente | http://localhost:8080/solicitud |
| Asesor y gerencia | http://localhost:8080/ingreso |

Al arrancar se aplican las migraciones y se cargan los datos de ejemplo. Para detener y borrar la base:

```bash
docker compose down -v
```

### Usuarios de prueba

| Rol | Nombre | Correo | Contraseña |
|---|---|---|---|
| Asesor | Laura Restrepo Gómez | `laura.restrepo@as4.example` | `Asesor2026*` |
| Asesor | Camilo Vargas Peña | `camilo.vargas@as4.example` | `Asesor2026*` |
| Gerencia | Marta Lucía Ospina | `gerencia@as4.example` | `Gerencia2026*` |

El cliente no inicia sesión: entra por un enlace único. El código de confirmación se muestra en pantalla y en `docker compose logs api`.

### Configuración

Los valores por defecto están en `.env.example`; solo es necesario crear un `.env` para cambiarlos.

| Variable | Por defecto | Descripción |
|---|---|---|
| `POSTGRES_USER` · `POSTGRES_PASSWORD` · `POSTGRES_DB` | `as4` · `as4_solo_local` · `as4compara` | Credenciales locales de la base de datos. |
| `SESSION_SECRET` | *(vacío)* | Clave de la cookie de sesión. Si está vacía se genera al arrancar. |
| `WEB_PORT` | `8080` | Puerto donde queda disponible la aplicación. |

<details>
<summary><b>Datos de ejemplo</b></summary>

- 8 aseguradoras ficticias: Andina, Del Valle, Sabana, Cordillera, Litoral, Altiplano, Macarena y Guatavita.
- 2 asesores y 1 gerente.
- 63 solicitudes en todos los estados, con comparativo y bitácora.
- 6 solicitudes con datos pendientes, una en cada tramo del seguimiento.
- 23 pólizas emitidas hace un año; las 5 que vencen en 30 días reciben su propuesta de renovación al arrancar.
- Siniestros y PQR de los últimos 6 meses.
- Aseguradora Andina concentra a propósito cerca de la mitad de las ventas, para mostrar la alerta de imparcialidad.

Las fechas se calculan respecto al día en que arranca el contenedor.

</details>

---

## Proceso TO-BE

La plataforma implementa la matriz de procesos TO-BE: **27 tareas (T01–T17) en 7 etapas**. Cada pantalla indica la tarea a la que corresponde.

| # | Etapa | Responsable | Qué hace la plataforma |
|:---:|---|---|---|
| 1 | Recepción y perfilamiento<br><sub>T01–T03</sub> | Cliente · Plataforma | Solicitud con autorización de datos (Ley 1581 de 2012), clasificación del cliente y SARLAFT único con PEP y listas restrictivas. |
| 2 | Captura y validación<br><sub>T04, T06, T07</sub> | Cliente | Formulario por ramo validado campo por campo. Si falta un dato: recordatorio a las 24 h, alerta al asesor a las 48 h y cierre a los 5 días hábiles. |
| 3 | Cotización<br><sub>T08</sub> | Plataforma | Cotiza con todas las aseguradoras y presenta el comparativo homologado. |
| 4 | Asesoría y decisión<br><sub>T09–T10</sub> | Asesor · Cliente | Recomendación con criterio obligatorio; el cliente acepta con código o declina con motivo. |
| 5 | Suscripción, pago y emisión<br><sub>T11–T14</sub> | Aseguradora · Cliente | Condiciones de la aseguradora, pago y emisión automática. El asesor no digita nada. |
| 6 | Siniestros y PQR<br><sub>T15–T16</sub> | Cliente · Asesor | Reporte con documentos por ramo; el asesor radica, acompaña y cierra. |
| 7 | Renovación y retroalimentación<br><sub>T15–T17</sub> | Plataforma · Cliente | Recotización 30 días antes del vencimiento; tablero de gerencia con seis variables. |

---

## Proyectos

El repositorio contiene dos proyectos independientes que se despliegan juntos con Docker Compose.

```
Navegador ──► web · Nginx :8080 ──/api──► api · Express :3000 ──► db · PostgreSQL 16
```

| Proyecto | Carpeta | Stack |
|---|---|---|
| **API** | [`api/`](api) | Node 20 · Express 4 · TypeScript 5 · Prisma 5 · Zod 3 · bcryptjs |
| **Web** | [`web/`](web) | React 18 · React Router 6 · Vite 5 · TypeScript 5 · CSS propio |
| **Infraestructura** | [`docker/`](docker) · `docker-compose.yml` | Docker Compose · Nginx 1.27 · PostgreSQL 16 |

### API

Servicio REST que concentra **todas las reglas de negocio del proceso TO-BE**; la interfaz solo presenta lo que el servicio decide.

**Características**

| | |
|---|---|
| **Motor de cotización** | Un adaptador por aseguradora, consultados en paralelo con tiempo límite de 8 s. Listo para reemplazar los simulados por integraciones reales. |
| **Comparativo imparcial** | Orden por puntaje de cobertura y prima; la comisión no es dato de entrada. |
| **Validación** | Esquemas Zod para solicitud, ramos, SARLAFT y asesoría: placa, NIT con dígito de verificación, edades y valores asegurados. |
| **Seguimiento automático** | Recordatorios, alertas y cierres por plazos; se ejecuta al arrancar y cada 10 minutos. |
| **Renovación anticipada** | Recotiza 30 días antes del vencimiento y escala al asesor a los 5 días sin respuesta. |
| **Bitácora** | Registro de cada paso con su autor: cliente, asesor o plataforma. |
| **Seguridad** | Cookie `httpOnly` firmada, contraseñas con bcrypt y acceso del cliente por token único. |

**Estructura**

```
api/
├── prisma/            Esquema, migraciones y datos de ejemplo
├── src/
│   ├── auth/          Sesión con cookie firmada
│   ├── cotizacion/    Adaptadores, tarifas, motor, orden y suscripción
│   ├── validacion/    Esquemas Zod y dígito de verificación del NIT
│   ├── servicios/     Solicitudes, asesor, seguimiento, renovaciones, casos, bitácora y tablero
│   └── routes/        Autenticación, cliente, asesor y gerencia
└── test/              Pruebas con Vitest
```

**Modelo de datos:** `Usuario`, `Aseguradora`, `Solicitud`, `Oferta`, `Aceptacion`, `Asesoria`, `Poliza`, `PropuestaRenovacion`, `Evento`, `Siniestro` y `Pqr`.

**Ciclo de una solicitud:** `NUEVA → COTIZADA → ASESORADA → ACEPTADA → EMITIDA`, o termina en `NO_INTERESADA`, `CERRADA` (datos incompletos) o `EN_CUMPLIMIENTO` (coincidencia en listas restrictivas).

<details>
<summary><b>Endpoints</b></summary>

Publicados por Nginx bajo el prefijo `/api`.

| Grupo | Método | Ruta | Descripción |
|---|---|---|---|
| Sistema | `GET` | `/health` | Estado del servicio |
| Auth | `POST` | `/auth/ingreso` | Inicio de sesión |
| Auth | `GET` | `/auth/sesion` | Sesión actual |
| Auth | `POST` | `/auth/salida` | Cierre de sesión |
| Cliente | `GET` | `/catalogos` | Listas de ciudades, ramos y opciones |
| Cliente | `POST` | `/solicitudes` | Crear solicitud |
| Cliente | `GET` | `/solicitudes/:token` | Consultar solicitud |
| Cliente | `PUT` | `/solicitudes/:token/sarlaft` | Guardar SARLAFT |
| Cliente | `PUT` | `/solicitudes/:token/borrador` | Guardado parcial |
| Cliente | `PUT` | `/solicitudes/:token/formulario` | Formulario del ramo y cotización |
| Cliente | `POST` · `DELETE` | `/solicitudes/:token/eleccion` | Elegir oferta o deshacer elección |
| Cliente | `POST` | `/solicitudes/:token/confirmacion` | Aceptar con código |
| Cliente | `POST` | `/solicitudes/:token/no-interes` | Declinar con motivo |
| Cliente | `POST` | `/solicitudes/:token/condiciones` | Responder condiciones de la aseguradora |
| Cliente | `POST` | `/solicitudes/:token/pago` | Pagar la prima |
| Cliente | `POST` | `/solicitudes/:token/siniestros` | Reportar siniestro |
| Cliente | `POST` | `/solicitudes/:token/pqr` | Radicar PQR |
| Cliente | `POST` | `/solicitudes/:token/renovacion` | Decidir renovación |
| Asesor | `GET` | `/asesor/resumen` | Tareas pendientes (*Mi trabajo*) |
| Asesor | `POST` | `/asesor/seguimiento` | Ejecutar el seguimiento manualmente |
| Asesor | `GET` | `/asesor/solicitudes` | Bandeja con filtros |
| Asesor | `GET` | `/asesor/solicitudes/:id` | Detalle de solicitud |
| Asesor | `POST` | `/asesor/solicitudes/:id/asesoria` | Registrar asesoría |
| Asesor | `POST` | `/asesor/solicitudes/:id/contacto` | Registrar contacto |
| Asesor | `POST` | `/asesor/solicitudes/:id/renovacion` | Registrar decisión de renovación |
| Asesor | `POST` | `/asesor/siniestros/:id/radicacion` | Radicar siniestro |
| Asesor | `POST` | `/asesor/siniestros/:id/cierre` | Cerrar siniestro |
| Asesor | `POST` | `/asesor/pqr/:id/respuesta` | Responder PQR |
| Asesor | `GET` | `/asesor/renovaciones` | Pólizas por vencer |
| Gerencia | `GET` | `/gerencia/tablero` | Tablero e imparcialidad |
| Gerencia | `GET` | `/gerencia/renovaciones` | Vencimientos de la cartera |

</details>

<details>
<summary><b>Ubicación de cada tarea TO-BE en el código</b></summary>

| Tarea | Regla | Archivo |
|---|---|---|
| T01–T02 | Autorización de datos y clasificación | `validacion/solicitud.ts`, `servicios/solicitudes.ts` |
| T03 | SARLAFT único, PEP y listas restrictivas | `validacion/sarlaft.ts` |
| T04, T06, T07 | Validación por ramo, pendientes y plazos | `validacion/ramos.ts`, `validacion/pendientes.ts`, `servicios/seguimiento.ts` |
| T08 | Motor y orden del comparativo | `cotizacion/` |
| T09 | Criterio obligatorio (mínimo 30 caracteres) | `validacion/asesoria.ts` |
| T10 | Aceptación con código y motivo de no compra | `servicios/solicitudes.ts` |
| T11–T14 | Suscripción, pago, emisión y entrega | `cotizacion/suscripcion.ts`, `servicios/solicitudes.ts` |
| T15–T16 | Siniestros y PQR | `servicios/casos.ts` |
| T15–T16 | Renovación | `servicios/renovaciones.ts` |
| T17 | Tablero de retroalimentación | `servicios/tablero.ts` |
| — | Bitácora | `servicios/bitacora.ts` |

</details>

<details>
<summary><b>Integrar una aseguradora real</b></summary>

Cada aseguradora implementa la interfaz `AdaptadorAseguradora`:

```ts
interface AdaptadorAseguradora {
  readonly codigo: string;
  cotizar(solicitud: SolicitudCotizable): Promise<Oferta | null>;
}
```

1. Crear una clase (por ejemplo `AdaptadorAndinaApi`) que implemente la interfaz.
2. En `cotizar`, traducir la solicitud al formato de la aseguradora, llamar su servicio con credenciales desde variables de entorno y mapear la respuesta a `Oferta` usando el catálogo `COBERTURAS`.
3. Devolver `null` si no cotiza el riesgo y lanzar un error si el servicio falla; el motor maneja ambos casos.
4. Reemplazar el adaptador simulado en `crearAdaptadoresSimulados`.

</details>

**Scripts:** `npm run dev` · `npm run build` · `npm start` · `npm run seed` · `npm run typecheck` · `npm test`

### Web

Aplicación de una sola página con una sección por rol y un centro de demostración interactivo.

| Rol | Ruta | Funcionalidades |
|---|---|---|
| **Cliente** | `/solicitud` | Solicitud, SARLAFT, formulario por ramo, comparativo con medidor de cobertura, aceptación con código, pago, póliza, siniestros y renovación. |
| **Asesor** | `/asesor` | *Mi trabajo* con tareas priorizadas, bandeja con filtros y búsqueda, detalle con comparativo, registro de asesoría y renovaciones. |
| **Gerencia** | `/gerencia` | Tablero de seis variables por ramo y mes, control de imparcialidad y vencimientos de la cartera. |
| **Demo** | `/demo` | Mapa interactivo del flujo, acceso con un clic a cada rol. |

**Experiencia de demostración**

- **Mapa del flujo:** 7 etapas × 5 actores, reproducible como animación o paso a paso, con acceso directo a cada etapa.
- **Misiones por rol:** 14 retos que se completan al recorrer la aplicación.
- **Guía flotante:** explica la pantalla actual, su etapa y sus tareas TO-BE.
- **Avisos de renovación:** alertas por urgencia para asesor, gerencia y cliente.
- **Datos de ejemplo:** autocompletado de formularios con un cliente ficticio válido.
- **Juego «¿Quién lo hace?»:** preguntas sobre los responsables de cada tarea.

**Diseño:** paleta azul y roja de la marca AS4, componentes propios sin librerías de UI, gráficas SVG animadas, diseño adaptable a celular y respeto por la preferencia de movimiento reducido.

```
web/src/
├── pages/         cliente/, asesor/, gerencia/ e inicio de sesión
├── demo/          Centro de la demo, mapa, misiones, guía y juego
├── components/    Comparativo, campos, modales, gráficas y avisos
├── api/           Cliente HTTP y tipos
├── sesion/        Manejo de la sesión
└── styles/        Variables de diseño
```

**Scripts:** `npm run dev` · `npm run build` · `npm run preview` · `npm run e2e`

### Infraestructura

| Servicio | Imagen | Descripción |
|---|---|---|
| `db` | `postgres:16-alpine` | Base de datos con volumen persistente y verificación de salud. |
| `api` | `node:20-alpine` | Construcción en dos etapas; aplica migraciones, carga datos y ejecuta como usuario sin privilegios. |
| `web` | `nginx:1.27-alpine` | Sirve la interfaz compilada, reenvía `/api` al servicio y controla la caché. |

---

## Estado del desarrollo

| Etapa | Estado |
|---|:---:|
| Plan: estructura, modelo de datos y pantallas | ✅ |
| Base de datos, datos de ejemplo y Docker | ✅ |
| Motor de cotización con pruebas | ✅ |
| Flujo del cliente | ✅ |
| Sección del asesor | ✅ |
| Tablero de gerencia | ✅ |
| Centro de la demo y rediseño visual | ✅ |
| Revisión final y documentación | 🔄 |

---

## Pruebas

| Suite | Herramienta | Cobertura |
|---|---|---|
| API | Vitest | Motor, orden imparcial del comparativo, validaciones, sesión, imparcialidad, seguimiento, suscripción, siniestros y renovación. |
| Web | Playwright | Recorridos completos en escritorio y celular: demo, cliente, asesor, gerencia y renovaciones. |

```bash
# API
cd api && npm install && npm test

# Web (con la aplicación corriendo en el puerto 8080)
cd web && npm install && npx playwright install chromium && npm run e2e
```

<details>
<summary><b>Ejecutar las pruebas sin Node (PowerShell)</b></summary>

API:

```powershell
docker run --rm -v "${PWD}\api:/app" -v as4_api_node_modules:/app/node_modules -w /app node:20 sh -c "npm ci && npx prisma generate && npm run typecheck && npm test"
```

Web, con la aplicación arriba:

```powershell
docker run --rm --add-host=host.docker.internal:host-gateway -e BASE_URL=http://host.docker.internal:8080 -v "${PWD}\web:/app" -v as4_web_node_modules:/app/node_modules -w /app mcr.microsoft.com/playwright:v1.48.2-jammy sh -c "npm ci && npx playwright test"
```

Las pruebas de Playwright crean solicitudes nuevas; para restablecer los datos: `docker compose down -v` y `docker compose up --build`.

</details>

---

## Alcance del prototipo

<table>
<tr>
<th width="50%">Simulado</th>
<th width="50%">Pendiente para producción</th>
</tr>
<tr>
<td valign="top">

- Aseguradoras, tarifas, deducibles y amparos.
- Envío de códigos, recordatorios y propuestas (quedan en la bitácora).
- Listas restrictivas del SARLAFT (documentos `1000000001` y `900000001`).
- Respuesta de suscripción inmediata con reglas por ramo.
- Pago, emisión y sincronización con el CRM.
- Carga de documentos del siniestro.

</td>
<td valign="top">

- Integración real con aseguradoras y gestor de secretos.
- Envío por SMS o correo y calendario de festivos.
- Consulta real de listas restrictivas y firma electrónica.
- Consulta por placa, guía Fasecolda, inspección virtual y estudio de cupo Pymes.
- Límite de intentos, recuperación de contraseña y auditoría de accesos.
- HTTPS, copias de seguridad y monitoreo.
- Política de tratamiento de datos (Ley 1581 de 2012).

</td>
</tr>
</table>

---

## Equipo

| Integrante | GitHub |
|---|---|
| Cristian Aristizábal | [@Cristian-Aristi](https://github.com/Cristian-Aristi) |
| Santiago Pinzón | [@els4nty](https://github.com/els4nty) |
| Alejandro Ospina | [@Alejoosp01](https://github.com/Alejoosp01) |

**Profesora:** Yulieth Quintero López · **Curso:** PRI2IS · Escuela Colombiana de Ingeniería Julio Garavito · 2026-2
