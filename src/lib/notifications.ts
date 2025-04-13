export async function sendNotification({
  userId,
  title,
  message,
  type,
}: {
  userId: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}) {
  // For now, just log the notification
  console.log('[Notification]', {
    userId,
    title,
    message,
    type,
  });

  // TODO: In the future, you could:
  // 1. Store notifications in database
  // 2. Send email notifications
  // 3. Use websockets for real-time notifications
  // 4. Implement push notifications
}
