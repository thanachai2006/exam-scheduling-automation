import React, { useMemo } from 'react';
import type { ScheduleResult } from '../../pages/admin/AdminScheduling';

interface ScheduleTableProps {
    schedule: ScheduleResult[];
}

interface DateGroup {
    key: string;
    rows: ScheduleResult[];
}

interface ClassGroup {
    displayName: string;
    deptName: string;
    dates: DateGroup[];
    totalRows: number;
}

const ScheduleTable: React.FC<ScheduleTableProps> = ({ schedule }) => {
    const formatClassName = (className: string): string => {
        const cleanedClass = className.replace(/\s?[ก-ฮ]{2}\.$/, "").trim();
        return cleanedClass;
    };

    const getClassSortKey = (className: string, deptName: string): string => {
        const parts = className.split('/');
        const level = parts[0].trim();
        const section = parts[1] ? parts[1].trim().padStart(3, '0') : "000";
        return `${deptName}_${level}_${section}`;
    };

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
            return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
        } catch { return dateStr; }
    };

    const formatTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
        } catch { return dateStr; }
    };

    const groupedData = useMemo(() => {
        if (!schedule || schedule.length === 0) return [];

        const sorted = [...schedule].sort((a, b) => {
            const aKey = getClassSortKey(a.className, a.departmentName);
            const bKey = getClassSortKey(b.className, b.departmentName);
            if (aKey !== bKey) return aKey.localeCompare(bKey, 'th');
            return new Date(a.timeStart).getTime() - new Date(b.timeStart).getTime();
        });

        const classes: ClassGroup[] = [];
        sorted.forEach(item => {
            const displayClassName = formatClassName(item.className);
            const dateKey = formatDate(item.timeStart);
            
            let classObj = classes.find(c => c.displayName === displayClassName);
            if (!classObj) {
                classObj = { 
                    displayName: displayClassName,
                    deptName: item.departmentName,
                    dates: [], 
                    totalRows: 0 
                };
                classes.push(classObj);
            }

            let dateObj = classObj.dates.find((d) => d.key === dateKey);
            if (!dateObj) {
                dateObj = { key: dateKey, rows: [] };
                classObj.dates.push(dateObj);
            }
            dateObj.rows.push(item);
            classObj.totalRows++;
        });

        return classes;
    }, [schedule]);

    if (!schedule || schedule.length === 0) {
        return <div className="text-center py-12 text-slate-400 bg-white border border-slate-200">ไม่มีข้อมูลตารางสอบ</div>;
    }

    return (
        <div className="overflow-x-auto border border-slate-300">
            <table className="w-full text-sm text-left border-collapse bg-white">
                <thead className="bg-slate-50 text-slate-800 font-bold border-b border-slate-300">
                    <tr>
                        <th className="px-4 py-3 border-r border-slate-300 text-center w-28">ชั้น</th>
                        <th className="px-4 py-3 border-r border-slate-300 text-center w-48">สาขาวิชา</th>
                        <th className="px-4 py-3 border-r border-slate-300 text-center w-32">วันสอบ</th>
                        <th className="px-4 py-3 border-r border-slate-300 text-center w-40">เวลาสอบ</th>
                        <th className="px-4 py-3 border-r border-slate-300 text-center w-20">ระยะเวลา (นาที)</th>
                        <th className="px-4 py-3 border-r border-slate-300 text-center w-28">รหัสวิชา</th>
                        <th className="px-4 py-3 border-r border-slate-300">รายวิชา</th>
                        <th className="px-4 py-3 text-center w-32">ห้องสอบ</th>
                    </tr>
                </thead>
                <tbody className="text-slate-700">
                    {groupedData.map((classGroup, cgIdx) => (
                        <React.Fragment key={`cg-${classGroup.displayName}-${cgIdx}`}>
                            {classGroup.dates.map((dateGroup, dateIdx) => (
                                <React.Fragment key={`dg-${classGroup.displayName}-${dateGroup.key}-${dateIdx}`}>
                                    {dateGroup.rows.map((row: ScheduleResult, rowIdx: number) => (
                                        <tr key={`row-${classGroup.displayName}-${dateGroup.key}-${row.courseCode}-${rowIdx}`} className="border-b border-slate-200">
                                            {dateIdx === 0 && rowIdx === 0 && (
                                                <>
                                                    <td rowSpan={classGroup.totalRows} className="px-4 py-3 border-r border-slate-300 align-middle text-center font-bold">
                                                        {classGroup.displayName}
                                                    </td>
                                                    <td rowSpan={classGroup.totalRows} className="px-4 py-3 border-r border-slate-300 align-middle text-center">
                                                        {classGroup.deptName}
                                                    </td>
                                                </>
                                            )}
                                            
                                            {rowIdx === 0 && (
                                                <td rowSpan={dateGroup.rows.length} className="px-4 py-3 border-r border-slate-300 align-middle text-center">
                                                    {dateGroup.key}
                                                </td>
                                            )}

                                            <td className="px-4 py-3 border-r border-slate-300 text-center">
                                                {formatTime(row.timeStart)} - {formatTime(row.timeEnd)}
                                            </td>
                                            <td className="px-4 py-3 border-r border-slate-300 text-center">
                                                {row.duration}
                                            </td>
                                            <td className="px-4 py-3 border-r border-slate-300 text-center">
                                                {row.courseCode}
                                            </td>
                                            <td className="px-4 py-3 border-r border-slate-300">
                                                {row.courseName}
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold">
                                                {(() => {
                                                  const rn = (row as any).roomnumber ?? (row as any).roomNumber ?? (row as any).room_no;
                                                  if (rn === null || rn === undefined) return "-";
                                                  const rnStr = String(rn).trim();
                                                  if (rnStr === "" || rnStr === "null") return "-";
                                                  if (rnStr === "0") return "รอดำเนินการ";
                                                  return row.roomFloor ? `${rnStr} (ชั้น ${row.roomFloor})` : rnStr;
                                                })()}
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ScheduleTable;
