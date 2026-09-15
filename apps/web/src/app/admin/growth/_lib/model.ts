export type OpportunityLevel = "high" | "medium" | "low";
export type RelationshipStage =
  | "identified"
  | "reachable"
  | "contacted"
  | "engaged"
  | "interested"
  | "registered"
  | "attended"
  | "recurring"
  | "inactive";

export type GrowthPerson = {
  id: string;
  name: string;
  municipality: string;
  chamber: string;
  region: string;
  stage: RelationshipStage;
  engagementScore: number;
  opportunityScore: number;
  dataQualityScore: number;
  lastInteractionDays: number | null;
  lastEventDays: number | null;
  validChannels: Array<"email" | "sms" | "phone" | "portal">;
  interests: string[];
  portalActive: boolean;
  registrationAbandoned: boolean;
  contacted: boolean;
  nextAction: string;
  nextActionReason: string;
};

export type RadarMetric = {
  key: string;
  label: string;
  value: number;
  description: string;
};

export function opportunityLevel(score: number): OpportunityLevel {
  if (score >= 75) return "high";
  if (score >= 45) return "medium";
  return "low";
}

export function buildRadarMetrics(people: GrowthPerson[]): RadarMetric[] {
  return [
    {
      key: "high_opportunity",
      label: "Alta oportunidade",
      value: people.filter((person) => person.opportunityScore >= 75).length,
      description: "Prioridade para a próxima ação de relacionamento.",
    },
    {
      key: "registration_abandonments",
      label: "Inscrições abandonadas",
      value: people.filter((person) => person.registrationAbandoned).length,
      description: "Iniciaram inscrição e ainda não concluíram.",
    },
    {
      key: "never_contacted",
      label: "Nunca contatados",
      value: people.filter((person) => !person.contacted).length,
      description: "Vereadores identificados sem contato registrado.",
    },
    {
      key: "missing_valid_channel",
      label: "Sem canal válido",
      value: people.filter((person) => person.validChannels.length === 0).length,
      description: "Cadastros que precisam de saneamento de contato.",
    },
    {
      key: "inactive_12m",
      label: "Inativos há 12+ meses",
      value: people.filter(
        (person) => person.lastInteractionDays !== null && person.lastInteractionDays >= 365,
      ).length,
      description: "Relacionamentos que merecem uma jornada de reativação.",
    },
    {
      key: "portal_pending",
      label: "Portal ainda não ativado",
      value: people.filter((person) => !person.portalActive).length,
      description: "Oportunidade de ampliar o vínculo digital com a UVERGS.",
    },
  ];
}

export function filterPeople(
  people: GrowthPerson[],
  filter: "all" | "high" | "never_contacted" | "inactive" | "abandoned" | "incomplete",
): GrowthPerson[] {
  switch (filter) {
    case "high":
      return people.filter((person) => person.opportunityScore >= 75);
    case "never_contacted":
      return people.filter((person) => !person.contacted);
    case "inactive":
      return people.filter(
        (person) => person.lastInteractionDays !== null && person.lastInteractionDays >= 365,
      );
    case "abandoned":
      return people.filter((person) => person.registrationAbandoned);
    case "incomplete":
      return people.filter((person) => person.dataQualityScore < 70);
    default:
      return people;
  }
}
