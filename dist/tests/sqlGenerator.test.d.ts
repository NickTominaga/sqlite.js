declare const sqlGenerator: any;
interface UpdateData {
    field: string;
    name: string;
    value: string | number;
    fk: string;
    type: string;
}
interface CreateTableData {
    field: string;
    name: string;
    type: string;
    pk: string;
    fk: string;
    default: string | number | null;
}
