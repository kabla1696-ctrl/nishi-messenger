import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../widgets/message_bubble.dart';
import '../widgets/chat_input.dart';
import '../widgets/ambient_indicator.dart';
import '../widgets/universe_toggle.dart';

class ChatScreen extends ConsumerStatefulWidget {
  final String chatId;

  const ChatScreen({super.key, required this.chatId});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isUniverseReal = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/home'),
        ),
        title: Row(
          children: [
            // User avatar
            const CircleAvatar(
              radius: 18,
              backgroundImage: NetworkImage('https://via.placeholder.com/36'),
            ),
            const SizedBox(width: 12),
            // User name and ambient indicator
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'User Name',
                    style: TextStyle(fontSize: 16),
                  ),
                  const AmbientIndicator(userId: 'user_id'),
                ],
              ),
            ),
          ],
        ),
        actions: [
          // Universe toggle
          UniverseToggle(
            isReal: _isUniverseReal,
            onToggle: (isReal) {
              setState(() {
                _isUniverseReal = isReal;
              });
            },
          ),
          // More options
          PopupMenuButton<String>(
            onSelected: (value) {
              switch (value) {
                case 'ghost_drop':
                  context.push('/ghost-drop');
                  break;
                case 'settings':
                  context.push('/settings');
                  break;
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'ghost_drop',
                child: Row(
                  children: [
                    Icon(Icons.map, color: Colors.blue),
                    SizedBox(width: 8),
                    Text('Ghost Drop'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'settings',
                child: Row(
                  children: [
                    Icon(Icons.settings, color: Colors.grey),
                    SizedBox(width: 8),
                    Text('Settings'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // Universe indicator
          if (!_isUniverseReal)
            Container(
              padding: const EdgeInsets.all(8),
              color: Colors.orange.withOpacity(0.2),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.theater_comedy, color: Colors.orange, size: 16),
                  const SizedBox(width: 8),
                  Text(
                    '🎭 Decoy Universe Active',
                    style: TextStyle(
                      color: Colors.orange,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),

          // Messages list
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: 20, // Mock messages
              itemBuilder: (context, index) {
                final isMe = index % 2 == 0;
                return MessageBubble(
                  message: 'Message ${index + 1}',
                  isMe: isMe,
                  timestamp: DateTime.now(),
                  isScreenshotTrapped: index == 5,
                );
              },
            ),
          ),

          // Chat input
          ChatInput(
            controller: _messageController,
            onSend: _sendMessage,
            onGhostDrop: _createGhostDrop,
          ),
        ],
      ),
    );
  }

  void _sendMessage() {
    final message = _messageController.text.trim();
    if (message.isEmpty) return;

    // TODO: Send message via Socket.IO
    print('📤 Sending message: $message (Universe: ${_isUniverseReal ? "real" : "decoy"})');

    _messageController.clear();
    _scrollController.animateTo(
      _scrollController.position.maxScrollExtent,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
    );
  }

  void _createGhostDrop() {
    // TODO: Open ghost drop creation dialog
    print('🗺️ Creating ghost drop...');
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }
}
