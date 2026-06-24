declare module "*.svg" {
    import React from "react";
    import { SvgProps } from "react-native-svg";
    const content: React.FC<SvgProps>;
    export default content;
  }

declare module 'react-native-zeroconf' {
    export const ImplType: {
        readonly NSD: 'NSD';
        readonly DNSSD: 'DNSSD';
    };
    export type ImplType = typeof ImplType[keyof typeof ImplType];

    export default class Zeroconf {
        constructor();
        scan(type?: string, protocol?: string, domain?: string, implType?: ImplType): void;
        stop(implType?: ImplType): void;
        on(event: string, listener: (...args: any[]) => void): void;
        removeAllListeners(event?: string): void;
    }
}