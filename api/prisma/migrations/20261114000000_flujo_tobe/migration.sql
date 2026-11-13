-- AlterEnum
ALTER TYPE "EstadoSolicitud" ADD VALUE 'EN_CUMPLIMIENTO';

-- AlterTable
ALTER TABLE "Aceptacion" ADD COLUMN     "condicionesAceptadasEn" TIMESTAMP(3),
ADD COLUMN     "suscripcionDetalle" TEXT,
ADD COLUMN     "suscripcionResultado" TEXT,
ADD COLUMN     "suscritaEn" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Poliza" ADD COLUMN     "formaPago" TEXT,
ADD COLUMN     "pagadaEn" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Pqr" ADD COLUMN     "cerradaEn" TIMESTAMP(3),
ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "estado" TEXT NOT NULL DEFAULT 'ABIERTA',
ADD COLUMN     "respuesta" TEXT;

-- AlterTable
ALTER TABLE "PropuestaRenovacion" ADD COLUMN     "aseguradoraElegida" TEXT,
ADD COLUMN     "decididaEn" TIMESTAMP(3),
ADD COLUMN     "decididaPor" TEXT,
ADD COLUMN     "decision" TEXT,
ADD COLUMN     "motivoNoRenovacion" TEXT,
ADD COLUMN     "primaElegida" INTEGER;

-- AlterTable
ALTER TABLE "Siniestro" ADD COLUMN     "avisoTardio" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cerradoEn" TIMESTAMP(3),
ADD COLUMN     "documentos" JSONB,
ADD COLUMN     "estado" TEXT NOT NULL DEFAULT 'REPORTADO',
ADD COLUMN     "fechaEvento" TIMESTAMP(3),
ADD COLUMN     "lugar" TEXT,
ADD COLUMN     "radicadoEn" TIMESTAMP(3),
ADD COLUMN     "resultado" TEXT,
ADD COLUMN     "valorPagado" INTEGER;

-- AlterTable
ALTER TABLE "Solicitud" ADD COLUMN     "autorizaDatosSensibles" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ciudad" TEXT,
ADD COLUMN     "tipoCliente" TEXT NOT NULL DEFAULT 'NATURAL',
ADD COLUMN     "tramite" TEXT NOT NULL DEFAULT 'NUEVA';

