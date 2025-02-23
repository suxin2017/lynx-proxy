import { ConnectBreakConnect, ConnectPassProxy } from "./Connect";

export enum HandlerType {
    ConnectBreakConnct = "ConnectBreakConnct",
    ConnectPassProxy = "ConnectPassProxy",
}

export const FormComponentMap = {
    [HandlerType.ConnectPassProxy]: {
        title: "Connect (Pass Proxy)",
        conent: ConnectPassProxy,

    },
    [HandlerType.ConnectBreakConnct]: {
        title: "Connect (Break Connect)",
        conent: ConnectBreakConnect
    }
}

