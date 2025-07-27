import { supabase } from './supabase';

export interface AttendanceData {
  working_days: number;
  present_days: number;
  percentage: number;
}

export interface MonthlyAttendanceData {
  [month: string]: {
    working_days: number;
    present_days: number;
    attendance_percentage: number;
  };
}

/**
 * Calculate attendance for the last 2 months for a specific student
 */
export async function calculateLast2MonthsAttendance(
  studentId: string,
  schoolId: string
): Promise<AttendanceData> {
  try {
    // Calculate date range for last 2 months
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 2);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Fetch attendance records for the student in the last 2 months
    const { data: attendanceRecords, error } = await supabase
      .from('attendance_records')
      .select('date, status')
      .eq('student_id', studentId)
      .eq('school_id', schoolId)
      .gte('date', startDateStr)
      .lte('date', endDateStr);

    if (error) throw error;

    // Get all working days in the period (excluding weekends)
    const workingDays = getWorkingDaysBetweenDates(new Date(startDateStr), new Date(endDateStr));
    
    // Count present days
    const presentDays = attendanceRecords?.filter(record => 
      record.status === 'present' || record.status === 'late'
    ).length || 0;

    // Calculate percentage
    const percentage = workingDays > 0 ? (presentDays / workingDays) * 100 : 0;

    return {
      working_days: workingDays,
      present_days: presentDays,
      percentage: Math.round(percentage * 10) / 10 // Round to 1 decimal place
    };
  } catch (error) {
    console.error('Error calculating attendance:', error);
    return {
      working_days: 0,
      present_days: 0,
      percentage: 0
    };
  }
}

/**
 * Calculate monthly attendance data for the last 2 months for state board reports
 */
export async function calculateLast2MonthsMonthlyAttendance(
  studentId: string,
  schoolId: string
): Promise<MonthlyAttendanceData> {
  try {
    // Calculate date range for last 2 months
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 2);

    const monthlyData: MonthlyAttendanceData = {};

    // Process each of the last 2 months
    for (let i = 0; i < 2; i++) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - i);
      const monthKey = (monthDate.getMonth() + 1).toString(); // 1-based month
      
      // Get start and end of the month
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      const monthStartStr = monthStart.toISOString().split('T')[0];
      const monthEndStr = monthEnd.toISOString().split('T')[0];

      // Fetch attendance records for this month
      const { data: attendanceRecords, error } = await supabase
        .from('attendance_records')
        .select('date, status')
        .eq('student_id', studentId)
        .eq('school_id', schoolId)
        .gte('date', monthStartStr)
        .lte('date', monthEndStr);

      if (error) throw error;

      // Calculate working days and present days for this month
      const workingDays = getWorkingDaysBetweenDates(monthStart, monthEnd);
      const presentDays = attendanceRecords?.filter(record =>
        record.status === 'present' || record.status === 'late'
      ).length || 0;

      const attendancePercentage = workingDays > 0 ? (presentDays / workingDays) * 100 : 0;

      monthlyData[monthKey] = {
        working_days: workingDays,
        present_days: presentDays,
        attendance_percentage: Math.round(attendancePercentage * 10) / 10
      };
    }

    return monthlyData;
  } catch (error) {
    console.error('Error calculating monthly attendance:', error);
    return {};
  }
}

/**
 * Calculate working days between two dates (excluding weekends)
 */
function getWorkingDaysBetweenDates(startDate: Date, endDate: Date): number {
  let workingDays = 0;
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
} 