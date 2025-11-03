import * as attemptRepo from "./attempt.repo";
import { Prisma, ExamStatus, AttemptStatus, QType } from "@prisma/client";
import { shuffleArray } from "../../lib/utils";
import { prisma } from "../../lib/prisma";
import z from "zod";
import { submitAnswerSchema } from "./attempt.zod";
import * as userRepo from "../auth/auth.repo";

export const startAttempt = async (studentId: string, examId: string) => {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      assignments: true,
      questions: { select: { id: true } },
    },
  });

  if (!exam) {
    throw { status: 404, message: "Exam not found" };
  }
  if (exam.status !== ExamStatus.PUBLISHED) {
    throw { status: 403, message: "Exam is not published" };
  }
  const now = new Date();
  if (now < exam.startAt || now > exam.endAt) {
    throw { status: 403, message: "Exam is not currently active" };
  }

  // Fetch student cohort info for assignment matching
  const student = await userRepo.findStudentWithCohortInfo(studentId);
  if (!student) {
    throw { status: 404, message: "Student not found" };
  }

  // Determine if the exam is assigned to this student
  const isAssigned = exam.assignments.some((a) => {
    // Assigned to all
    if (a.assignToAll) return true;
    // Direct assignment by student id
    const ids = (a.studentIds as string[] | null) ?? null;
    if (ids && ids.includes(studentId)) return true;
    // Cohort-based assignment (requires all fields to match)
    if (
      a.cohortYear != null &&
      a.cohortDepartment != null &&
      a.cohortSection != null &&
      student.year != null &&
      student.department != null &&
      student.section != null
    ) {
      if (
        a.cohortYear === student.year &&
        a.cohortDepartment === student.department &&
        a.cohortSection === student.section
      ) {
        return true;
      }
    }
    return false;
  });
  if (!isAssigned) {
    throw { status: 403, message: "You are not assigned to this exam" };
  }

  let orderMap: Prisma.InputJsonValue | null = null;
  if (exam.randomizeQuestions && exam.questions.length > 0) {
    const questionIds = exam.questions.map((q) => q.id);
    orderMap = shuffleArray(questionIds) as Prisma.InputJsonValue;
  }

  const attemptData: Prisma.AttemptCreateInput = {
    status: AttemptStatus.IN_PROGRESS,
    orderMap: orderMap ?? Prisma.JsonNull,
    student: { connect: { id: studentId } },
    exam: { connect: { id: examId } },
  };

  try {
    const newAttempt = await attemptRepo.createAttempt(attemptData);
    return newAttempt;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw { status: 409, message: "Attempt already exists or was submitted" };
    }
    throw error;
  }
};

type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>["body"];

export const submitAnswer = async (
  studentId: string,
  attemptId: string,
  input: SubmitAnswerInput
) => {
  const { questionId, answer } = input;
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      studentId: true,
      status: true,
      examId: true,
    },
  });

  if (!attempt) {
    throw { status: 404, message: "Attempt not found" };
  }

  if (attempt.studentId !== studentId) {
    throw {
      status: 403,
      message: "You are not authorized to modify this attempt",
    };
  }

  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    throw {
      status: 403,
      message: "Cannot submit answer to a completed or submitted attempt",
    };
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { examId: true, type: true },
  });

  if (!question) {
    throw { status: 404, message: "Question not found" };
  }
  if (question.examId !== attempt.examId) {
    throw {
      status: 403,
      message: "Forbidden: Question does not belong to this exam",
    };
  }
  const responseData = {
    attemptId: attemptId,
    questionId: questionId,
    answer: answer ? (answer as Prisma.InputJsonValue) : Prisma.JsonNull,
    type: question.type,
  };
  const savedResponse = await attemptRepo.upsertResponse(responseData);

  return savedResponse;
};


const areArraysEqual = (arr1: any[], arr2: any[]): boolean => {
  if (arr1.length !== arr2.length) return false;
  const sortedArr1 = [...arr1].sort();
  const sortedArr2 = [...arr2].sort();
  return sortedArr1.every((value, index) => value === sortedArr2[index]);
};

export const submitAttempt = async (studentId: string, attemptId: string) => {
  // 1. Fetch all data needed for grading
  const attempt = await attemptRepo.getAttemptForSubmission(attemptId);

  // 2. --- Validation Checks ---
  if (!attempt) {
    throw { status: 404, message: 'Attempt not found' };
  }
  if (attempt.studentId !== studentId) {
    throw { status: 403, message: 'Forbidden: Attempt does not belong to this student' };
  }
  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    throw { status: 403, message: `Attempt has already been ${attempt.status.toLowerCase()}` };
  }

  let totalScore = 0;
  let maxScore = 0;


  for (const question of attempt.exam.questions) {
    // Add question's points to the max possible score
    // Convert Decimal to number for calculation
    const questionPoints = Number(question.points);
    maxScore += questionPoints;

    // Find the student's response for this question
    const response = attempt.responses.find((r) => r.questionId === question.id);

    if (response && response.answer) {
      // Auto-grade based on question type
      switch (question.type) {
        case QType.MCQ:
          try {
            // Safely parse the JSON answer and correct answer
            const answer = response.answer as { chosenOptionIds: string[] };
            const correct = question.correctOptionIds as string[];

            if (answer.chosenOptionIds && correct) {
              if (areArraysEqual(answer.chosenOptionIds, correct)) {
                totalScore += questionPoints;
              }
              // You could add logic for negative marking here
            }
          } catch (e) {
            console.error(`Failed to grade MCQ ${question.id}:`, e);
          }
          break;

        case QType.CODING:
        case QType.ESSAY:
        case QType.SPEAKING:
          // These types require manual or AI grading, so score 0 for now
          // The 'earnedPoints' on the Response can be updated later by a STAFF user
          totalScore += 0;
          break;
        
        // Add other auto-gradable types (like FILL) here
        default:
          totalScore += 0;
      }
    }
  }

  // 4. --- Update the Attempt in the Database ---
  const submittedAttempt = await attemptRepo.updateAttemptOnSubmit(
    attemptId,
    totalScore,
    maxScore
  );

  return submittedAttempt;
};

export const getAttemptDetails = async (
  studentId: string,
  attemptId: string
) => {
  // 1. Fetch all attempt data from the repository
  const attempt = await attemptRepo.getAttemptDetails(attemptId);

  // 2. --- Validation Checks ---
  if (!attempt) {
    throw { status: 404, message: 'Attempt not found' };
  }

  // 3. --- Security Check ---
  // Ensure the logged-in student is the one who owns this attempt
  if (attempt.studentId !== studentId) {
    throw { status: 403, message: 'Forbidden: You do not have access to this attempt' };
  }
  
  // (Optional) You could also check if the attempt is IN_PROGRESS,
  // but it's often useful to let students view submitted attempts too.
  // We'll leave this check out for now.

  // 4. Return the full attempt details
  return attempt;
};