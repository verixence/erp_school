# 📱 Mobile App Notification Behavior

## Current Configuration

### ✅ Fixed: No More In-App Notifications!

The app now follows **mobile app best practices**:

1. **When App is CLOSED/BACKGROUND**:
   - ✅ Shows **push notifications** in system tray
   - ✅ Plays sound
   - ✅ Shows badge count
   - ✅ User can tap to open app

2. **When App is OPEN (Foreground)**:
   - ✅ **No in-app banners** (clean UX!)
   - ✅ Badge count updates silently
   - ✅ App can refresh data in background
   - ❌ No notification alerts blocking the UI

## Configuration File
[src/services/notifications.ts](src/services/notifications.ts) - Lines 9-15

```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,  // ❌ No in-app alerts
    shouldPlaySound: false,  // 🔇 Silent when app is open
    shouldSetBadge: true,    // ✅ Update badge count
  }),
});
```

## How It Works

### Push Notification Flow

```
1. Server sends notification
   ↓
2. Expo Push Service receives it
   ↓
3. Device receives notification
   ↓
4. Is app in foreground?
   ├─ YES → Silent update (badge only)
   └─ NO  → Show push notification (system tray)
```

### For Users

**Teachers/Parents will see:**
- 📲 Push notifications when app is closed
- 🔔 Badge count on app icon
- 🔕 Clean app experience (no popups when using the app)

## Notification Types Supported

All notifications work as push notifications:

| Type | When Sent | Example |
|------|-----------|---------|
| 📢 Announcements | School makes announcement | "School closed tomorrow" |
| 📚 Assignments | New homework assigned | "Math homework due Friday" |
| ⭐ Grades | New marks entered | "Math exam results available" |
| ✅ Attendance | Attendance marked | "Your child was marked present" |
| 📅 Events | Calendar event added | "Sports Day - March 15th" |
| 💬 Messages | New message received | "Teacher sent you a message" |
| ⏰ Reminders | Automated reminders | "Homework due in 1 hour" |
| 🚨 Emergencies | Urgent alerts | "Emergency lockdown" |

## User Controls

Users can manage notifications in:
- App Settings → Notifications
- Device Settings → App Notifications

### Preferences
Users can enable/disable each notification type individually:
```typescript
{
  announcements: true,   // School announcements
  assignments: true,     // Homework notifications
  grades: true,          // Grade updates
  attendance: true,      // Attendance alerts
  events: true,          // Calendar events
  messages: true,        // Direct messages
  reminders: true,       // Automated reminders
  emergencies: true      // Cannot be disabled!
}
```

## Technical Details

### Permission Flow
1. App requests notification permission on first launch
2. User grants/denies permission
3. If granted, app registers with Expo Push Service
4. Push token stored in database
5. Notifications can now be sent

### Token Management
- Push tokens stored in `push_tokens` table
- Associated with user_id, school_id, platform
- Tokens marked inactive on logout
- Cleaned up periodically

### Security
- ✅ Notifications only sent to users with valid tokens
- ✅ Respects user preferences
- ✅ Emergency notifications always sent
- ✅ Tokens invalidated on logout

## Testing

### Test Push Notifications

1. **Get your push token** (shown in app logs)
2. **Send a test notification**:
   ```bash
   curl -H "Content-Type: application/json" \
        -X POST https://exp.host/--/api/v2/push/send \
        -d '{
          "to": "ExponentPushToken[YOUR_TOKEN_HERE]",
          "title": "Test Notification",
          "body": "This is a test push notification!",
          "sound": "default"
        }'
   ```

3. **Test scenarios**:
   - App closed: Should show push notification
   - App open: Should NOT show alert (silent)
   - Lock screen: Should show notification

## Troubleshooting

### Not receiving notifications?

1. **Check permissions**: Settings → App → Notifications → Enabled
2. **Check push token**: Look for "Push token:" in app logs
3. **Check preferences**: App Settings → Notifications
4. **Test with physical device**: Simulators don't support push notifications
5. **Check network**: Device needs internet connection

### Still showing in-app alerts?

- Make sure the app restarted after the fix
- Clear app cache: `npx expo start --clear`
- Reinstall the app if needed

## Best Practices

✅ **DO:**
- Use push notifications for important updates
- Respect user preferences
- Send timely, relevant notifications
- Test on physical devices
- Handle notification taps to navigate to relevant screens

❌ **DON'T:**
- Send too many notifications (notification fatigue)
- Send notifications for trivial updates
- Use in-app banners (blocks UI)
- Send during quiet hours (10pm-7am)
- Ignore user preferences

## Future Enhancements

Potential improvements:
- 🌙 Quiet hours (don't send 10pm-7am)
- 📊 Notification analytics
- 🔢 Custom badge counts
- 🎨 Rich media (images, actions)
- 📱 Platform-specific features (iOS critical alerts)
- 🔔 Sound customization
- 📅 Scheduled notifications

---

**Note**: This is native mobile app behavior - clean, professional, and user-friendly! ✨
