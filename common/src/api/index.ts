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
  type Notification,
  type CreateNotificationData
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