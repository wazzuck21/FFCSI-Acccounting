import React from 'react';
import { CompliancePerformanceData, StaffProductivityData } from '../../lib/biEngine';
import { ShieldCheck, CheckSquare, Clock, Users, AlertCircle, ShieldAlert, Award } from 'lucide-react';

interface BiComplianceSectionProps {
  complianceData: CompliancePerformanceData;
  staffData: StaffProductivityData;
}

export const BiComplianceSection: React.FC<BiComplianceSectionProps> = ({ complianceData, staffData }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left Column: Compliance Tasks Summary & Form Performance (2 Columns) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Compliance Task Status Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center text-xs">
          <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200/60">
            <span className="text-[10px] font-bold text-amber-800 uppercase">Due Today</span>
            <p className="text-xl font-black text-amber-950 mt-1">{complianceData.tasksDueToday}</p>
          </div>
          <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-200/60">
            <span className="text-[10px] font-bold text-blue-800 uppercase">Due This Week</span>
            <p className="text-xl font-black text-blue-950 mt-1">{complianceData.tasksDueThisWeek}</p>
          </div>
          <div className="p-2.5 bg-rose-50/60 rounded-xl border border-rose-200/60">
            <span className="text-[10px] font-bold text-rose-800 uppercase">Overdue</span>
            <p className="text-xl font-black text-rose-950 mt-1">{complianceData.tasksOverdue}</p>
          </div>
          <div className="p-2.5 bg-purple-50/60 rounded-xl border border-purple-200/60">
            <span className="text-[10px] font-bold text-purple-800 uppercase">For Review</span>
            <p className="text-xl font-black text-purple-950 mt-1">{complianceData.tasksForReview}</p>
          </div>
          <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200/60">
            <span className="text-[10px] font-bold text-emerald-800 uppercase">Completed</span>
            <p className="text-xl font-black text-emerald-950 mt-1">{complianceData.tasksCompleted}</p>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-700 uppercase">Completion Rate</span>
            <p className="text-xl font-black text-slate-900 mt-1">{complianceData.completionRatePercentage}%</p>
          </div>
        </div>

        {/* Compliance Performance by Statutory Agency / Form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Statutory Compliance Completion by Form / Category
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] bg-slate-50">
                  <th className="py-2.5 px-3">Form / Requirement Code</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Total Filings</th>
                  <th className="py-2.5 px-3 text-center">Completed</th>
                  <th className="py-2.5 px-3 text-center">Overdue</th>
                  <th className="py-2.5 px-3 text-right">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complianceData.complianceByForm.map((f) => (
                  <tr key={f.formCode} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{f.formCode}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {f.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700">{f.totalTasks}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-600">{f.completedTasks}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-rose-600">{f.overdueTasks}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                      {f.completionRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Right Column: Staff Productivity & Capacity Matrix */}
      <div className="space-y-6">
        
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Staff Capacity & Workload Matrix
          </h3>

          <div className="space-y-3">
            {staffData.staffList.map((s) => (
              <div key={s.staffId} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800">{s.staffName}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                    s.workloadLevel === 'Heavy'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : s.workloadLevel === 'Moderate'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {s.workloadLevel} Workload
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1 text-[11px] text-slate-600">
                  <div>Clients: <span className="font-bold text-slate-800">{s.assignedClientsCount}</span></div>
                  <div>Tasks: <span className="font-bold text-slate-800">{s.assignedTasksCount}</span></div>
                  <div>Overdue: <span className="font-bold text-rose-600">{s.overdueTasksCount}</span></div>
                </div>

                {/* Completion Rate Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                    <span>Task Completion</span>
                    <span>{s.completionRate}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div style={{ width: `${s.completionRate}%` }} className="bg-blue-600 h-full rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
