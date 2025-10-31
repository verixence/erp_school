# Testing Guide: Enhanced Payment Schedule System

## Prerequisites

1. Database migrations applied
2. UI component integrated
3. At least 2-3 students with parents assigned
4. Fee categories and structures configured

---

## Test Scenario 1: Simple Full Payment Schedule

### Steps:
1. Navigate to `/school-admin/fees` → Payment Schedule tab
2. Click "New Schedule"
3. Fill in:
   - **Schedule Name**: "Term 1 Fees Testing"
   - **Academic Year**: 2025-2026
   - **Due Date**: Tomorrow's date
   - **Grace Period**: 5 days
   - **Select Grades**: NURSERY
   - **Select Fee Types**: Tuition Fee, Books Fee
   - **Reminders**: Keep all 4 enabled

4. Click "Create Schedule"

### Expected Results:
- ✅ Schedule created successfully
- ✅ Appears in schedules table
- ✅ Shows correct grades and fee types
- ✅ Status = "active"
- ✅ Student count shows number of NURSERY students
- ✅ All payment statuses initialized (check "View Status" button)

### Verify in Database:
```sql
-- Check schedule created
SELECT * FROM fee_collection_schedules
WHERE schedule_name = 'Term 1 Fees Testing';

-- Check payment status initialized
SELECT
  s.full_name,
  sps.total_amount_due,
  sps.payment_status,
  sps.balance_amount
FROM schedule_payment_status sps
JOIN students s ON s.id = sps.student_id
WHERE sps.schedule_id = 'YOUR-SCHEDULE-ID';

-- Should show all NURSERY students with status 'pending'
```

---

## Test Scenario 2: Custom Amount Overrides

### Steps:
1. Create another schedule: "Custom Amount Testing"
2. Select same grades and fee types as before
3. When selecting fee types, **add custom amounts**:
   - Tuition Fee: Override to 30000 (instead of default 28000)
   - Books Fee: Keep default

4. Create the schedule

### Expected Results:
- ✅ Schedule created
- ✅ Payment status shows custom amount
- ✅ Total amount = Custom tuition (30000) + Default books (1500) = 31500

### Verify:
```sql
-- Check amount override applied
SELECT
  s.full_name,
  sps.total_amount_due
FROM schedule_payment_status sps
JOIN students s ON s.id = sps.student_id
WHERE sps.schedule_id = 'YOUR-SCHEDULE-ID';

-- Should show 31500 per student
```

---

## Test Scenario 3: Installment Schedule

### Steps:
1. Click "New Schedule"
2. Fill in basic details:
   - **Schedule Name**: "Quarterly Installments Testing"
   - **Academic Year**: 2025-2026
   - **Due Date**: End of next month
   - **Enable Installments**: Toggle ON
   - **Frequency**: Quarterly

3. Click "Generate Installments" button
4. System should auto-create 4 installments:
   - Q1: 25% due in 1 month
   - Q2: 25% due in 4 months
   - Q3: 25% due in 7 months
   - Q4: 25% due in 10 months

5. You can edit installment names, dates, percentages
6. Create the schedule

### Expected Results:
- ✅ Schedule created with `is_installment = true`
- ✅ 4 installments created in `fee_schedule_installments` table
- ✅ Payment status has 4 separate entries per student (one per installment)
- ✅ Each shows 25% of total amount

### Verify:
```sql
-- Check installments created
SELECT * FROM fee_schedule_installments
WHERE schedule_id = 'YOUR-SCHEDULE-ID'
ORDER BY installment_number;

-- Check payment status per installment
SELECT
  s.full_name,
  fsi.installment_name,
  sps.total_amount_due,
  sps.payment_status
FROM schedule_payment_status sps
JOIN students s ON s.id = sps.student_id
JOIN fee_schedule_installments fsi ON fsi.id = sps.installment_id
WHERE sps.schedule_id = 'YOUR-SCHEDULE-ID'
ORDER BY s.full_name, fsi.installment_number;
```

---

## Test Scenario 4: Late Fee Configuration

### Steps:
1. Create new schedule: "Late Fee Testing"
2. Set **Due Date**: Yesterday's date (to make it immediately overdue)
3. Set **Grace Period**: 0 days
4. **Enable Late Fees**: Toggle ON
5. Configure late fee:
   - **Type**: Percentage
   - **Percentage**: 5%
   - **Max Amount**: 1000

