import {
    OPCUAClient,
    AttributeIds
} from "node-opcua";

import { opcuaVariables } from "./opcuaconfig.js";

export async function opcua() {

    const endpointUrl = "opc.tcp://10.100.20.230:4840";

    const client = OPCUAClient.create({
        endpointMustExist: false
    });

    let session;

    try {

        await client.connect(endpointUrl);
        session = await client.createSession();
        console.log("Sesion creada");
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