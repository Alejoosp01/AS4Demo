-- AlterEnum
ALTER TYPE "EstadoSolicitud" ADD VALUE 'CERRADA';

-- AlterTable
ALTER TABLE "Solicitud" ADD COLUMN     "alertaAsesorEn" TIMESTAMP(3),
ADD COLUMN     "autorizaDatosVersion" TEXT NOT NULL DEFAULT '1.0',
ADD COLUMN     "borrador" JSONB,
ADD COLUMN     "cerradaEn" TIMESTAMP(3),
ADD COLUMN     "recordatorioEn" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PropuestaRenovacion" (
    "id" SERIAL NOT NULL,
    "polizaId" INTEGER NOT NULL,
    "generadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviadaEn" TIMESTAMP(3) NOT NULL,
    "primaActual" INTEGER NOT NULL,
    "aseguradoraActual" TEXT NOT NULL,
    "ofertas" JSONB NOT NULL,

    CONSTRAINT "PropuestaRenovacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" SERIAL NOT NULL,
    "solicitudId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "detalle" TEXT NOT NULL,
    "autor" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropuestaRenovacion_polizaId_key" ON "PropuestaRenovacion"("polizaId");

-- CreateIndex
CREATE INDEX "Evento_solicitudId_creadoEn_idx" ON "Evento"("solicitudId", "creadoEn");

-- AddForeignKey
ALTER TABLE "PropuestaRenovacion" ADD CONSTRAINT "PropuestaRenovacion_polizaId_fkey" FOREIGN KEY ("polizaId") REFERENCES "Poliza"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "Solicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;