6. Create the schedule

### Expected Results:
- ✅ Schedule created
- ✅ Payment status shows as "overdue" (because due date has passed)

### Trigger Late Fee Calculation:
```sql
-- Manually trigger late fee calculation
SELECT calculate_late_fees('YOUR-SCHEDULE-ID');

-- Check late fees applied
SELECT
  s.full_name,
  sps.total_amount_due,
  sps.late_fees,
  sps.balance_amount,
  sps.payment_status
FROM schedule_payment_status sps
JOIN students s ON s.id = sps.student_id
WHERE sps.schedule_id = 'YOUR-SCHEDULE-ID';

-- Check late fee charges table
SELECT * FROM late_fee_charges
WHERE schedule_id = 'YOUR-SCHEDULE-ID';
```

### Expected:
- Late fee = 5% of balance (max 1000)
- Balance = total_amount_due + late_fees
- Status = 'overdue'

---

## Test Scenario 5: Custom Reminder Messages

### Steps:
1. Create schedule: "Custom Reminders Testing"
2. Due date: 7 days from now
3. Edit the "7 days before" reminder:
   - Click to expand reminder settings
   - Change custom message to:
   ```
   Hello! Reminder for {student_name}: {schedule_name} payment of ₹{amount} is due on {due_date}. Please pay soon!
   ```

4. Create the schedule

### Test Reminder (Manual):
```sql
-- Manually send reminders
SELECT process_schedule_reminders('YOUR-SCHEDULE-ID');

-- Check notifications created
SELECT
  n.title,
  n.message,
  u.email as parent_email
FROM notifications n
JOIN users u ON u.id = n.user_id
WHERE n.type = 'fee_reminder'
  AND n.created_at > NOW() - INTERVAL '5 minutes'
ORDER BY n.created_at DESC;
```

### Expected:
- ✅ Notifications created for all parents
- ✅ Message shows actual student name, schedule name, amount, date
- ✅ Placeholders replaced correctly

---

## Test Scenario 6: Bulk Actions

### Steps:
1. Create 3 test schedules (quick ones)
2. In schedules table, check the checkboxes for all 3
3. Click "Deactivate Selected"
4. Confirm action

### Expected Results:
- ✅ All 3 schedules status changed to "inactive"
- ✅ Selection cleared after action
- ✅ Toast notification shows success

### Test Other Bulk Actions:
- **Bulk Activate**: Select inactive schedules, activate them
- **Bulk Delete**: Select schedules, delete (use test data only!)
- **Manual Reminders**: Click "Send Reminder" button on a schedule

---

## Test Scenario 7: Payment Status Tracking

### Steps:
1. Click "View Status" (👥 icon) on any schedule
2. Modal opens showing all students

### Expected View:
```
Student Name | Grade | Installment | Total Due | Paid | Late Fees | Balance | Status
------------ | ----- | ----------- | --------- | ---- | --------- | ------- | ------
Alice M      | NUR   | -           | 6500.00   | 0.00 | 0.00      | 6500.00 | Pending
Alice Z      | NUR   | -           | 6500.00   | 0.00 | 0.00      | 6500.00 | Pending
```

### Test Status Updates:
```sql
-- Simulate a partial payment
UPDATE schedule_payment_status
SET amount_paid = 3000,
    last_payment_date = NOW()
WHERE id = 'SOME-STATUS-ID';

-- Trigger should auto-update status to 'partial'
-- Refresh the UI to see updated status
```

### Test Full Payment:
```sql
-- Simulate full payment
UPDATE schedule_payment_status
SET amount_paid = total_amount_due,
    last_payment_date = NOW()
WHERE id = 'SOME-STATUS-ID';

-- Status should auto-update to 'paid'
-- Student should move to "paid" count in schedule table
```

---

## Test Scenario 8: Schedule Statistics

### After creating payments and statuses, verify:

```sql
-- Update statistics manually
SELECT update_schedule_statistics('YOUR-SCHEDULE-ID');

-- Check updated counts
SELECT
  schedule_name,
  total_students,
  paid_students,
  pending_students,
  overdue_students
FROM fee_collection_schedules
WHERE id = 'YOUR-SCHEDULE-ID';
```

