import {
    OPCUAClient,
    AttributeIds
} from "node-opcua";

import { opcuaVariables,OPCUA_IP } from "./opcuaconfig.js";

export async function opcua() {
    console.log("En opcua.js");
    const endpointUrl = `opc.tcp://${OPCUA_IP}:4840`;

    const client = OPCUAClient.create({
        endpointMustExist: false
    });

    let session;

    try {
        console.log("Conectando a OPC UA...");
        await client.connect(endpointUrl);
        console.log("Conectado OK");

        console.log("Creando sesión...");
        session = await client.createSession();
        console.log("Sesion creada OK");
        // construimos lectura dinámica
        const nodesToRead = opcuaVariables.map(v => ({
            nodeId: v.nodeId,
            attributeId: AttributeIds.Value
        }));

        const results = await session.read(nodesToRead);

        // mapeamos resultados a objeto
        const output = {};

        opcuaVariables.forEach((v, i) => {
            output[v.key] = results[i]?.value?.value ?? null;
        });

        console.log("Datos OPC UA:", output);

        return output;

    } finally {

        if (session) await session.close();
        await client.disconnect();
    }
}