export type VotingOptionAdmin = {
  id: string;
  label: string;
  imageUrl: string | null;
  sortOrder: number;
  _count: { answers: number };
};

export type VotingQuestionAdmin = {
  id: string;
  prompt: string;
  description: string | null;
  imageUrl: string | null;
  type: "SINGLE" | "MULTIPLE";
  required: boolean;
  sortOrder: number;
  options: VotingOptionAdmin[];
};

export type VotingBallotAdmin = {
  id: string;
  eventId: string;
  event: { id: string; name: string };
  title: string;
  description: string | null;
  slug: string;
  status: "DRAFT" | "OPEN" | "CLOSED";
  coverImageUrl: string | null;
  confirmationMessage: string | null;
  questions: VotingQuestionAdmin[];
  _count: { participants: number; submissions: number };
  createdAt: string;
  updatedAt: string;
};

export type VotingEventOption = { id: string; name: string };

export type VotingControlData = {
  ballots: VotingBallotAdmin[];
  events: VotingEventOption[];
};