### Expected:
- Numbers match actual payment statuses
- Dashboard cards show correct totals

---

## Test Scenario 9: Duplicate Schedule

### Steps:
1. Find a fully configured schedule
2. Click "Duplicate" (📋 copy icon)
3. Modal opens with all settings pre-filled
4. Change:
   - Schedule name (adds " (Copy)" automatically)
   - Due date (required)
5. Click "Create Schedule"

### Expected:
- ✅ New schedule created with same configuration
- ✅ All grades, fee types, reminders copied
- ✅ Installments NOT copied (you can regenerate)
- ✅ Payment statuses initialized for new schedule

---

## Test Scenario 10: Automated Daily Reminders

### Verify Cron Job:
```sql
-- Check if cron job exists
SELECT * FROM cron.job
WHERE jobname = 'process-fee-reminders';

-- If not exists, create it:
SELECT cron.schedule(
  'process-fee-reminders',
  '30 3 * * *', -- 3:30 AM UTC = 9:00 AM IST
  $$SELECT process_fee_reminders_daily()$$
);
```

### Test Manually:
```sql
-- Run the daily reminder processor
SELECT process_fee_reminders_daily();

-- Check what happened
SELECT
  fcs.schedule_name,
  COUNT(DISTINCT rl.student_id) as reminders_sent
FROM reminder_logs rl
JOIN fee_collection_schedules fcs ON fcs.id = rl.schedule_id
WHERE rl.sent_at > NOW() - INTERVAL '1 hour'
GROUP BY fcs.schedule_name;
```

---

## Integration Testing

### Test End-to-End Flow:
1. **Create** schedule with installments and late fees
2. **View** payment status - verify all students listed
3. **Wait** until an installment is overdue (or set past date)
4. **Run** late fee calculation - verify late fees applied
5. **Send** manual reminder - verify notifications sent
6. **Record** a payment in database - verify status updates
7. **Check** statistics updated correctly

---

## Common Issues & Solutions

### Issue 1: Payment status not initialized
**Solution**: Run manually
```sql
SELECT initialize_payment_status('schedule-id');
```

### Issue 2: Statistics not updating
**Solution**: Run manually
```sql
SELECT update_schedule_statistics('schedule-id');
```

### Issue 3: Late fees not calculating
**Solution**:
- Check late_fee_enabled = true
- Verify grace period has passed
- Run manually: `SELECT calculate_late_fees('schedule-id');`

### Issue 4: Reminders not sending
**Solution**:
- Check due_date and reminder days_before
- Verify reminders are active (is_active = true)
- Check notification type constraint includes 'fee_reminder'

### Issue 5: UI not showing new features
**Solution**:
- Clear browser cache
- Restart Next.js dev server
- Check console for errors

---

## Performance Testing

### Large Dataset Test:
1. Create a schedule for multiple grades (1-12)
2. Initialize payment status for 500+ students
3. Check query performance:

```sql
-- Should complete in < 2 seconds
EXPLAIN ANALYZE
SELECT * FROM schedule_payment_status
WHERE schedule_id = 'YOUR-SCHEDULE-ID';
```

### Bulk Operations Test:
1. Create 50 test schedules
2. Select all and bulk deactivate
3. Verify completes in < 5 seconds

---

## Sign-Off Checklist

Before considering complete:

- [ ] All 10 test scenarios pass
- [ ] Database migrations applied successfully
- [ ] UI component displays correctly
- [ ] Statistics show accurate data
- [ ] Late fees calculate correctly
- [ ] Reminders send successfully
- [ ] Bulk actions work
- [ ] Payment status updates automatically
- [ ] Installments work end-to-end
- [ ] Custom messages render correctly
- [ ] No console errors
- [ ] No database errors in logs
- [ ] Performance acceptable (< 3s page load)

---

## Next Steps After Testing

1. **Backup Database** before production deployment
2. **Test on Staging** environment first
3. **Train Admin Users** on new features
4. **Monitor** for first few days
5. **Collect Feedback** from users
6. **Iterate** based on real-world usage

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Supabase logs for database errors
3. Verify all migrations applied correctly
4. Test with smaller dataset first
5. Review `ENHANCED_PAYMENT_SCHEDULE_IMPLEMENTATION.md` for reference
