import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class ChatTile extends StatelessWidget {
  final String chatId;
  final String name;
  final String lastMessage;
  final String time;
  final int unread;
  final bool isOnline;
  final String activityEmoji;
  final String environmentEmoji;
  final VoidCallback onTap;

  const ChatTile({
    super.key,
    required this.chatId,
    required this.name,
    required this.lastMessage,
    required this.time,
    required this.unread,
    required this.isOnline,
    required this.activityEmoji,
    required this.environmentEmoji,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppTheme.deepShadow,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Stack(
          children: [
            // Avatar
            CircleAvatar(
              radius: 24,
              backgroundImage: NetworkImage('https://via.placeholder.com/48'),
            ),
            // Online indicator
            if (isOnline)
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: AppTheme.ambientGreen,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: AppTheme.deepShadow,
                      width: 2,
                    ),
                  ),
                ),
              ),
          ],
        ),
        title: Row(
          children: [
            // Name
            Expanded(
              child: Text(
                name,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ),
            // Time
            Text(
              time,
              style: TextStyle(
                color: unread > 0
                    ? AppTheme.NishiPurple
                    : AppTheme.vanishGray,
                fontSize: 12,
              ),
            ),
          ],
        ),
        subtitle: Row(
          children: [
            // Activity emoji
            Text(
              activityEmoji,
              style: const TextStyle(fontSize: 12),
            ),
            const SizedBox(width: 4),
            // Environment emoji
            Text(
              environmentEmoji,
              style: const TextStyle(fontSize: 12),
            ),
            const SizedBox(width: 8),
            // Last message
            Expanded(
              child: Text(
                lastMessage,
                style: TextStyle(
                  color: AppTheme.vanishGray,
                  fontSize: 14,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            // Unread badge
            if (unread > 0)
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: AppTheme.NishiPurple,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '$unread',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
          ],
        ),
        onTap: onTap,
      ),
    );
  }
}
