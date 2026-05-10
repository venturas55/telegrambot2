export const opcuaVariables = [
    {
        key: "velocidad_viento",
        nodeId: "ns=1;s=EM_VR041_VEL_VIENTO_38M"
    },
    {
        key: "direccion_viento",
        nodeId: "ns=1;s=EM_VR041_DIR_VIENTO_38M"
    },
      {
        key: "media_viento",
        nodeId: "ns=1;s=EM_VR041_VEL_VIENTO_38M_MEDIA"
    }
];

export const OPCUA_IP = process.env.OPCUA_IP;