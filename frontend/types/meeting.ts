export type MeetingStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  date: string;
  meetLink?: string;
  hostId: string;
  host: {
    name: string;
    email: string;
  };
  participants?: {
    user: {
      name: string;
      email: string;
    }
  }[];
  transcript?: string;
  summary?: string;
  status: MeetingStatus;
  createdAt: string;
  updatedAt: string;
  _count?: {
    participants: number;
  };
}

export interface CreateMeetingDTO {
  title: string;
  description?: string;
  date: string; // ISO string
  meetLink?: string;
}

export interface SummaryResult {
  summary: string;
  actionItems?: string[];
}
