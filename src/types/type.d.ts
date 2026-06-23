
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

declare type MessageT = {
    id: string;
    message: string;
    userType: "User" | "Assistant"
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

/** Demographics block produced by the persona-builder agent. */
declare type PersonaDemographics = {
    age_group?: string | null;
    gender?: string | null;
    ethnicity?: string | null;
    income?: string | null;
    marital_status?: string | null;
    country?: string | null;
    primary_shopper_household?: string | null;
}

/** A persona as returned by POST /v1/persona/list. */
declare type PersonaListItem = {
    persona_id: string;
    persona_name: string | null;
    coverage: number;
    confidence: string;
    status: string;
    // Persona-builder agent output (null for data-file generated personas).
    persona_index?: number | null;
    industry?: string | null;
    category?: string | null;
    sub_category_id?: string | null;
    micro_category?: string[] | null;
    construct_ids?: string[] | null;
    role_type_ids?: string[] | null;
    timeframe_ids?: string[] | null;
    entity_scope_ids?: string[] | null;
    theme_ids?: string[] | null;
    profile_ids?: string[] | null;
    demographics?: PersonaDemographics | null;
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