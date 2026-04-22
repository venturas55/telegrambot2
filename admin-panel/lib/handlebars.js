import { format, register } from "timeago.js";
const helpers = {};
register(
  "es_ES",
  (number, index, total_sec) =>
    [
      ["justo ahora", "ahora mismo"],
      ["durante %s segundos", "en %s segundos"],
      ["durante 1 minuto", "en 1 minuto"],
      ["durante %s minutos", "en %s minutos"],
      ["durante 1 hora", "en 1 hora"],
      ["durante %s horas", "in %s horas"],
      ["durante 1 dia", "en 1 dia"],
      ["durante %s dias", "en %s dias"],
      ["durante 1 semana", "en 1 semana"],
      ["durante %s semanas", "en %s semanas"],
      ["1 mes", "en 1 mes"],
      ["durante %s meses", "en %s meses"],
      ["durante 1 año", "en 1 año"],
      ["durante %s años", "en %s años"],
    ][index]
);

helpers.formatearSp = (fecha, buleano) => {
  if (!fecha) return null;
  const timestamp = new Date(fecha);
  const day = ("0" + timestamp.getDate()).slice(-2);
  const month = ("0" + (timestamp.getMonth() + 1)).slice(-2);
  const year = timestamp.getFullYear();
  const hours = ("0" + timestamp.getHours()).slice(-2);
  const minutes = ("0" + timestamp.getMinutes()).slice(-2);
  if (!buleano) {
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } else
    return `${day}/${month}/${year}`;
};

helpers.fechaInput = (fecha) => {
  if (!fecha) return "";

  const d = new Date(fecha);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

helpers.fechaInputDateTime = (fecha) => {
  if (!fecha) return "";

  const d = new Date(fecha);

  const pad = (n) => String(n).padStart(2, "0");

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

helpers.timeago = (fecha) => {
  var timestamp = new Date(fecha);
  return format(timestamp, "es_ES");
};

export default helpers;