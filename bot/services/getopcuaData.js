import db from "./db_opcua.js";

export async function getOpcUaData() {
    console.log("En opcua.js");
 
    try {
         return await db.query(`SELECT m.*
                                                    FROM mediciones m
                                                    INNER JOIN (
                                                        SELECT id_estacion,
                                                            MAX(fecha_consulta) AS ultima_fecha
                                                        FROM mediciones
                                                        GROUP BY id_estacion
                                                    ) ultimos
                                                    ON m.id_estacion = ultimos.id_estacion
                                                    AND m.fecha_consulta = ultimos.ultima_fecha
                                                    ORDER BY m.id_estacion;`,);
    } finally {

        if (session) await session.close();
        await client.disconnect();
    }
}