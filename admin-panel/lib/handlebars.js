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

export default helpers;