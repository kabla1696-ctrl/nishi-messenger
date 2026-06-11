import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../widgets/chat_tile.dart';
import '../../../core/theme/app_theme.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            Text(
              '👻',
              style: TextStyle(fontSize: 28),
            ),
            SizedBox(width: 8),
            Text(
              'Nishi',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 24,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {
              // TODO: Search chats
            },
          ),
          IconButton(
            icon: const Icon(Icons.more_vert),
            onPressed: () {
              // TODO: Show menu
            },
          ),
        ],
      ),
      body: _buildBody(),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppTheme.NishiPurple,
        onPressed: () {
          // TODO: New chat
        },
        child: const Icon(
          Icons.chat,
          color: Colors.white,
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        selectedItemColor: AppTheme.NishiPurple,
        unselectedItemColor: AppTheme.vanishGray,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.chat),
            label: 'Chats',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.map),
            label: 'Ghost Drops',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.settings),
            label: 'Settings',
          ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    switch (_currentIndex) {
      case 0:
        return _buildChatList();
      case 1:
        return _buildGhostDrops();
      case 2:
        return _buildSettings();
      default:
        return _buildChatList();
    }
  }

  Widget _buildChatList() {
    // Mock data
    final chats = [
      {
        'id': '1',
        'name': 'Rahim',
        'lastMessage': 'Hey, how are you?',
        'time': '2:30 PM',
        'unread': 3,
        'isOnline': true,
        'activityEmoji': '🚶',
        'environmentEmoji': '☀️',
      },
      {
        'id': '2',
        'name': 'Karim',
        'lastMessage': 'See you tomorrow!',
        'time': '1:15 PM',
        'unread': 0,
        'isOnline': false,
        'activityEmoji': '🏠',
        'environmentEmoji': '🌙',
      },
      {
        'id': '3',
        'name': 'Sabrina',
        'lastMessage': 'Thanks for the help!',
        'time': '12:00 PM',
        'unread': 1,
        'isOnline': true,
        'activityEmoji': '📖',
        'environmentEmoji': '🏢',
      },
    ];

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: chats.length,
      itemBuilder: (context, index) {
        final chat = chats[index];
        return ChatTile(
          chatId: chat['id']!,
          name: chat['name']!,
          lastMessage: chat['lastMessage']!,
          time: chat['time']!,
          unread: chat['unread'] as int,
          isOnline: chat['isOnline'] as bool,
          activityEmoji: chat['activityEmoji']!,
          environmentEmoji: chat['environmentEmoji']!,
          onTap: () {
            context.push('/chat/${chat['id']}');
          },
        );
      },
    );
  }

  Widget _buildGhostDrops() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text(
            '🗺️',
            style: TextStyle(fontSize: 64),
          ),
          const SizedBox(height: 16),
          const Text(
            'Ghost Drops',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Your secret messages are waiting',
            style: TextStyle(
              color: AppTheme.vanishGray,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () {
              context.push('/ghost-drop');
            },
            icon: const Icon(Icons.map),
            label: const Text('View Map'),
          ),
        ],
      ),
    );
  }

  Widget _buildSettings() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Profile section
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.deepShadow,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              const CircleAvatar(
                radius: 30,
                backgroundImage: NetworkImage('https://via.placeholder.com/60'),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Your Name',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'Hey there! I am using Nishi',
                      style: TextStyle(
                        color: AppTheme.vanishGray,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right,
                color: AppTheme.vanishGray,
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),

        // Settings items
        _buildSettingsItem(
          icon: Icons.shield,
          title: 'Privacy',
          subtitle: 'Screenshot Trap, Vanish Mode',
          onTap: () {},
        ),
        _buildSettingsItem(
          icon: Icons.map,
          title: 'Ghost Drop',
          subtitle: 'Manage your secret drops',
          onTap: () {
            context.push('/ghost-drop');
          },
        ),
        _buildSettingsItem(
          icon: Icons.theater_comedy,
          title: 'Parallel Universe',
          subtitle: 'Manage decoy chats',
          onTap: () {},
        ),
        _buildSettingsItem(
          icon: Icons.sensors,
          title: 'Ambient Presence',
          subtitle: 'Control what friends see',
          onTap: () {},
        ),
        _buildSettingsItem(
          icon: Icons.notifications,
          title: 'Notifications',
          subtitle: 'Customize alerts',
          onTap: () {},
        ),
        _buildSettingsItem(
          icon: Icons.help,
          title: 'Help & Support',
          subtitle: 'FAQ, contact us',
          onTap: () {},
        ),
      ],
    );
  }

  Widget _buildSettingsItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppTheme.NishiPurple.withOpacity(0.2),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            icon,
            color: AppTheme.NishiPurple,
          ),
        ),
        title: Text(title),
        subtitle: Text(
          subtitle,
          style: TextStyle(color: AppTheme.vanishGray),
        ),
        trailing: Icon(
          Icons.chevron_right,
          color: AppTheme.vanishGray,
        ),
        onTap: onTap,
      ),
    );
  }
}
