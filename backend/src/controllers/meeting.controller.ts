import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { generateJsonFromAi } from '../lib/gemini';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';

const createMeetingSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  date: z.string(), // ISO date string
  meetLink: z.string().optional(),
});

const summarizeSchema = z.object({
  transcript: z.string().min(50),
});

export const createMeeting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { title, description, date, meetLink } = createMeetingSchema.parse(req.body);
    const userId = authReq.user!.sub;

    const meeting = await prisma.meeting.create({
      data: {
        title,
        description: description ?? null,
        date: new Date(date),
        meetLink: meetLink ?? null,
        host: {
          connect: { id: userId }
        }
      },
      include: {
        host: {
          select: { name: true, email: true }
        }
      }
    });

    res.status(201).json({ success: true, data: meeting });
  } catch (error) {
    next(error);
  }
};

export const listMeetings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meetings = await prisma.meeting.findMany({
      orderBy: { date: 'desc' },
      include: {
        host: { select: { name: true } },
        _count: { select: { participants: true } }
      }
    });
    res.json({ success: true, data: meetings });
  } catch (error) {
    next(error);
  }
};

export const getMeeting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Meeting ID is required' });
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        host: { select: { name: true, email: true } },
        participants: {
          include: {
             user: { select: { name: true, email: true } }
          }
        }
      }
    });

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    res.json({ success: true, data: meeting });
  } catch (error) {
    next(error);
  }
};

export const joinMeeting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const userId = authReq.user!.sub;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Meeting ID is required' });
    }

    // Check if meeting exists
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    // Check if already joined
    const existing = await prisma.meetingParticipant.findUnique({
      where: {
        meetingId_userId: {
          meetingId: id,
          userId
        }
      }
    });

    if (existing) {
      return res.json({ success: true, message: 'Already joined', data: existing });
    }

    const participant = await prisma.meetingParticipant.create({
      data: {
        meetingId: id,
        userId
      }
    });

    res.status(201).json({ success: true, data: participant });
  } catch (error) {
    next(error);
  }
};

export const generateSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { transcript } = summarizeSchema.parse(req.body);

    if (!id) {
        return res.status(400).json({ success: false, message: 'Meeting ID is required' });
    }

    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    // Generate summary via Gemini
    const prompt = `
      You are an expert meeting assistant. Please analyze the following meeting transcript and provide a concise summary.
      
      Transcript:
      """
      ${transcript}
      """

      Output JSON format:
      {
        "summary": "The summary string here...",
        "actionItems": ["item 1", "item 2"]
      }
    `;

    const aiResponse = await generateJsonFromAi(prompt);
    
    // Parse the JSON response
    let parsedResponse;
    try {
        parsedResponse = JSON.parse(aiResponse);
    } catch (e) {
        // Fallback if parsing failed but we got text
        parsedResponse = { summary: aiResponse, actionItems: [] };
    }

    // Update meeting with transcript and summary
    const updatedMeeting = await prisma.meeting.update({
      where: { id },
      data: {
        transcript,
        summary: parsedResponse.summary,
        status: 'COMPLETED'
      }
    });

    res.json({ success: true, data: updatedMeeting, aiResult: parsedResponse });
  } catch (error) {
    next(error);
  }
};

export const deleteMeeting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const userId = authReq.user!.sub;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Meeting ID is required' });
    }

    // Check if meeting exists
    const meeting = await prisma.meeting.findUnique({
      where: { id }
    });

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    // Authorization is handled by the authorize middleware
    // Admin and Staff can delete any meeting (already verified by middleware)

    // Delete participants first (due to foreign key constraints)
    await prisma.meetingParticipant.deleteMany({
      where: { meetingId: id }
    });

    // Delete the meeting
    await prisma.meeting.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Meeting deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateMeeting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const userId = authReq.user!.sub;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Meeting ID is required' });
    }

    // Check if meeting exists and user is authorized
    const meeting = await prisma.meeting.findUnique({
      where: { id },
    });

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    // Only host, admin, or staff can update
    const user = authReq.user!;
    const isAuthorized = meeting.hostId === userId || user.role === 'ADMIN' || user.role === 'STAFF';
    
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this meeting' });
    }

    const updateData: any = {};
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.date !== undefined) updateData.date = new Date(req.body.date);
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.meetLink !== undefined) updateData.meetLink = req.body.meetLink;

    const updatedMeeting = await prisma.meeting.update({
      where: { id },
      data: updateData,
      include: {
        host: { select: { name: true, email: true } },
        _count: { select: { participants: true } }
      }
    });

    res.json({ success: true, data: updatedMeeting });
  } catch (error) {
    next(error);
  }
};
