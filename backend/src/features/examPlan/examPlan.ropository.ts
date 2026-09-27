import prisma from "@/providers/database/database.provider";
import { ExamPlan, ExamPlanBulkCreate } from "./examPlan.schema";

export namespace ExamPlanRepository {
    export async function bulkCreate(data: ExamPlanBulkCreate[]): Promise<void> {
        await prisma.examPlan.createMany({
            data: data.map((item) => ({
                runKey: item.runKey,
                examUnitId: item.examUnitId,
                roomId: item.roomId,
                enrollmentId: item.enrollmentId,
                classId: item.classId,
                courseId: item.courseId,
                className: item.className,
                departmentName: item.departmentName,
                courseCode: item.courseCode,
                courseName: item.courseName,
                duration: item.duration,
                roomNumber: item.roomNumber || "0", // Ensure not null as per SQL
                timeStart: new Date(item.timeStart),
                timeEnd: new Date(item.timeEnd),
                violations: item.violations || [],
                semester: item.semester,
                academicYear: item.academicYear,
            })),
        });
    }

    export async function getAll(semester?: string, academicYear?: string, departmentName?: string): Promise<ExamPlan[]> {
        try {
            // 1. ดึง RunKey ล่าสุดที่มีข้อมูลในตาราง ExamPlan จริงๆ
            const latestRunResult: any[] = await prisma.$queryRaw`
                SELECT "runkey" FROM "ExamPlan" ORDER BY "id" DESC LIMIT 1
            `;
            
            if (latestRunResult.length === 0) return [];
            const targetRunKey = latestRunResult[0].runkey;

            // 2. ดึงข้อมูลทั้งหมดของ RunKey นั้นออกมา
            let query = `
                SELECT 
                    ep."id", 
                    ep."runkey" as "runKey",
                    ep."exam_unit_id" as "examUnitId",
                    ep."enrollment_id" as "enrollmentId",
                    ep."class_id" as "classId",
                    ep."course_id" as "courseId",
                    ep."classname" as "className",
                    ep."departmentname" as "departmentName",
                    ep."coursecode" as "courseCode",
                    ep."coursename" as "courseName",
                    ep."duration",
                    ep."roomnumber" as "roomNumber",
                    r."floor" as "roomFloor",
                    ep."timestart" as "timeStart",
                    ep."timeend" as "timeEnd",
                    ep."violations",
                    ep."createdat" as "createdAt"
                FROM "ExamPlan" ep
                LEFT JOIN "Room" r ON r."roomNumber" = ep."roomnumber"
                WHERE ep."runkey" = $1
            `;
            
            const params: any[] = [targetRunKey];
            if (departmentName) {
                // Remove prefixes like "สาขาวิชา" or "สาขา" to match more flexibly
                const cleanDeptName = departmentName.replace(/^(สาขาวิชา|สาขา)/, '').trim();
                params.push(`%${cleanDeptName}%`);
                query += ` AND ep."departmentname" ILIKE $2`;
            }
            
            query += ` ORDER BY ep."timestart" ASC, ep."classname" ASC`;
            
            const rawResults = await prisma.$queryRawUnsafe(query, ...params) as any[];
            
            // 3. แปลง BigInt เป็น Number เพื่อป้องกัน Error 500 ตอน JSON.stringify
            const results = rawResults.map(row => ({
                ...row,
                id: Number(row.id),
                examUnitId: row.examUnitId ? Number(row.examUnitId) : null,
                enrollmentId: row.enrollmentId ? Number(row.enrollmentId) : null,
                classId: row.classId ? Number(row.classId) : null,
                courseId: row.courseId ? Number(row.courseId) : null,
                duration: Number(row.duration)
            }));

            if (results.length > 0) {
                console.log(`[GET_ALL SUCCESS] RunKey: ${targetRunKey}, Rows: ${results.length}`);
            }

            return results;
        } catch (error) {
            console.error("[GET_ALL ERROR]", error);
            throw error;
        }
    }

    export async function deleteAll(semester: string, academicYear: string): Promise<void> {
        await prisma.examPlan.deleteMany({
            where: {
                semester,
                academicYear,
            },
        });
    }
}
