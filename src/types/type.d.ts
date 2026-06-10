
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

/** Pagination block shared by the chat-history endpoints (mirrors projects listing). */
declare type Pagination = {
  total: number;
  limit: number;
  offset: number;
  total_pages: number;
  current_page: number;
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

/** User LLM/AI settings (POST /v1/setting/get|save|reset). */
declare type AppSettings = {
    scenario_mode: "optimistic" | "realistic" | "pessimistic";
    time_horizon: "1_year" | "3_years" | "5_years" | "10_years";
    industry: string | null;
    domain: string | null;
    assumptions: string[];
    show_confidence_scores: boolean;
    show_data_badges: boolean;
    auto_expand_details: boolean;
}

/** A persona as returned by POST /v1/persona/list. */
declare type PersonaListItem = {
    persona_id: string;
    persona_name: string;
    coverage: number;
    confidence: string;
    status: string;
}

/** A participant of a group chat (POST /v1/persona/group-chat/participants). */
declare type GroupParticipant = {
    persona_id: string;
    persona_name: string;
    color: string;
    active: boolean;
}

/** A single rendered group-chat message. */
declare type GroupMessageT = {
    id: string;
    role: "user" | "persona";
    message: string;
    persona_name?: string;
    evidence_tags?: string[];
    /** True while an optimistic message is awaiting its server reply. */
    pending?: boolean;
}