/**
 * Medidas reales de cada prenda, tomadas a mano sobre el stock.
 *
 * Vive en el código porque son medidas físicas de prendas concretas: no
 * cambian salvo que entre un modelo nuevo. La guía general de talles
 * (`/guia-de-talles`) sigue estando para orientar; esto es lo puntual de cada
 * camiseta, que es lo que evita cambios por talle equivocado.
 *
 * `width` es el ancho de axila a axila con la prenda apoyada y `length` el
 * largo del hombro al ruedo, en centímetros. Mismo criterio que la guía general.
 */
export interface SizeMeasurement {
  size: string;
  width: number;
  length: number;
}

export interface ProductMeasurements {
  rows: SizeMeasurement[];
  /** Aclaración opcional bajo la tabla. */
  note?: string;
}

const MEASUREMENTS: Record<string, ProductMeasurements> = {
  'camiseta-arsenal-icon-bordo-importada': {
    rows: [{ size: 'L', width: 53, length: 70 }],
  },
  'camiseta-ajax-icon-importada': {
    rows: [{ size: 'M', width: 52, length: 70 }],
  },
  'camiseta-liverpool-icon-negra-importada': {
    rows: [{ size: 'L', width: 56, length: 72 }],
  },
  'camiseta-liverpool-icon-verde-importada': {
    rows: [
      { size: 'M', width: 50, length: 71 },
      { size: 'L', width: 53, length: 74 },
    ],
  },
  'camiseta-newcastle-icon-importada': {
    rows: [
      { size: 'M', width: 47, length: 73 },
      { size: 'L', width: 48, length: 71 },
    ],
  },
  'camiseta-japon-titular-26-27-importada': {
    rows: [
      { size: 'L', width: 49, length: 74 },
      { size: 'XL', width: 51, length: 75 },
    ],
    note: 'Consultanos por WhatsApp por las medidas de los talles M y XXL.',
  },
  'camiseta-boca-titular-25-26-paredes-importada': {
    rows: [{ size: 'L', width: 50, length: 75 }],
  },
  'camiseta-chelsea-importada': {
    rows: [{ size: 'L', width: 51, length: 74 }],
    note: 'Consultanos por WhatsApp por las medidas de los talles S, M, XL y XXL.',
  },
  'camiseta-racing-2000-01-titular-milito-importada': {
    rows: [{ size: 'L', width: 50, length: 74 }],
  },
  'camiseta-barcelona-2009-roma': {
    rows: [{ size: 'XL', width: 50, length: 74 }],
  },
  'camiseta-japon-2006': {
    rows: [{ size: 'XL', width: 54, length: 75 }],
  },
  'camiseta-brasil-2002-ronaldo-importada': {
    rows: [{ size: 'XL', width: 55, length: 73 }],
  },
};

/** Medidas de un producto por slug, o null si todavía no las cargamos. */
export function getMeasurements(slug: string): ProductMeasurements | null {
  return MEASUREMENTS[slug] ?? null;
}
