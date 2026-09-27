import { t } from "elysia";

export const ExamPlanSchema = t.Object({
  id: t.Number(),
  runKey: t.String(),
  examUnitId: t.Optional(t.Number()),
  roomId: t.Optional(t.Number()),
  enrollmentId: t.Optional(t.Number()),
  classId: t.Optional(t.Number()),
  courseId: t.Optional(t.Number()),
  className: t.String(),
  departmentName: t.String(),
  courseCode: t.String(),
  courseName: t.String(),
  duration: t.Number(),
  roomNumber: t.String(),
  roomFloor: t.Optional(t.String()),
  timeStart: t.Any(),
  timeEnd: t.Any(),
  violations: t.Any(),
  semester: t.Optional(t.String()),
  academicYear: t.Optional(t.String()),
  createdAt: t.Optional(t.Any()),
});

export type ExamPlan = typeof ExamPlanSchema.static;

export const ExamPlanBulkCreateSchema = t.Omit(ExamPlanSchema, [
  "id",
  "createdAt",
  "updatedAt",
]);

export type ExamPlanBulkCreate = typeof ExamPlanBulkCreateSchema.static;
