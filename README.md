# AS4 Compara

Prototipo funcional de una plataforma comparativa de seguros para **AS4 Seguros LTDA**, agencia colombiana que intermedia pólizas de 8 aseguradoras en 5 ramos: Autos, Salud, Vida y accidentes, Hogar y copropiedades, y Pymes y RC.

La plataforma centraliza la solicitud del cliente, genera un comparativo homologado entre aseguradoras y deja trazabilidad de cada paso: asesoría, aceptación, pago, emisión, siniestros y renovación.

| | |
|---|---|
| **Curso** | PRI2IS · Ingeniería de Sistemas · Escuela Colombiana de Ingeniería Julio Garavito |
| **Semestre** | 2026-2 |
| **Profesora** | Yulieth Quintero López |
| **Rama de integración** | `develop` |
| **Ejecución** | `docker compose up --build` → http://localhost:8080 |

> **Aviso.** Las aseguradoras, las tarifas, los clientes y las pólizas son **ficticios**. No hay conexión con aseguradoras reales.

## Contenido

1. [Equipo y colaboradores](#1-equipo-y-colaboradores)
2. [Contexto del proyecto](#2-contexto-del-proyecto)
3. [Solución: proceso TO-BE](#3-solución-proceso-to-be)
4. [Proyectos del repositorio](#4-proyectos-del-repositorio)
   - [4.1 API (`api/`)](#41-api-api)
   - [4.2 Web (`web/`)](#42-web-web)
   - [4.3 Infraestructura](#43-infraestructura)
5. [Estado del desarrollo](#5-estado-del-desarrollo)
6. [Cómo levantarlo](#6-cómo-levantarlo)
7. [Pruebas](#7-pruebas)
8. [Qué está simulado y qué falta para producción](#8-qué-está-simulado-y-qué-falta-para-producción)
9. [Flujo de trabajo en el repositorio](#9-flujo-de-trabajo-en-el-repositorio)

---

## 1. Equipo y colaboradores

| Integrante | Usuario de GitHub | Permiso en el repositorio | Aportes principales en el código |
|---|---|---|---|
| Alejandro Ospina | [@Alejoosp01](https://github.com/Alejoosp01) | Administrador (dueño) | Creación del repositorio, carga inicial del prototipo (API, Web y Docker) y archivos de configuración. |
| Cristian Aristizábal | [@Cristian-Aristi](https://github.com/Cristian-Aristi) | Escritura | Seguimiento de datos pendientes, renovación anticipada y bitácora en el servicio; sección guiada del asesor; nuevo inicio de sesión; alineación del demo con la matriz TO-BE; documentación. |
| Santiago Pinzón | [@els4nty](https://github.com/els4nty) | Escritura | Centro de la demo (mapa del flujo, misiones, guía flotante y juego); ventanas de renovaciones por vencer; rediseño visual azul y rojo; ajuste de caché en Nginx. |

### Historial del desarrollo

| Fecha | Autor | Cambio |
|---|---|---|
| 12/11/2026 | Alejandro Ospina | Repositorio inicial, carga del prototipo y archivos de configuración. |
| 13/11/2026 | Cristian Aristizábal | Servicio: seguimiento de datos pendientes, renovación anticipada y bitácora. |
| 13/11/2026 | Cristian Aristizábal | Interfaz: sección guiada del asesor y estilo del informe. |
| 13/11/2026 | Cristian Aristizábal | Interfaz más dinámica y nuevo inicio de sesión. |
| 13/11/2026 | Cristian Aristizábal | El demo sigue el flujo de la matriz TO-BE y no abre otras pestañas. |
| 18/11/2026 | Santiago Pinzón | Ventanas emergentes de renovaciones por vencer para asesor, gerencia y cliente. |
| 18/11/2026 | Santiago Pinzón | Centro de la demo: flujo interactivo, misiones por rol, guía flotante y juego. |
| 18/11/2026 | Santiago Pinzón | Rediseño visual azul y rojo, más interactivo y menos formulario. |
| 18/11/2026 | Santiago Pinzón | Nginx: no guardar en caché `index.html`. |
| 19/11/2026 | Cristian Aristizábal | Reorganización del README. |

---

## 2. Contexto del proyecto

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

```
Organización como sistema → Necesidades → Problema → Mapa de empatía → Alternativas
→ Evaluación ponderada → Business Model Canvas → Customer Journey Map
→ Procesos AS-IS y TO-BE → Prototipo funcional
```

Se evaluaron seis alternativas con cinco criterios ponderados (impacto en el cliente 30 %, costo 20 %, viabilidad 20 %, tiempo 15 % y escalabilidad 15 %):

| Alternativa | Puntaje ponderado |
|---|---|
| **Plataforma comparativa centralizada integrada al CRM** | **3,95** |
| Multicotizador externo | 3,45 |
| Hojas de cálculo dinámicas | 3,30 |
| Bot de automatización | 3,20 |
| Portafolio reducido a tres aseguradoras | 3,00 |
| Rol especializado en cotización | 2,35 |

**Idea central:** automatizar el esfuerzo de comparar para liberar el tiempo del asesor y concentrarlo en el acompañamiento humano en los momentos críticos: el siniestro y la renovación.

---

## 3. Solución: proceso TO-BE

El cliente diligencia sus datos una sola vez, en autoservicio y con un formulario por ramo. La plataforma valida, cotiza, compara y registra; el asesor se concentra en asesorar y acompañar.

| Indicador (estimado por el equipo) | AS-IS | TO-BE |
|---|---|---|
| Tareas del proceso | 70 | 27 |
| Tareas a cargo del asesor | 51 | 3 |
| Tareas con digitación manual | 11 | 0 |
| Formularios SARLAFT que llena el cliente | 4 | 1 |
| Recorrido promedio de una solicitud | 1.014 min | 281 min (−72 %) |
| Tiempo del asesor por solicitud | 626 min | 53 min (−91 %) |

Los tiempos son estimaciones del equipo y deben validarse con la agencia.

### Las 7 etapas del flujo

El demo sigue la matriz de procesos TO-BE (27 tareas, T01 a T17). Cada pantalla indica la tarea a la que corresponde.

| Etapa | Quién | Qué pasa en el demo |
|---|---|---|
| 1. Recepción y perfilamiento (T01–T03) | Cliente y plataforma | Solicitud con ciudad, ramo y autorización de datos (fecha, hora y versión; casilla aparte para datos sensibles en Salud y Vida). La plataforma clasifica: persona natural o jurídica (con NIT solo Pymes y RC) y póliza nueva o renovación. Luego el SARLAFT único, con pregunta adicional si es PEP y consulta de listas restrictivas. |
| 2. Captura y validación (T04, T06, T07) | Cliente; asesor solo si se detiene | Formulario del ramo con los datos de la solicitud precargados. Si falta algo, el enlace muestra solo los campos pendientes; recordatorio a las 24 h, alerta al asesor a las 48 h y cierre a los 5 días hábiles con motivo «datos incompletos». |
| 3. Cotización (T08) | Plataforma | Comparativo homologado, ordenado por cobertura y precio. La comisión no ordena ni se muestra. |
| 4. Asesoría y decisión (T09–T10) | Asesor y cliente | El asesor registra la recomendación con criterio obligatorio y no editable. El cliente acepta y firma con código, pide ajustes o declina con motivo de lista cerrada. |
| 5. Suscripción, pago y emisión (T11–T14) | Aseguradora, cliente y plataforma | La aseguradora responde (estándar o con condiciones); el cliente acepta las condiciones o vuelve al comparativo, y paga. La póliza se emite y se entrega sola. **El asesor no digita nada en esta etapa.** |
| 6. Siniestros y PQR (T15–T16) | Cliente y asesor | El cliente reporta desde su póliza con la lista de documentos de su ramo. El asesor radica, acompaña y cierra con resultado y valor pagado. |
| 7. Renovación y retroalimentación (T15–T17) | Plataforma y cliente | 30 días antes del vencimiento la plataforma recotiza y envía la propuesta; el cliente renueva o no desde su enlace. Si pasan 5 días sin respuesta, el asesor lo llama. Todo alimenta el tablero de gerencia. |

### Imparcialidad verificable

La agencia cobra comisión a las mismas aseguradoras que compara. Para que la imparcialidad sea comprobable y no solo declarada:

- El comparativo se ordena por **mayor puntaje de cobertura** y, a igual cobertura, por **menor prima**. **La comisión nunca interviene en el orden** ni sale en las respuestas que ven el cliente y el asesor. Una prueba automática lo verifica.
- El criterio de cada recomendación queda registrado y no se puede editar, y cada paso queda en la bitácora de la solicitud.
- El tablero de gerencia mide la distribución de ventas por aseguradora y avisa si una supera el **40 %** del periodo.

---

## 4. Proyectos del repositorio

El repositorio tiene dos proyectos independientes, la **API** y la **Web**, que se levantan juntos con Docker Compose.

```
                 ┌──────────────────────────┐      ┌──────────────────────────┐      ┌──────────────┐
 Navegador  ───► │ web · Nginx (:8080)      │ ───► │ api · Express (:3000)    │ ───► │ db           │
                 │ React compilado con Vite │ /api │ Prisma · Zod · TypeScript │      │ PostgreSQL 16│
                 └──────────────────────────┘      └──────────────────────────┘      └──────────────┘
```

| Proyecto | Carpeta | Paquete | Tecnología |
|---|---|---|---|
| API | `api/` | `as4-compara-api` 0.1.0 | Node 20, Express 4, TypeScript 5, Prisma 5.22, Zod 3, bcryptjs, PostgreSQL 16 |
| Web | `web/` | `as4-compara-web` 0.1.0 | React 18, React Router 6, Vite 5, TypeScript 5, CSS propio (sin librerías de UI) |
| Infraestructura | `docker/`, `docker-compose.yml` | — | Docker Compose, Nginx 1.27, imágenes `node:20-alpine` y `postgres:16-alpine` |

### 4.1 API (`api/`)

Servicio REST que contiene **todas las reglas del proceso TO-BE**. La interfaz solo presenta lo que el servicio decide.

**Características principales**

- **Motor de cotización con adaptadores.** Cada aseguradora es un adaptador intercambiable; se consultan en paralelo con límite de 8 segundos por aseguradora.
- **Comparativo imparcial.** El orden depende solo del puntaje de cobertura y de la prima; la comisión no es dato de entrada.
- **Validación estricta con Zod.** Placa, NIT con dígito de verificación, edades, valores asegurados, SARLAFT y criterio de asesoría.
- **Seguimiento automático de plazos.** Recordatorio a las 24 h, alerta al asesor a las 48 h y cierre a los 5 días hábiles; corre al arrancar y cada 10 minutos.
- **Renovación anticipada.** 30 días antes del vencimiento recotiza y genera la propuesta; a los 5 días sin respuesta la pasa al asesor.
- **Bitácora.** Cada paso de la solicitud queda registrado con autor (cliente, asesor o plataforma).
- **Sesión segura.** Cookie `httpOnly` firmada y contraseñas con bcrypt. El cliente no inicia sesión: entra con un token único en su enlace.

**Aseguradoras simuladas:** Aseguradora Andina, Seguros del Valle, Compañía Sabana Seguros, Seguros Cordillera, Aseguradora Litoral, Seguros Altiplano, Aseguradora Macarena y Seguros Guatavita.

**Módulos**

| Carpeta | Contenido |
|---|---|
| `src/cotizacion/` | `AdaptadorAseguradora` (interfaz), `AdaptadorSimulado`, `tarifas.config.ts` (primas, factores, coberturas y restricciones), `motor.ts`, `ordenarOfertas.ts`, `riesgo.ts` y `suscripcion.ts`. |
| `src/validacion/` | Esquemas Zod de solicitud, ramos, SARLAFT, campos pendientes, asesoría y datos internos; cálculo del dígito de verificación del NIT. |
| `src/servicios/` | `solicitudes` (flujo del cliente), `asesor` (bandeja y *Mi trabajo*), `seguimiento` (plazos T06–T07), `renovaciones`, `casos` (siniestros y PQR), `siguientePaso`, `bitacora` y `tablero`. |
| `src/routes/` | Rutas de autenticación, cliente, asesor y gerencia. |
| `src/auth/` | Sesión con cookie firmada. |
| `prisma/` | Esquema, 3 migraciones (`inicial`, `seguimiento_renovacion_bitacora`, `flujo_tobe`) y datos de ejemplo. |
| `test/` | Pruebas de Vitest: motor, orden del comparativo, validaciones, proceso TO-BE, sesión e imparcialidad. |

**Endpoints** (Nginx los publica bajo `/api`)

| Grupo | Método y ruta | Uso |
|---|---|---|
| Salud | `GET /health` | Verificación del contenedor. |
| Autenticación | `POST /auth/ingreso` · `GET /auth/sesion` · `POST /auth/salida` | Ingreso de asesor y gerencia. |
| Cliente | `GET /catalogos` | Ciudades, ramos, usos, ocupaciones y demás listas. |
| Cliente | `POST /solicitudes` · `GET /solicitudes/:token` | Crear la solicitud y consultarla por su enlace. |
| Cliente | `PUT /solicitudes/:token/sarlaft` · `/borrador` · `/formulario` | SARLAFT único, guardado parcial y formulario del ramo. |
| Cliente | `POST` · `DELETE /solicitudes/:token/eleccion` | Elegir una oferta o deshacer la elección. |
| Cliente | `POST /solicitudes/:token/confirmacion` · `/no-interes` | Aceptar con código o declinar con motivo. |
| Cliente | `POST /solicitudes/:token/condiciones` · `/pago` | Responder a las condiciones de la aseguradora y pagar. |
| Cliente | `POST /solicitudes/:token/siniestros` · `/pqr` · `/renovacion` | Reportar siniestros, radicar PQR y decidir la renovación. |
| Asesor | `GET /asesor/resumen` · `POST /asesor/seguimiento` | *Mi trabajo* y ejecución manual del seguimiento automático. |
| Asesor | `GET /asesor/solicitudes` · `GET /asesor/solicitudes/:id` | Bandeja con filtros y detalle. |
| Asesor | `POST /asesor/solicitudes/:id/asesoria` · `/contacto` · `/renovacion` | Registrar la asesoría, el contacto con el cliente y la decisión de renovación que el cliente da por teléfono. |
| Asesor | `POST /asesor/siniestros/:id/radicacion` · `/cierre` · `POST /asesor/pqr/:id/respuesta` | Radicar y cerrar siniestros; responder PQR. |
| Asesor | `GET /asesor/renovaciones` | Pólizas que vencen en los próximos 30 días. |
| Gerencia | `GET /gerencia/tablero` · `GET /gerencia/renovaciones` | Tablero, imparcialidad y vencimientos de la cartera. |

**Dónde está cada tarea del TO-BE**

| Tarea | Regla | Archivo |
|---|---|---|
| T01–T02 | Autorización con versión, datos sensibles, clasificación | `validacion/solicitud.ts`, `crearSolicitud` en `servicios/solicitudes.ts` |
| T03 | SARLAFT único, PEP y listas restrictivas | `validacion/sarlaft.ts`, `guardarSarlaft` |
| T04, T06, T07 | Validación por ramo, campos pendientes y plazos | `validacion/ramos.ts`, `validacion/pendientes.ts`, `servicios/seguimiento.ts` |
| T08 | Motor y orden del comparativo | `cotizacion/` |
| T09 | Criterio obligatorio (mínimo 30 caracteres) | `validacion/asesoria.ts` |
| T10 | Aceptación con código y motivo de no compra | `servicios/solicitudes.ts` |
| T11–T14 | Suscripción, condiciones, pago, emisión y entrega | `cotizacion/suscripcion.ts`, `responderCondiciones` y `pagarPrima` |
| T15–T16 (siniestros) | Reporte con documentos, radicación y cierre | `servicios/casos.ts` |
| T15–T16 (renovación) | Recotización y decisión del cliente | `servicios/renovaciones.ts` |
| T17 | Tablero de seis variables e imparcialidad | `servicios/tablero.ts` |
| 10.2 del informe | Bitácora de cada paso | `servicios/bitacora.ts` |

**Modelo de datos** (`prisma/schema.prisma`)

`Usuario`, `Aseguradora`, `Solicitud`, `Oferta`, `Aceptacion`, `Asesoria`, `Poliza`, `PropuestaRenovacion`, `Evento` (bitácora), `Siniestro` y `Pqr`.

Una solicitud pasa por `NUEVA → COTIZADA → ASESORADA → ACEPTADA → EMITIDA`, o termina en `NO_INTERESADA` (con motivo), `CERRADA` (datos incompletos a los 5 días hábiles) o `EN_CUMPLIMIENTO` (coincidencia en listas restrictivas).

**Motor de cotización**

```ts
interface AdaptadorAseguradora {
  readonly codigo: string;
  cotizar(solicitud: SolicitudCotizable): Promise<Oferta | null>;
}
```

- `AdaptadorSimulado.ts` aplica las reglas de `tarifas.config.ts`: prima base por ramo y aseguradora; factores por ciudad, uso, antigüedad del vehículo, edad, ocupación, valor asegurado o contenidos; deducibles; amparos y restricciones de suscripción. No usa azar: la misma solicitud produce la misma oferta.
- `motor.ts` consulta todos los adaptadores en paralelo. Si uno falla o tarda más de 8 segundos, queda por fuera y los demás siguen.
- `ordenarOfertas.ts` ordena por puntaje de cobertura (suma de los pesos de los amparos incluidos) y, a igualdad, por menor prima.

Para conectar una aseguradora real:

1. Crear una clase, por ejemplo `AdaptadorAndinaApi`, que implemente `AdaptadorAseguradora`.
2. En `cotizar`, traducir la `SolicitudCotizable` al formato de la aseguradora, llamar su servicio con credenciales desde variables de entorno y traducir la respuesta a `Oferta`, mapeando las coberturas al catálogo `COBERTURAS`.
3. Devolver `null` si la aseguradora no cotiza el riesgo y lanzar un error si el servicio falla; el motor ya maneja ambos casos.
4. Reemplazar el adaptador simulado en `crearAdaptadoresSimulados` (o en una función equivalente).

**Scripts**

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servicio en modo desarrollo con recarga (`tsx watch`). |
| `npm run build` / `npm start` | Compila a `dist/` y lo ejecuta. |
| `npm run seed` | Carga los datos de ejemplo. |
| `npm run typecheck` | Revisión de tipos. |
| `npm test` | Pruebas de Vitest. |

### 4.2 Web (`web/`)

Aplicación de una sola página con tres secciones, una por rol, más el centro de la demo. Toda la navegación ocurre en la misma pestaña.

**Rutas**

| Ruta | Quién | Pantalla |
|---|---|---|
| `/` y `/demo` | Cualquiera | Centro de la demo y entrada con un clic para cada rol. |
| `/solicitud` | Cliente (sin sesión) | Nueva solicitud. |
| `/solicitud/:token` | Cliente (por enlace) | Formulario, comparativo, aceptación, pago, póliza, siniestros y renovación. |
| `/ingreso` | Asesor y gerencia | Inicio de sesión. |
| `/asesor` | Asesor | *Mi trabajo*: tareas en orden de prioridad. |
| `/asesor/solicitudes` · `/asesor/solicitudes/:id` | Asesor | Bandeja con filtros y detalle con el comparativo. |
| `/asesor/renovaciones` | Asesor | Pólizas por vencer. |
| `/gerencia` | Gerencia | Tablero de seis variables por ramo y por mes. |
| `/gerencia/imparcialidad` | Gerencia | Distribución de ventas por aseguradora y aviso del 40 %. |
| `/gerencia/renovaciones` | Gerencia | Vencimientos de la cartera (solo consulta). |

**Funcionalidades por rol**

- **Cliente.** Solicitud con autorización de datos, SARLAFT único, formulario del ramo, comparativo en tarjetas con medidor de cobertura y explicación de cada amparo, aceptación con código o «No me interesa» con motivo, condiciones de la aseguradora, pago, póliza, reporte de siniestros y decisión de renovación.
- **Asesor.** *Mi trabajo* muestra solo las tareas que el TO-BE deja a su cargo: acompañar siniestros y PQR (T16), registrar asesorías (T09), contactar clientes detenidos (T07) y llamar por renovaciones sin respuesta (T15). Además, bandeja con filtros por ramo, estado y asignación, y búsqueda.
- **Gerencia.** Tablero con seis variables (siniestros, tasa de renovación, PQR, motivos de no compra, productos más cotizados y cotizado frente a vendido), control de imparcialidad y vencimientos de los próximos 30 días.

**Recorrido interactivo de la demo** (`src/demo/`)

- **Centro de la demo.** Mapa del flujo completo (7 etapas × 5 actores: cliente, plataforma, asesor, aseguradora y gerencia) que se reproduce como animación o etapa por etapa, con botón «Probar esta etapa», cifras animadas y el juego «¿Quién lo hace?».
- **Misiones por rol.** 14 retos (5 de cliente, 5 de asesor y 4 de gerencia) que se marcan solos al recorrer la aplicación; el avance queda en el navegador y se puede reiniciar.
- **Guía flotante.** Explica la pantalla actual: rol, etapa, tareas TO-BE, ubicación en el mapa, qué probar y las misiones del rol.
- **Avisos de renovaciones por vencer.** Al asesor, por urgencia (7 días o menos, 8 a 15) y con la prima en juego; a gerencia, con el resumen de la cartera; al cliente, con cuenta regresiva y posible ahorro. Aparecen una vez por sesión y la campana de la barra superior los vuelve a abrir.
- **Datos de ejemplo con un clic.** «Llenar con datos de ejemplo» completa la solicitud, el SARLAFT y el formulario del ramo con un cliente ficticio válido.

**Interfaz**

Paleta azul y roja tomada del logotipo de AS4 (`src/styles/variables.css`): formularios en tarjetas numeradas, ramos como tarjetas con ícono, pasos con riel de avance, gráficas SVG animadas y confeti al emitir o renovar (`src/efectos.ts`). Las animaciones se desactivan si el sistema pide reducir el movimiento. Diseño adaptable a escritorio y celular.

**Estructura**

| Carpeta | Contenido |
|---|---|
| `src/pages/cliente/` | Pasos de solicitud, formulario, comparativo, aceptación, pago y póliza. |
| `src/pages/asesor/` | Inicio (*Mi trabajo*), bandeja, detalle, «qué sigue» y renovaciones. |
| `src/pages/gerencia/` | Tablero, filtros, imparcialidad y vencimientos. |
| `src/demo/` | Centro de la demo, mapa del flujo, misiones, guía flotante, juego y barra de la demo. |
| `src/components/` | Campos, comparativo, avisos, modales, pasos, gráficas, íconos, barra superior y alerta de renovaciones. |
| `src/api/` · `src/sesion/` | Cliente HTTP, tipos y manejo de la sesión. |
| `e2e/` | Pruebas de Playwright: cliente, asesor y gerencia, y centro de la demo. |

**Scripts**

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo de Vite. |
| `npm run build` | Revisión de tipos y compilación a `dist/`. |
| `npm run preview` | Sirve la compilación localmente. |
| `npm run e2e` | Pruebas de Playwright. |

### 4.3 Infraestructura

| Servicio | Imagen | Detalle |
|---|---|---|
| `db` | `postgres:16-alpine` | Volumen `as4_db`; verificación de salud con `pg_isready`. |
| `api` | `node:20-alpine` (dos etapas) | Al arrancar aplica las migraciones, carga los datos si la base está vacía e inicia el servicio. Corre como usuario `node` y expone `/health`. |
| `web` | `nginx:1.27-alpine` | Sirve la web compilada, reenvía `/api/` al servicio, guarda en caché los recursos de `/assets/` y nunca `index.html`. Publica el puerto `8080`. |

**Variables de entorno** (`.env.example`)

| Variable | Valor por defecto | Uso |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `as4` / `as4_solo_local` / `as4compara` | Credenciales locales de la base. |
| `SESSION_SECRET` | vacío | Clave de la cookie de sesión. Si se deja vacía, se genera al arrancar y las sesiones se cierran en cada reinicio. |
| `WEB_PORT` | `8080` | Puerto del equipo donde queda la aplicación. |

---

## 5. Estado del desarrollo

| # | Etapa de construcción | Estado |
|---|---|---|
| 1 | Plan: estructura, modelo de datos y pantallas | Terminada |
| 2 | Base de datos, datos de ejemplo y Docker | Terminada |
| 3 | Motor de cotización con pruebas | Terminada |
| 4 | Flujo del cliente (etapas 1 a 7 del TO-BE) | Implementada |
| 5 | Sección del asesor | Implementada |
| 6 | Tablero de gerencia y vencimientos | Implementada |
| 7 | Centro de la demo, rediseño visual y documentación | En curso |

**Entregables académicos (fuera del repositorio):** informe, presentaciones de sustentación, diagramas BPMN AS-IS y TO-BE (Bizagi), mapa mental y modelo financiero (Excel).

---

## 6. Cómo levantarlo

Requisito: Docker Desktop (o Docker Engine con Compose v2). No hace falta Node.

```bash
docker compose up --build
```

| Acceso | URL |
|---|---|
| Centro de la demo | http://localhost:8080/demo |
| Cliente | http://localhost:8080/solicitud |
| Asesor y gerencia | http://localhost:8080/ingreso |

Para detener y borrar todo, incluida la base:

```bash
docker compose down -v
```

Solo hace falta crear un `.env` para cambiar algún valor de `.env.example`.

### Usuarios de prueba

| Rol | Nombre | Correo | Contraseña |
|---|---|---|---|
| Asesor | Laura Restrepo Gómez | laura.restrepo@as4.example | Asesor2026* |
| Asesor | Camilo Vargas Peña | camilo.vargas@as4.example | Asesor2026* |
| Gerencia | Marta Lucía Ospina | gerencia@as4.example | Gerencia2026* |

### Datos de ejemplo

- 8 aseguradoras ficticias, 2 asesores y 1 gerente.
- 63 solicitudes en todos los estados, con su comparativo calculado por el motor y su bitácora.
- 6 solicitudes con datos pendientes, una en cada tramo del seguimiento: al arrancar, el servicio envía los recordatorios, alerta a los asesores y cierra la vencida.
- 23 pólizas emitidas hace un año; las 5 que vencen en los próximos 30 días reciben su propuesta de renovación al arrancar.
- Siniestros y PQR repartidos en los últimos 6 meses.
- Aseguradora Andina concentra a propósito cerca de la mitad de las ventas recientes, para que el control de imparcialidad muestre el aviso.

Las fechas se calculan respecto al día en que arranca el contenedor. El código de confirmación se muestra en pantalla y en el registro del servicio (`docker compose logs api`).

---

## 7. Pruebas

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

---

## 8. Qué está simulado y qué falta para producción

### Simulado

- Las 8 aseguradoras, sus tarifas, deducibles y amparos.
- Los recordatorios al cliente, las alertas al asesor y el envío de la propuesta de renovación: quedan en la bitácora, no se manda correo ni SMS.
- El código de confirmación: se muestra en pantalla y en el registro del servicio.
- Las listas restrictivas del SARLAFT: solo los documentos ficticios `1000000001` y `900000001` producen coincidencia.
- La suscripción de la aseguradora (T11): responde de inmediato con reglas fijas por ramo; en la operación real tarda horas o días.
- El pago (T12), la emisión (T13) y la sincronización con el CRM (T14): no hay pasarela, sistema de la aseguradora ni CRM conectados.
- Los documentos del siniestro: el cliente los marca en la lista; no se suben archivos.
- Los clientes, siniestros y PQR de los datos de ejemplo.

### Pendiente para producción

- Adaptadores reales con las aseguradoras y credenciales en un gestor de secretos.
- Envío real del código, los recordatorios y las propuestas por SMS o correo; calendario de festivos para los días hábiles.
- Consulta real de listas restrictivas (SARLAFT) y firma electrónica de la solicitud.
- Tareas de la matriz no implementadas por depender de servicios externos o de captura muy detallada: consulta por placa y guía Fasecolda, inspección virtual con fotos, cuestionario de salud por asegurado, calculadora de suma asegurada y beneficiarios, georreferenciación del inmueble, plantilla de activos y estudio de cupo de Pymes (T05), y alertas de plazo de pago y de un mes sin pago del siniestro.
- Límite de intentos de ingreso, recuperación de contraseña, administración de usuarios y auditoría de accesos.
- HTTPS con cookie `Secure`, copias de seguridad de la base y monitoreo.
- Política de tratamiento de datos publicada y procedimiento para consultas y reclamos de los titulares (Ley 1581 de 2012).
- Validación de los tiempos, reglas y tarifas con la agencia.

---

## 9. Flujo de trabajo en el repositorio

| Rama | Uso |
|---|---|
| `main` | Versión inicial del prototipo cargada el 12/11/2026. |
| `develop` | Rama de integración: aquí está el desarrollo actual del equipo. |

Cada integrante trabaja sobre `develop` y documenta sus cambios en este README cuando agregan funcionalidades, rutas o reglas del proceso.
