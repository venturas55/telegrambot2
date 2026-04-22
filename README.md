# telegrambot

## En la carpeta bot
    Se encuentra el desarrollo del bot.
    Si el usuario no consta en la bbdd de admin-panel, se da de alta automaticamente al enviar un mensaje al bot.
    Se avisa cuando faltan 5 dias.

## En la carpeta admin-panel 
    Se encuentra otro proyecto en nodejs con express para gestionar los usuarios.
    TODO: Ver los pagos de cada usuario. y Total pagado por usuario y global.   
    TODO: "Expira en..." handlebars

## En la carpeta tasker
    Captuas de como se configura la automatización mediante la app tasker.

Cada uno tiene su .env , pero apuntarían a la misma base de datos


Corriendo en pm2 recuerda para ver logs:
cat ~/.pm2/logs/telegramBOT-out.log