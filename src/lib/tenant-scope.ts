/** Shared ownership predicates for every client-scoped data model. */
export const tenantScope = {
  event: (organizationId: string) => ({ organizationId }),
  attendee: (organizationId: string) => ({ event: { organizationId } }),
  pass: (organizationId: string) => ({ attendee: { event: { organizationId } } }),
  checkIn: (organizationId: string) => ({ attendee: { event: { organizationId } } }),
  checkInStation: (organizationId: string) => ({ event: { organizationId } }),
  emailLog: (organizationId: string) => ({ event: { organizationId } }),
  campaign: (organizationId: string) => ({ event: { organizationId } }),
  campaignRecipient: (organizationId: string) => ({ campaign: { event: { organizationId } } }),
  rafflePrize: (organizationId: string) => ({ event: { organizationId } }),
  raffleEntry: (organizationId: string) => ({ prize: { event: { organizationId } } }),
  raffleActivity: (organizationId: string) => ({ event: { organizationId } }),
  raffleDisplay: (organizationId: string) => ({ event: { organizationId } }),
  votingBallot: (organizationId: string) => ({ event: { organizationId } }),
  votingQuestion: (organizationId: string) => ({ ballot: { event: { organizationId } } }),
  votingOption: (organizationId: string) => ({ question: { ballot: { event: { organizationId } } } }),
  votingParticipant: (organizationId: string) => ({ ballot: { event: { organizationId } } }),
  votingSubmission: (organizationId: string) => ({ ballot: { event: { organizationId } } }),
  votingAnswer: (organizationId: string) => ({ submission: { ballot: { event: { organizationId } } } }),
  auditLog: (organizationId: string) => ({ organizationId }),
  setting: (organizationId: string) => ({ organizationId }),
  communicationTemplate: (organizationId: string) => ({ organizationId })
} as const;
