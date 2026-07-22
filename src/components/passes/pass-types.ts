import type { MotionValue } from "framer-motion";

export type PassTheme = "gala" | "casino" | "retro-arcade" | "science" | "biology" | "space" | "minimal";
export type PassFace = "front" | "back";
export type PassFinish = "dark" | "light";

export interface EventPassDetails {
  guestName: string;
  ticketType: string;
  qrValue: string;
  eventName: string;
  eventDate: string;
  eventTime?: string;
  venue?: string;
  passId?: string;
  company?: string;
  accessLevel?: string;
  qrImageUrl?: string | null;
}

export interface PassMotionControls {
  x: MotionValue<number>;
  y: MotionValue<number>;
  rotateX: MotionValue<number>;
  rotateY: MotionValue<number>;
  reducedMotion: boolean;
}

export interface InteractivePassProps extends EventPassDetails {
  motion: PassMotionControls;
  face?: PassFace;
  onFaceChange?: (face: PassFace) => void;
}
