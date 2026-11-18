export interface EventPassDetails {
  guestName: string;
  ticketType: string;
  qrValue: string;
  eventName: string;
  eventDate: string;
  eventTime?: string;
  venue?: string;
  address?: string;
  passId?: string;
  company?: string;
  accessLevel?: string;
  raffleTickets?: number | null;
  companionName?: string | null;
  under21Alert?: boolean;
  qrImageUrl?: string | null;
  showMap?: boolean;
}
