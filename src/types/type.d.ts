
declare type file = {
    id: string;
    title: string;
}

declare type project = {
    id: string;
    title: string;
    description:string;
    role:string;
    files: file[];
    personas: PersonaDetail[];
    createdAt: string;
    chats: {
        id:string;
        title:string;
        description: string
        Messages:ChatMsg[]
    }[]
}

declare type RoleT = {
    id: string,
    title: string,
    description: string,
    icon: React.ElementType,
    features: string[],
}