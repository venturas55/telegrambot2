export async function startSession(mensaje) {
  const response = await fetch("https://api.openweathermap.org/assistant/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": API_KEY
    },
    body: JSON.stringify({
      prompt: mensaje
    })
  });

  if (!response.ok) {
    throw new Error(`Error HTTP: ${response.status}`);
  }

  const data = await response.json();
  console.log(data);
  return data
}
