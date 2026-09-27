import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Cpu, CheckCircle, AlertCircle, Workflow, Download, Filter } from "lucide-react";
import ScheduleTable from "../../components/ui/ScheduleTable"; // Import ScheduleTable
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";
import toast from "react-hot-toast";

interface SchedulingFormInputs {
  semester: string;
  academicYear: string;
  examStart: string;
  examEnd: string;
}

export interface ScheduleResult {
  className: string;
  departmentName: string;
  timeStart: string;
  timeEnd: string;
  duration: number;
  courseCode: string;
  courseName: string;
  roomNumber: string;
  roomFloor?: string;
}

const getRoomNumber = (schedule: any): string => {
  const roomNumber = schedule?.roomNumber ?? schedule?.roomnumber ?? schedule?.room_no;
  if (roomNumber === null || roomNumber === undefined) return "";
  return String(roomNumber).trim();
};

interface ValidationResult {
  isValid: boolean;
  summary: {
    totalExams: number;
    totalRoomsUsed: number;
    violations?: {
      critical: number;
      warning: number;
    };
  };
  errors: string[];
}

type SchedulingStatus = "idle" | "processing" | "success" | "error";

const AdminScheduling: React.FC = () => {
  const { user } = useAuth();
  const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL;

  // Persistence Key
  const PERSIST_KEY = "admin_scheduling_state";

  const [status, setStatus] = useState<SchedulingStatus>(() => {
    const saved = sessionStorage.getItem(PERSIST_KEY);
    return saved ? JSON.parse(saved).status : "idle";
  });
  const [result, setResult] = useState<ScheduleResult[] | null>(() => {
    const saved = sessionStorage.getItem(PERSIST_KEY);
    return saved ? JSON.parse(saved).result : null;
  });
  const [validation, setValidation] = useState<ValidationResult | null>(() => {
    const saved = sessionStorage.getItem(PERSIST_KEY);
    return saved ? JSON.parse(saved).validation : null;
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    const saved = sessionStorage.getItem(PERSIST_KEY);
    return saved ? JSON.parse(saved).errorMessage : null;
  });

  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  const uniqueDepartments = useMemo(() => {
    if (!result) return [];
    const depts = result.map((s) => s.departmentName).filter(Boolean);
    return Array.from(new Set(depts)).sort();
  }, [result]);

  const filteredSchedule = useMemo(() => {
    if (!result) return [];
    if (selectedDepartment === "all") return result;
    return result.filter((s) => s.departmentName === selectedDepartment);
  }, [result, selectedDepartment]);

  const {
    register,
      handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<SchedulingFormInputs>({
    defaultValues: (() => {
      const saved = sessionStorage.getItem(PERSIST_KEY);
      return saved ? JSON.parse(saved).formData : {};
    })()
  });

  // Persist state to sessionStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      status,
      result,
      validation,
      errorMessage,
      formData: getValues()
    };
    sessionStorage.setItem(PERSIST_KEY, JSON.stringify(stateToSave));
  }, [status, result, validation, errorMessage, getValues]);

  // Fetch existing exam plans on mount
  useEffect(() => {
    const fetchExistingPlans = async () => {
      // If we are already processing, skip fetching to avoid race conditions
      if (status === "processing") return;

      try {
        const response = await api.get("/exam-plans");
        if (Array.isArray(response.data) && response.data.length > 0) {
          setResult(response.data);
          setStatus("success");
          // If we load from DB, we might not have the validation details from n8n
          // unless we want to show a generic "Loaded from database" state
          if (!validation) {
            setValidation({
              isValid: false,
              summary: {
                totalExams: new Set(response.data.map((s: any) => s.courseCode || s.courseId)).size,
                totalRoomsUsed: new Set(
                  response.data
                    .map((s: any) => getRoomNumber(s))
                    .filter((r: string) => r !== "")
                ).size,
                violations: { critical: 0, warning: 1 }
              },
              errors: ["ไม่พบรายงานผลการตรวจสอบเงื่อนไขของตารางสอบนี้"]
            });
          }
        } else if (status === "success") {
          // If it was success but now DB is empty, reset to idle
          setResult(null);
          setStatus("idle");
          setValidation(null);
        }
      } catch (err) {
        console.error("Error fetching existing plans:", err);
      }
    };

    fetchExistingPlans();
  }, []);

  const formatDate = (date: Date) => {
    const pad = (n: number, m = 2) => String(n).padStart(m, "0");
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
      `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`
    );
  };

  const onSubmit: SubmitHandler<SchedulingFormInputs> = async (data) => {
    setStatus("processing");
    setResult(null);
    setErrorMessage(null);
    console.log("ข้อมูลการจัดตารางสอบที่ส่ง:", data);

        const payload = {

          ...data,

          username: user?.username || "Guest",

          command: "generate_schedule",

          callDate: formatDate(new Date()),

        };

        try {

          if (!WEBHOOK_URL) {

            throw new Error("ยังไม่ได้กำหนดค่า VITE_WEBHOOK_URL ใน .env");

          }

                    // เรียกไปยัง n8n Webhook โดยตรง

                    const response = await api.post(WEBHOOK_URL, payload);

                    const responseData = response.data;

                    console.log("Webhook Response:", responseData);

                    let finalSchedule: ScheduleResult[] = [];

                    let finalValidation: ValidationResult | null = null;

                    // Helper เพื่อสกัด JSON จาก Markdown หรือข้อความดิบ
                    const parseOutput = (input: any): any => {
                      if (!input) return null;
                      if (typeof input !== "string") return input;
                      try { return JSON.parse(input); } catch {
                        const jsonMatch = input.match(/```json\s*([\s\S]*?)\s*(?:```|$)/);
                        if (jsonMatch) try { return JSON.parse(jsonMatch[1].trim()); } catch {}
                        const start = Math.max(input.indexOf('{'), input.indexOf('['));
                        const end = Math.max(input.lastIndexOf('}'), input.lastIndexOf(']'));
                        if (start !== -1 && end > start) try { return JSON.parse(input.substring(start, end + 1).trim()); } catch {}
                        return null;
                      }
                    };

                    // 1. จัดการข้อมูลตามโครงสร้างของ n8n Workflow ล่าสุด
                    if (responseData && responseData.status) {
                      const isSuccess = responseData.status === "success";
                      const data = responseData.data || {};
                      const schedule = data.schedule || data.draftSchedule || [];
                      const audit = data.auditReport || {};
                      
                      // รวบรวมข้อผิดพลาดจาก Audit Report
                      const errors: string[] = [];
                      if (audit.course_same_time === false) errors.push("พบวิชาสอบเดียวกันจัดสอบไม่พร้อมกัน");
                      if (audit.course_group_same_time === false) errors.push("พบกลุ่มวิชาเดียวกันจัดสอบไม่พร้อมกัน");
                      if (audit.room_overlap === false) errors.push("พบการใช้ห้องสอบซ้อนทับกัน");

                      const reportedErrors = [
                        ...(Array.isArray(audit.errors) ? audit.errors : []),
                        ...(Array.isArray(data.errors) ? data.errors : []),
                        ...(Array.isArray(responseData.errors) ? responseData.errors : [])
                      ];
                      reportedErrors.forEach((error: any) => {
                        const message = typeof error === "string"
                          ? error
                          : error?.message || error?.issue || error?.detail;
                        if (message && !errors.includes(message)) errors.push(message);
                      });
                      
                      // กรณี failed_validation แบบมีรายละเอียดจาก n8n ตัวเก่า (กันเหนียว)
                      const oldDetails = audit.details || [];
                      oldDetails.forEach((d: any) => {
                        errors.push(`${d.rule_violated || 'ข้อผิดพลาด'}: ${d.issue || 'พบปัญหา'} (ID: ${d.affected_ids?.join(', ') || '-'})`);
                      });

                      if (!isSuccess && errors.length === 0) {
                        errors.push(responseData.message || data.message || "ตารางสอบไม่ผ่านการตรวจสอบเงื่อนไข");
                      }

                      finalSchedule = schedule;
                      finalValidation = {
                        isValid: isSuccess && errors.length === 0,
                        summary: {
                          totalExams: new Set(finalSchedule.map((s: any) => s.courseCode || s.courseId)).size,
                          totalRoomsUsed: new Set(
                            finalSchedule
                              .map((s: any) => getRoomNumber(s))
                              .filter(Boolean)
                          ).size,
                          violations: { 
                            critical: errors.length, 
                            warning: 0 
                          }
                        },
                        errors: errors
                      };
                    } 
                    // 2. Fallback สำหรับโครงสร้างอื่นๆ
                    else if (responseData) {
                      const item = Array.isArray(responseData) ? responseData[0] : responseData;
                      const content = item?.output ? parseOutput(item.output) : parseOutput(item);
                      if (Array.isArray(content)) {
                        finalSchedule = content;
                        finalValidation = { 
                          isValid: true, 
                          summary: { 
                            totalExams: new Set(content.map((s: any) => s.courseCode || s.courseId)).size, 
                            totalRoomsUsed: new Set(
                              content
                                .map((s: any) => getRoomNumber(s))
                                .filter(Boolean)
                            ).size 
                          }, 
                          errors: [] 
                        };
                      }
                    }

                    // ตรวจสอบความถูกต้องขั้นสุดท้าย (ต้องมีข้อมูลหรือรายงานผลอย่างใดอย่างหนึ่ง)
                    if (finalSchedule.length === 0 && (!finalValidation || (finalValidation.isValid && finalValidation.errors.length === 0))) {
                      throw new Error("ไม่พบข้อมูลตารางสอบหรือรายงานการตรวจสอบ (ตรวจสอบสถานะ Workflow ใน n8n)");
                    }

                    // ⭐ ดึงข้อมูลล่าสุดจากฐานข้อมูลจริง เพื่อเลี่ยงข้อมูลค้างจาก n8n
                    try {
                      // รอ 1 วินาทีเพื่อให้มั่นใจว่า n8n อัปเดต DB เสร็จสมบูรณ์
                      await new Promise(resolve => setTimeout(resolve, 1000));
                      const dbResponse = await api.get("/exam-plans");
                      if (Array.isArray(dbResponse.data) && dbResponse.data.length > 0) {
                        console.log("ดึงข้อมูลล่าสุดจาก DB สำเร็จ:", dbResponse.data.length, "แถว");
                        finalSchedule = dbResponse.data;
                      }
                    } catch (dbErr) {
                      console.warn("ไม่สามารถดึงข้อมูลอัปเดตจาก DB ได้ จะใช้ข้อมูลจาก n8n แทน", dbErr);
                    }

                    setValidation(finalValidation);
                    setResult(finalSchedule);
                    setStatus("success");
                  } catch (error: unknown) {
                    console.error("การจัดตารางสอบล้มเหลว", error);
                    const err = error as { response?: { data?: { message?: string } }; message?: string };
                    setErrorMessage(
                      err?.response?.data?.message || 
                      err?.message || 
                      "เกิดข้อผิดพลาดในการเชื่อมต่อกับ n8n"
                    );
                    setStatus("error");
                  }
                };

  const handleDownloadPdf = async () => {
    try {
      const values = getValues();
      const params = new URLSearchParams();
      if (values.semester) params.append("semester", values.semester);
      if (values.academicYear) params.append("academicYear", values.academicYear);
      if (selectedDepartment !== "all") params.append("departmentName", selectedDepartment);

      const response = await api.get(`/exam-plans/exam/pdf?${params.toString()}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `ตารางสอบ-${values.semester || 'สรุป'}-${values.academicYear || ''}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("ดาวน์โหลดตารางสอบสำเร็จ");
    } catch (err) {
      console.error("Error downloading PDF:", err);
      toast.error("ไม่สามารถดาวน์โหลดตารางสอบได้");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          เรียกใช้การจัดตารางสอบ
        </h1>
      </div>

      {/* Configuration Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white p-8 rounded-2xl shadow-lg"
      >
        <div className="flex items-center mb-6">
          <Settings className="w-8 h-8 text-indigo-600 mr-4" />
          <h2 className="text-2xl font-bold text-gray-900">
            1. กำหนดค่าช่วงเวลาการจัดตารางสอบ
          </h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="semester"
                className="block text-sm font-medium text-gray-500"
              >
                ภาคเรียน
              </label>
              <input
                id="semester"
                {...register("semester", { required: "ต้องระบุภาคการศึกษา" })}
                className="mt-1 block w-full bg-gray-100 border border-gray-200 rounded-lg py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.semester && (
                <p className="text-sm text-rose-600 mt-1">
                  {errors.semester.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="academicYear"
                className="block text-sm font-medium text-gray-500"
              >
                ปีการศึกษา
              </label>
              <input
                id="academicYear"
                {...register("academicYear", {
                  required: "ต้องระบุปีการศึกษา",
                })}
                className="mt-1 block w-full bg-gray-100 border border-gray-200 rounded-lg py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.academicYear && (
                <p className="text-sm text-rose-600 mt-1">
                  {errors.academicYear.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="examStart"
                className="block text-sm font-medium text-gray-500"
              >
                วันที่เริ่มสอบ
              </label>
              <input
                id="examStart"
                type="date"
                {...register("examStart", {
                  required: "ต้องระบุวันที่เริ่มสอบ",
                })}
                className="mt-1 block w-full bg-gray-100 border border-gray-200 rounded-lg py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.examStart && (
                <p className="text-sm text-rose-600 mt-1">
                  {errors.examStart.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="examEnd"
                className="block text-sm font-medium text-gray-500"
              >
                วันที่สิ้นสุดการสอบ
              </label>
              <input
                id="examEnd"
                type="date"
                {...register("examEnd", {
                  required: "ต้องระบุวันที่สิ้นสุดการสอบ",
                })}
                className="mt-1 block w-full bg-gray-100 border border-gray-200 rounded-lg py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.examEnd && (
                <p className="text-sm text-rose-600 mt-1">
                  {errors.examEnd.message}
                </p>
              )}
            </div>
          </div>
          <div className="pt-4 text-right">
            <button
              type="submit"
              disabled={status === "processing"}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              <Workflow className="w-5 h-5 mr-2" />
              {status === "processing"
                ? "กำลังสร้างตารางสอบ..."
                : "สร้างตารางสอบ"}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Status & Results Card */}
      <AnimatePresence>
        {status !== "idle" && (
          <motion.div
            key="scheduling-results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="bg-white p-8 rounded-2xl shadow-lg"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <Cpu className="w-8 h-8 text-indigo-600 mr-4" />
                <h2 className="text-2xl font-bold text-gray-900">
                  2. ผลการจัดตารางสอบ
                </h2>
              </div>
              {status === "success" && result && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDownloadPdf}
                    className="inline-flex items-center px-4 py-2 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    ดาวน์โหลด PDF
                  </button>
                </div>
              )}
            </div>
            {status === "processing" && (
              <div className="flex items-center space-x-4 text-lg text-gray-500">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p>AI กำลังประมวลผลตารางสอบ อาจใช้เวลาสักครู่...</p>
              </div>
            )}
            {status === "success" && (
              <div>
                <div className={`flex items-center text-lg font-semibold mb-4 ${validation?.isValid ? "text-green-600" : "text-amber-600"}`}>
                  {validation?.isValid ? (
                    <CheckCircle className="w-6 h-6 mr-2" />
                  ) : (
                    <AlertCircle className="w-6 h-6 mr-2" />
                  )}
                  <p>
                    {validation?.isValid 
                      ? "สร้างตารางสอบสำเร็จและผ่านการตรวจสอบเงื่อนไข!" 
                      : "สร้างตารางสอบแล้ว แต่พบข้อผิดพลาดตามเงื่อนไข (Constraint Violation)"}
                  </p>
                </div>

                {validation && (
                  <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`p-4 rounded-xl border ${validation.isValid ? "bg-green-50 border-green-100" : "bg-rose-50 border-rose-100"}`}>
                      <p className={`text-sm font-medium mb-1 ${validation.isValid ? "text-green-600" : "text-rose-600"}`}>สถานะความถูกต้อง</p>
                      <div className="flex items-center">
                        {validation.isValid ? (
                          <span className="flex items-center text-green-700 font-bold">
                            <CheckCircle className="w-4 h-4 mr-1" /> ผ่านเกณฑ์
                          </span>
                        ) : (
                          <span className="flex items-center text-rose-700 font-bold">
                            <AlertCircle className="w-4 h-4 mr-1" /> ไม่ผ่านเกณฑ์
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-sm font-medium text-slate-500 mb-1">จำนวนวิชาสอบ</p>
                      <p className="text-xl font-bold text-slate-900">{validation.summary.totalExams}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-sm font-medium text-slate-500 mb-1">ห้องที่ใช้</p>
                      <p className="text-xl font-bold text-slate-900">{validation.summary.totalRoomsUsed}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-sm font-medium text-slate-500 mb-1">ข้อผิดพลาด</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-xl font-bold text-slate-900">{validation.errors.length}</p>
                        {validation.summary.violations && (
                          <p className="text-xs text-slate-400">
                            (วิกฤต: <span className={validation.summary.violations.critical > 0 ? "text-rose-500 font-bold" : ""}>{validation.summary.violations.critical === 0 ? "ไม่มี" : validation.summary.violations.critical}</span>, 
                            เตือน: <span className={validation.summary.violations.warning > 0 ? "text-amber-500 font-bold" : ""}>{validation.summary.violations.warning === 0 ? "ไม่มี" : validation.summary.violations.warning}</span>)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {validation && validation.errors.length > 0 && (
                  <div className="mb-6 p-6 bg-rose-50 border-2 border-rose-200 rounded-2xl shadow-sm">
                    <div className="flex items-center text-rose-800 mb-4">
                      <AlertCircle className="w-6 h-6 mr-3" />
                      <h3 className="text-lg font-bold">รายละเอียดข้อผิดพลาดที่ไม่ผ่านเงื่อนไข:</h3>
                    </div>
                    <div className="space-y-3">
                      {validation.errors.map((err, idx) => (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-start bg-white/50 p-3 rounded-lg border border-rose-100"
                        >
                          <span className="flex-shrink-0 w-6 h-6 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="text-sm text-rose-700 leading-relaxed">{err}</p>
                        </motion.div>
                      ))}
                    </div>
                    {!validation.isValid && (
                      <p className="mt-4 text-xs text-rose-500 italic">
                        * โปรดแก้ไขข้อมูลพื้นฐานหรือปรับเปลี่ยนเงื่อนไข แล้วทำการสร้างตารางใหม่อีกครั้ง
                      </p>
                    )}
                  </div>
                )}

                {/* Department Filter */}
                {uniqueDepartments.length > 0 && (
                  <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center gap-4">
                    <div className="flex items-center text-slate-700 font-semibold">
                      <Filter className="w-5 h-5 mr-2" />
                      กรองตามสาขาวิชา:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedDepartment("all")}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          selectedDepartment === "all"
                            ? "bg-indigo-600 text-white shadow-md"
                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                      >
                        ทั้งหมด
                      </button>
                      {uniqueDepartments.map((dept) => (
                        <button
                          key={dept}
                          onClick={() => setSelectedDepartment(dept)}
                          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            selectedDepartment === dept
                              ? "bg-indigo-600 text-white shadow-md"
                              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                          }`}
                        >
                          {dept}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <ScheduleTable schedule={filteredSchedule} />
              </div>
            )}
            {status === "error" && (
              <div className="space-y-2">
                <div className="flex items-center text-lg text-rose-600 font-semibold">
                  <AlertCircle className="w-6 h-6 mr-2" />
                  <p>
                    ไม่สามารถสร้างตารางสอบได้
                    โปรดตรวจสอบการกำหนดค่าแล้วลองอีกครั้ง
                  </p>
                </div>
                {errorMessage && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg">
                    <p className="text-sm text-rose-700 font-mono break-all">
                      {errorMessage}
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminScheduling;
