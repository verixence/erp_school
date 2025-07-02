# Delete School Feature - Implementation Guide

## Overview
The delete school feature allows super administrators to permanently delete schools and all associated data from the ERP system. This is a highly destructive operation that includes multiple layers of confirmation and comprehensive data cleanup.

## ⚠️ Critical Safety Features

### Double Confirmation Process
1. **Warning Screen**: Displays comprehensive warnings about data loss
2. **School Name Verification**: Requires typing the exact school name
3. **Final Confirmation**: Requires typing "DELETE" to proceed
4. **User Authorization**: Only super admins can access this feature

### Comprehensive Data Cleanup
The deletion process removes ALL associated data including:
- All users (admins, teachers, parents, students)
- Student records and parent-student relationships
- Timetables, sections, and periods
- Exam data, papers, and marks
- Homework assignments
- Announcements and community posts
- Audit logs (except the deletion log)
- School settings and configurations

## Architecture

### Database Layer
**Function**: `delete_school_with_audit()`
- Location: Database migration (`delete_school_function`)
- Security: Validates super admin permissions
- Audit: Creates deletion log before cleanup
- Cleanup: Handles cascading deletes in proper order
- Performance: Refreshes materialized views

### API Layer
**Endpoint**: `DELETE /api/admin/delete-school`
- Authentication: Validates super admin role
- Validation: Confirms school existence and user permissions
- Logging: Comprehensive server-side logging
- Response: Detailed deletion summary

### Frontend Components

#### DeleteSchoolModal
- Multi-step confirmation process
- Real-time validation
- Animated transitions
- Loading states during deletion

#### Integration Points
1. **Schools Management Page** (`/super-admin/schools`)
   - Delete button in actions column
   - Bulk delete capabilities ready
   
2. **Individual School Page** (`/super-admin/[id]`)
   - Delete button in Quick Actions
   - Redirects to schools list after deletion

## Implementation Details

### Database Function Features
```sql
-- Key features of delete_school_with_audit():
- Parameter validation (school exists, user is super admin)
- Comprehensive audit logging
- Ordered deletion to respect foreign key constraints
- Detailed count tracking of deleted records
- Materialized view refresh for analytics
- Graceful error handling with descriptive messages
```

### API Security
- Service role key usage for privileged operations
- Multiple validation layers
- Comprehensive error handling
- Request logging for audit trails

### Frontend UX
- **Progressive Disclosure**: Multi-step process prevents accidental deletion
- **Clear Warnings**: Explicit lists of what will be deleted
- **Visual Feedback**: Loading states and success/error messages
- **Accessibility**: Proper ARIA labels and keyboard navigation

## Usage Guide

### For Super Administrators

#### From Schools Management Page
1. Navigate to `/super-admin/schools`
2. Click the trash icon in the Actions column
3. Follow the 3-step confirmation process
4. School and all data will be permanently deleted

#### From Individual School Page
1. Navigate to `/super-admin/[school-id]`
2. Scroll to Quick Actions section
3. Click "Delete School Permanently" button
4. Complete the confirmation process
5. Automatically redirected to schools list

### Confirmation Steps
1. **Warning Screen**
   - Read all warnings carefully
   - Understand data cannot be recovered
   - Check "I understand" checkbox
   
2. **School Name Confirmation**
   - Type the exact school name as displayed
   - Case-sensitive matching
   
3. **Final Confirmation**
   - Type "DELETE" exactly (case-sensitive)
   - Confirm understanding of permanent action

## Technical Specifications

### Database Changes
- New function: `delete_school_with_audit()`
- Comprehensive cascading cleanup
- Audit log preservation for deletion events
- Performance optimizations for large datasets

### API Endpoints
```typescript
DELETE /api/admin/delete-school
Body: {
  schoolId: string,
  confirmationText: string,
  userId: string,
  confirmationToken: string
}

Response: {
  success: boolean,
  message: string,
  deletedSchool: { id, name, status, created_at },
  deletedRecordsCount: { [table]: count },
  deletedBy: { id, email },
  deletedAt: timestamp
}
```

### Frontend Components
- `DeleteSchoolModal`: Reusable confirmation modal
- `SchoolsManagementPage`: Enhanced with delete actions
- `EnhancedSchoolDetailsPage`: Danger zone with delete option

## Security Considerations

### Access Control
- Super admin role required
- User ID validation on every request
- Session verification through authentication

### Data Protection
- No accidental deletion possible
- Multiple confirmation steps
- Comprehensive audit logging
- Clear warning about irreversibility

### Error Handling
- Graceful failure modes
- Descriptive error messages
- Server-side logging for debugging
- Frontend toast notifications

## Monitoring & Audit

### Audit Logging
Every deletion creates an audit log entry with:
- School details before deletion
- User who performed deletion
- Timestamp of deletion
- Confirmation token used
- Count of all deleted records

### Performance Monitoring
- Database function execution time
- API response times
- Frontend loading states
- Error rates and types

## Future Enhancements

### Potential Improvements
1. **Soft Delete Option**: Mark as deleted instead of permanent removal
2. **Backup Integration**: Automatic backup before deletion
3. **Batch Operations**: Delete multiple schools simultaneously
4. **Recovery Window**: 24-hour recovery period for accidental deletions
5. **Data Export**: Export school data before deletion

### Analytics Integration
- Deletion frequency tracking
- Recovery success rates
- User behavior analysis
- Performance optimization opportunities

## Troubleshooting

### Common Issues
1. **Permission Denied**: Ensure user has super_admin role
2. **School Not Found**: Verify school ID exists
3. **Database Timeout**: Large schools may take longer to delete
4. **Partial Deletion**: Check audit logs for specific table failures

### Error Codes
- `400`: Invalid confirmation text or missing parameters
- `403`: Insufficient permissions (not super admin)
- `404`: School not found
- `500`: Database error or unexpected failure

## Testing

### Manual Testing Checklist
- [ ] Super admin can access delete functionality
- [ ] Non-super admin users cannot access delete
- [ ] All confirmation steps work correctly
- [ ] School name validation is case-sensitive
- [ ] DELETE confirmation is case-sensitive
- [ ] Loading states display during deletion
- [ ] Success toast appears after deletion
- [ ] Redirect works correctly
- [ ] All data is actually deleted from database
- [ ] Audit log is created correctly

### Automated Testing
- Unit tests for database function
- API endpoint tests with various scenarios
- Frontend component testing with React Testing Library
- Integration tests for complete deletion flow

## Support

For issues or questions about the delete school feature:
1. Check audit logs for deletion history
2. Verify user permissions in users table
3. Review server logs for API errors
4. Contact system administrator for database issues

---

**⚠️ IMPORTANT**: This feature permanently deletes data. Always ensure proper backups exist before using this functionality in production environments. 