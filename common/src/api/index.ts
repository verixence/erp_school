export * from './database.types';
export * from './supabase';
export * from './hooks';

// Community API exports
export {
  getPosts,
  getAnnouncements, 
  getAllAnnouncements,
  createPost,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  updatePost,
  deletePost,
  uploadMedia,
  useCreatePost,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  useToggleReaction,
  useCreateComment,
  usePostComments,
  subscribeToPostUpdates,
  type CommunityPost,
  type Post,
  type PostReaction,
  type PostComment,
  type CommunityAnnouncement,
  type CreatePostData,
  type CreateAnnouncementData,
  type CreateReactionData,
  type CreateCommentData,
  type MediaObject
} from './community';

// Notifications API exports
export {
  getNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createNotification,
  deleteNotification,
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useCreateNotification,
  useDeleteNotification,
  subscribeToNotifications,
  // Push notification functions (Web → Mobile sync)
  createBulkNotifications,
  sendPushToUsers,
  getUsersByAudience,
  getPushQueueStats,
  sendAnnouncementNotification,
  sendHomeworkNotification,
  sendExamNotification,
  type Notification,
  type CreateNotificationData,
  type BulkNotificationResult
} from './notifications';

// Exams API exports
export {
  useExamGroups,
  useCreateExamGroup,
  useUpdateExamGroup,
  useDeleteExamGroup,
  useExamPapers,
  useExamPaper,
  useSchoolExamPapers,
  useCreateExamPaper,
  useUpdateExamPaper,
  useDeleteExamPaper,
  useMarks,
  useSchoolMarks,
  useMarksSummary,
  useCreateMarksForExam,
  useUpdateMark,
  useBulkCreateMarks,
  useBulkUpdateMarks,
  useStudentReportCard,
  useReportCards,
  useGenerateReportCards,
  useUpdateReportCardStatus,
  useExamSchedule,
  useUpdateExamSchedule,
  useSchoolInfo,
  useSchoolSections,
  type ExamType,
  type Section,
  type ExamGroup,
  type ExamPaper,
  type Mark,
  type CreateExamGroupData,
  type CreateExamPaperData,
  type UpdateMarkData,
  type ReportCard,
  type ExamSchedule
} from './exams';

// State Board API exports
export {
  useSchoolSubjects,
  useCreateSchoolSubject,
  useUpdateSchoolSubject,
  useDeleteSchoolSubject,
  useGradingScales,
  useCreateGradingScale,
  useStateBoardExamGroups,
  useCreateStateBoardExamGroup,
  useMonthlyAttendance,
  useCreateMonthlyAttendance,
  useBulkCreateMonthlyAttendance,
  useStateBoardReports,
  useGenerateStateBoardReports,
  usePublishStateBoardReport,
  calculateGrade,
  calculateOverallGrade,
  DEFAULT_FA_GRADING,
  DEFAULT_SA_GRADING,
  type AssessmentType,
  type StateBoardTerm,
  type ReportStatus,
  type SchoolSubject,
  type GradeBand,
  type GradingScale,
  type StateBoardExamGroup,
  type MonthlyAttendance,
  type SubjectMarks,
  type StateBoardReport,
  type CreateSchoolSubjectData,
  type CreateMonthlyAttendanceData,
  type CreateStateBoardExamGroupData
} from './state-board';

// Report Templates API exports
export {
  useReportTemplates,
  useReportTemplate,
  useTemplateCategories,
  useCreateReportTemplate,
  useUpdateReportTemplate,
  useDeleteReportTemplate,
  useDuplicateReportTemplate,
  usePreviewReportTemplate,
  type ReportTemplate,
  type TemplateCategory,
  type CreateReportTemplateData,
  type UpdateReportTemplateData
} from './report-templates';

// Basic brand export
export { 
  getSchoolBrand,
  type SchoolBrand
} from './brand';

// Re-export hooks that are used across the application
export {
  useAuth,
  useLogin,
  useLogout,
  useTeacherSections,
  useTeachers,
  useTeacherTimetable,
  useHomework,
  useCreateHomework,
  useAnnouncements,
  useCreateAnnouncement,
  useSectionStudents,
  useAttendanceRecords,
  useSaveAttendance,
  useTeacherDashboardStats,
  useBrand,
  usePosts,
  useCommunityAnnouncements,
  useAllAnnouncements,
} from './hooks'; 