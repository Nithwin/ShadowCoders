'use client';

import MeetingRoom from "@/components/meetings/meeting-room";
import { use } from "react";

export default function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  // In Next.js 15+, params is a Promise. We need to unwrap it.
  // Using React.use() to unwrap the promise
  const resolvedParams = use(params);
  
  return <MeetingRoom roomId={resolvedParams.id} />;
}
