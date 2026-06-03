
declare type file = {
    id: string;
    title: string;
}

declare type RoleT = {
    id: string,
    title: string,
    description: string,
    icon: React.ElementType,
    features: string[],
}

declare type ResponseHeader = {
  code: number;
  message: string;
};