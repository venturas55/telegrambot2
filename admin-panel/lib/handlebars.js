const helpers = {};

helpers.formatearSp = (fecha) => {
  if (!fecha) return null;
  const timestamp = new Date(fecha);
  const day = ("0" + timestamp.getDate()).slice(-2);
  const month = ("0" + (timestamp.getMonth() + 1)).slice(-2);
  const year = timestamp.getFullYear();
  const hours = ("0" + timestamp.getHours()).slice(-2);
  const minutes = ("0" + timestamp.getMinutes()).slice(-2);
  return `${day}/${month}/${year} ${hours}:${minutes}`;
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

export default helpers;