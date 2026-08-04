type RaffleAttendee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  company: string | null;
  eventId: string;
  raffleTickets: number;
  raffleEntries: Array<{ prizeId: string; ticketCount: number }>;
  pass: { fallbackCode: string } | null;
};

export function serializeRaffleAttendee(attendee: RaffleAttendee) {
  const assignedTickets = attendee.raffleEntries.reduce((sum, entry) => sum + entry.ticketCount, 0);
  return {
    id: attendee.id,
    name: `${attendee.firstName} ${attendee.lastName}`,
    email: attendee.email,
    company: attendee.company,
    eventId: attendee.eventId,
    raffleTickets: attendee.raffleTickets,
    assignedTickets,
    remainingTickets: attendee.raffleTickets - assignedTickets,
    entries: attendee.raffleEntries.map((entry) => ({ prizeId: entry.prizeId, ticketCount: entry.ticketCount })),
    fallbackCode: attendee.pass?.fallbackCode ?? null
  };
}
