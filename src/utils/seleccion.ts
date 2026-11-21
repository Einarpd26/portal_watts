// Los selectores trabajan con texto; las claves de la base son números. '' significa «sin elegir».
export const aNumeroONulo = (valor: string): number | null => (valor === '' ? null : Number(valor));
export const deNumeroONulo = (valor: number | null): string => (valor === null ? '' : String(valor));
