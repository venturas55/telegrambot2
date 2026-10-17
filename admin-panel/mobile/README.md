# Admin Usuarios para iOS y Android

Aplicación móvil Expo/React Native para consultar usuarios y gestionar sus suscripciones mediante la API del panel.

## Configuración

1. Copia `.env.example` a `.env`.
2. Define `EXPO_PUBLIC_API_URL` con la URL HTTPS pública del servidor de `admin-panel`, sin una ruta final ni `/api`. En un teléfono físico, no uses `localhost`; usa el dominio o la IP accesible del servidor.
3. Instala dependencias y arranca Expo:

   ```sh
   npm install
   npx expo start
   ```

La app usa Expo SDK 57 para ser compatible con Expo Go en iPhone durante la transición de SDK 58. Al iniciar consulta `/api/auth/session`; si no hay una sesión activa, muestra el formulario de login y envía las credenciales a `/api/auth/login`. Las peticiones autenticadas usan la cookie de sesión. En el servidor, configura `AUTH_USER` y `AUTH_PASS` en `admin-panel/.env`; ese username también debe existir en `usuarios` con `privilegios='admin'`. El panel web conserva sus rutas de login y redirección.

## Ejecutar y exportar

- Android: `npm run android` para ejecutar en un dispositivo/emulador con el entorno nativo instalado; `npm run export:android` genera el bundle JavaScript.
- iOS: `npm run ios` requiere macOS y Xcode; `npm run export:ios` genera el bundle JavaScript.
- Para crear paquetes instalables de producción en ambas plataformas se puede usar EAS Build (`eas build --platform all`) después de configurar una cuenta y los identificadores de la aplicación.
