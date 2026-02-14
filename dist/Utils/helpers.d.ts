type DataItem = import("../types").DataItem;
export declare const isEmpty: (value: string | number | null | undefined) => boolean;
export declare const quoteValue: (item: DataItem) => string;
export declare const quoteColumn: (columnOrTable: string) => string;
export {};
