-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ASESOR', 'GERENTE');

-- CreateEnum
CREATE TYPE "Ramo" AS ENUM ('AUTOS', 'SALUD', 'VIDA', 'HOGAR', 'PYMES');

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('NUEVA', 'COTIZADA', 'ASESORADA', 'ACEPTADA', 'NO_INTERESADA', 'EMITIDA');

-- CreateEnum
CREATE TYPE "MotivoNoInteres" AS ENUM ('PRECIO', 'COBERTURA', 'YA_TENGO_SEGURO', 'LO_VOY_A_PENSAR', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoRenovacion" AS ENUM ('PENDIENTE', 'RENOVADA', 'NO_RENOVADA');

-- CreateEnum
CREATE TYPE "TipoPqr" AS ENUM ('PETICION', 'QUEJA', 'RECLAMO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "claveHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aseguradora" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "comisionPct" DOUBLE PRECISION NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Aseguradora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Solicitud" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "ramo" "Ramo" NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'NUEVA',
    "nombre" TEXT NOT NULL,
    "tipoDocumento" TEXT NOT NULL,
    "numeroDocumento" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "autorizaDatos" BOOLEAN NOT NULL,
    "autorizaDatosEn" TIMESTAMP(3) NOT NULL,
    "datosRamo" JSONB,
    "sarlaft" JSONB,
    "motivoNoInteres" "MotivoNoInteres",
    "detalleNoInteres" TEXT,
    "asesorId" INTEGER,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Solicitud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Oferta" (
    "id" SERIAL NOT NULL,
    "solicitudId" INTEGER NOT NULL,
    "aseguradoraId" INTEGER NOT NULL,
    "primaAnual" INTEGER NOT NULL,
    "deducible" TEXT NOT NULL,
    "coberturas" JSONB NOT NULL,
    "puntajeCobertura" INTEGER NOT NULL,
    "elegida" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Oferta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aceptacion" (
    "id" SERIAL NOT NULL,
    "solicitudId" INTEGER NOT NULL,
    "ofertaId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "generadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmadaEn" TIMESTAMP(3),

    CONSTRAINT "Aceptacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asesoria" (
    "id" SERIAL NOT NULL,
    "solicitudId" INTEGER NOT NULL,
    "asesorId" INTEGER NOT NULL,
    "ofertaRecomendadaId" INTEGER,
    "criterio" TEXT NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asesoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Poliza" (
    "id" SERIAL NOT NULL,
    "solicitudId" INTEGER NOT NULL,
    "ofertaId" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "estadoRenovacion" "EstadoRenovacion" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "Poliza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Siniestro" (
    "id" SERIAL NOT NULL,
    "polizaId" INTEGER NOT NULL,
    "fechaReporte" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "Siniestro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pqr" (
    "id" SERIAL NOT NULL,
    "ramo" "Ramo" NOT NULL,
    "tipo" "TipoPqr" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "asunto" TEXT NOT NULL,
    "solicitudId" INTEGER,

    CONSTRAINT "Pqr_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_correo_key" ON "Usuario"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "Aseguradora_codigo_key" ON "Aseguradora"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Solicitud_token_key" ON "Solicitud"("token");

-- CreateIndex
CREATE INDEX "Solicitud_estado_idx" ON "Solicitud"("estado");

-- CreateIndex
CREATE INDEX "Solicitud_ramo_idx" ON "Solicitud"("ramo");

-- CreateIndex
CREATE INDEX "Solicitud_creadaEn_idx" ON "Solicitud"("creadaEn");

-- CreateIndex
CREATE UNIQUE INDEX "Oferta_solicitudId_aseguradoraId_key" ON "Oferta"("solicitudId", "aseguradoraId");

-- CreateIndex
CREATE UNIQUE INDEX "Aceptacion_solicitudId_key" ON "Aceptacion"("solicitudId");

-- CreateIndex
CREATE UNIQUE INDEX "Aceptacion_ofertaId_key" ON "Aceptacion"("ofertaId");

-- CreateIndex
CREATE UNIQUE INDEX "Asesoria_solicitudId_key" ON "Asesoria"("solicitudId");

-- CreateIndex
CREATE UNIQUE INDEX "Poliza_solicitudId_key" ON "Poliza"("solicitudId");

-- CreateIndex
CREATE UNIQUE INDEX "Poliza_ofertaId_key" ON "Poliza"("ofertaId");

-- CreateIndex
CREATE UNIQUE INDEX "Poliza_numero_key" ON "Poliza"("numero");

-- CreateIndex
CREATE INDEX "Poliza_fechaVencimiento_idx" ON "Poliza"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "Siniestro_fechaReporte_idx" ON "Siniestro"("fechaReporte");

-- CreateIndex
CREATE INDEX "Pqr_fecha_idx" ON "Pqr"("fecha");

-- AddForeignKey
ALTER TABLE "Solicitud" ADD CONSTRAINT "Solicitud_asesorId_fkey" FOREIGN KEY ("asesorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "Solicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_aseguradoraId_fkey" FOREIGN KEY ("aseguradoraId") REFERENCES "Aseguradora"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aceptacion" ADD CONSTRAINT "Aceptacion_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "Solicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aceptacion" ADD CONSTRAINT "Aceptacion_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "Oferta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asesoria" ADD CONSTRAINT "Asesoria_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "Solicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asesoria" ADD CONSTRAINT "Asesoria_asesorId_fkey" FOREIGN KEY ("asesorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asesoria" ADD CONSTRAINT "Asesoria_ofertaRecomendadaId_fkey" FOREIGN KEY ("ofertaRecomendadaId") REFERENCES "Oferta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poliza" ADD CONSTRAINT "Poliza_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "Solicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poliza" ADD CONSTRAINT "Poliza_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "Oferta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Siniestro" ADD CONSTRAINT "Siniestro_polizaId_fkey" FOREIGN KEY ("polizaId") REFERENCES "Poliza"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pqr" ADD CONSTRAINT "Pqr_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "Solicitud"("id") ON DELETE SET NULL ON UPDATE CASCADE;
