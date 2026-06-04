
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

declare type PersonaProgressT = {
    persona_number: number
    completion: number
}

declare type MessageT = {
    id: string;
    message: string;
    userType: "User" | "Assistant"
    persona_progress?: PersonaProgressT
}