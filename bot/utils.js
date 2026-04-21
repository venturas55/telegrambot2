export const normalizar = (str) =>
  str
    ?.toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

export const parseInput = (texto) => {
  const partes = texto.split(" ");
  if (partes.length < 2) return null;

  const dia = partes.pop();
  const playa = partes.join(" ");

  return { playa, dia };
};