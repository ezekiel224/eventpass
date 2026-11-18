"use client";

import { NeoBrutalistPass } from "@/components/passes/NeoBrutalistPass";
import type { EventPassDetails } from "@/components/passes/pass-types";

export interface PassViewerProps extends EventPassDetails {
  className?: string;
}

export function PassViewer(props: PassViewerProps) {
  return <NeoBrutalistPass {...props} />;
}
