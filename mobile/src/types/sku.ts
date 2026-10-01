export interface SKU {
  id: number;
  produto: number;
  codigo_barras: string;
  // A API serializa os lotes separadamente, sem relação direta com o SKU.
}
