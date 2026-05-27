
declare type file = {
    id: string;
    title: string;
}

declare type project = {
    id: string;
    title: string;
    description:string;
    files: file[];
    personas: any[];
    createdAt: string
}