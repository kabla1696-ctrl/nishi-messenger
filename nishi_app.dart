import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;

const String SERVER_URL = 'https://nishi-messenger.onrender.com';

void main() {
  runApp(const NishiApp());
}

class NishiApp extends StatelessWidget {
  const NishiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Nishi',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0A0A1A),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF6C63FF),
          brightness: Brightness.dark,
        ),
      ),
      home: const SplashScreen(),
    );
  }
}

// ============ SPLASH ============
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _check();
  }

  _check() async {
    final prefs = await SharedPreferences.getInstance();
    final user = prefs.getString('user');
    await Future.delayed(const Duration(seconds: 2));
    if (!mounted) return;
    if (user != null) {
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const HomeScreen()));
    } else {
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const AuthScreen()));
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('👻', style: TextStyle(fontSize: 80)),
            SizedBox(height: 20),
            Text('Nishi', style: TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: Color(0xFF6C63FF))),
            SizedBox(height: 10),
            Text('Messages that live, breathe, and disappear', style: TextStyle(color: Colors.white54)),
          ],
        ),
      ),
    );
  }
}

// ============ AUTH ============
class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  bool _loading = false;

  _submit() async {
    if (_name.text.isEmpty || _phone.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('সব field পূরণ করুন!')));
      return;
    }
    setState(() => _loading = true);

    try {
      // Register first
      var res = await http.post(
        Uri.parse('$SERVER_URL/api/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'name': _name.text, 'phone': _phone.text}),
      );
      var data = jsonDecode(res.body);

      // If already registered, login
      if (!data['success'] && data['error'] != null) {
        res = await http.post(
          Uri.parse('$SERVER_URL/api/auth/login'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'phone': _phone.text}),
        );
        data = jsonDecode(res.body);
      }

      if (data['success'] == true) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('user', jsonEncode(data['user']));
        await prefs.setString('token', data['token']);
        if (!mounted) return;
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const HomeScreen()));
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${data['error']}')));
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(30),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('👻', style: TextStyle(fontSize: 60)),
              const SizedBox(height: 10),
              const Text('Nishi', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF6C63FF))),
              const SizedBox(height: 8),
              const Text('নতুন account তৈরি করুন', style: TextStyle(color: Colors.white54)),
              const SizedBox(height: 30),
              _input(_name, 'নাম', Icons.person, false),
              const SizedBox(height: 15),
              _input(_phone, 'ফোন নম্বর', Icons.phone, true),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _loading ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6C63FF),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _loading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text('শুরু করুন →', style: TextStyle(fontSize: 16, color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _input(TextEditingController c, String hint, IconData icon, bool phone) {
    return TextField(
      controller: c,
      keyboardType: phone ? TextInputType.phone : TextInputType.text,
      decoration: InputDecoration(
        hintText: hint,
        prefixIcon: Icon(icon),
        filled: true,
        fillColor: Colors.white10,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}

// ============ HOME ============
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List _chats = [];
  Map? _user;
  late IO.Socket _socket;

  @override
  void initState() {
    super.initState();
    _loadUser();
    _initSocket();
    _loadChats();
  }

  _loadUser() async {
    final prefs = await SharedPreferences.getInstance();
    final u = prefs.getString('user');
    if (u != null) setState(() => _user = jsonDecode(u));
  }

  _initSocket() {
    _socket = IO.io(SERVER_URL, IO.OptionBuilder().setTransports(['websocket']).build());
    _socket.onConnect((_) {
      if (_user != null) _socket.emit('user_online', _user!['id']);
    });
    _socket.on('new_message', (_) => _loadChats());
  }

  _loadChats() async {
    if (_user == null) return;
    try {
      final res = await http.get(Uri.parse('$SERVER_URL/api/chats/${_user!['id']}'));
      final data = jsonDecode(res.body);
      if (mounted) setState(() => _chats = data['chats'] ?? []);
    } catch (_) {}
  }

  _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    if (mounted) Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const AuthScreen()));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            Text('👻', style: TextStyle(fontSize: 24)),
            SizedBox(width: 8),
            Text('Nishi', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(icon: const Icon(Icons.person_add), onPressed: () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const ContactsScreen())).then((_) => _loadChats());
          }),
          IconButton(icon: const Icon(Icons.logout), onPressed: _logout),
        ],
      ),
      body: _chats.isEmpty
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('👻', style: TextStyle(fontSize: 60)),
                  SizedBox(height: 20),
                  Text('কোনো চ্যাট নেই', style: TextStyle(fontSize: 18, color: Colors.white54)),
                  SizedBox(height: 8),
                  Text('নতুন চ্যাট শুরু করতে + বাটনে ক্লিক করুন', style: TextStyle(color: Colors.white38)),
                ],
              ),
            )
          : RefreshIndicator(
              onRefresh: _loadChats,
              child: ListView.builder(
                itemCount: _chats.length,
                itemBuilder: (ctx, i) {
                  final c = _chats[i];
                  return ListTile(
                    leading: CircleAvatar(
                      backgroundColor: const Color(0xFF6C63FF),
                      child: Text(c['otherAvatar'] ?? '👤', style: const TextStyle(fontSize: 20)),
                    ),
                    title: Text(c['otherName'] ?? 'Unknown', style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text(c['lastMessage'] ?? 'নতুন চ্যাট', style: const TextStyle(color: Colors.white54), maxLines: 1, overflow: TextOverflow.ellipsis),
                    onTap: () {
                      Navigator.push(context, MaterialPageRoute(
                        builder: (_) => ChatScreen(chatId: c['id'], chatName: c['otherName'] ?? 'Unknown'),
                      )).then((_) => _loadChats());
                    },
                  );
                },
              ),
            ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: const Color(0xFF6C63FF),
        child: const Icon(Icons.add, color: Colors.white),
        onPressed: () {
          Navigator.push(context, MaterialPageRoute(builder: (_) => const ContactsScreen())).then((_) => _loadChats());
        },
      ),
    );
  }
}

// ============ CONTACTS ============
class ContactsScreen extends StatefulWidget {
  const ContactsScreen({super.key});
  @override
  State<ContactsScreen> createState() => _ContactsScreenState();
}

class _ContactsScreenState extends State<ContactsScreen> {
  List _users = [];
  Map? _me;

  @override
  void initState() {
    super.initState();
    _load();
  }

  _load() async {
    final prefs = await SharedPreferences.getInstance();
    final u = prefs.getString('user');
    if (u != null) _me = jsonDecode(u);

    try {
      final res = await http.get(Uri.parse('$SERVER_URL/api/users'));
      final data = jsonDecode(res.body);
      if (mounted) setState(() => _users = data['users'] ?? []);
    } catch (_) {}
  }

  _chat(String id, String name) async {
    try {
      final res = await http.post(
        Uri.parse('$SERVER_URL/api/chats'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'userId': _me!['id'], 'otherUserId': id}),
      );
      final data = jsonDecode(res.body);
      if (data['chatId'] != null && mounted) {
        Navigator.pushReplacement(context, MaterialPageRoute(
          builder: (_) => ChatScreen(chatId: data['chatId'], chatName: name),
        ));
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Contacts'), backgroundColor: Colors.transparent, elevation: 0),
      body: ListView.builder(
        itemCount: _users.length,
        itemBuilder: (ctx, i) {
          final u = _users[i];
          if (u['id'] == _me?['id']) return const SizedBox();
          return ListTile(
            leading: CircleAvatar(
              backgroundColor: const Color(0xFF6C63FF),
              child: Text(u['avatar'] ?? '👤', style: const TextStyle(fontSize: 20)),
            ),
            title: Text(u['name'] ?? 'Unknown', style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text(u['status'] ?? '', style: const TextStyle(color: Colors.white54)),
            onTap: () => _chat(u['id'], u['name']),
          );
        },
      ),
    );
  }
}

// ============ CHAT ============
class ChatScreen extends StatefulWidget {
  final String chatId;
  final String chatName;
  const ChatScreen({super.key, required this.chatId, required this.chatName});
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _ctrl = TextEditingController();
  List _messages = [];
  Map? _user;
  late IO.Socket _socket;
  bool _trap = false;

  @override
  void initState() {
    super.initState();
    _loadUser();
    _initSocket();
    _loadMessages();
  }

  _loadUser() async {
    final prefs = await SharedPreferences.getInstance();
    final u = prefs.getString('user');
    if (u != null) setState(() => _user = jsonDecode(u));
  }

  _initSocket() {
    _socket = IO.io(SERVER_URL, IO.OptionBuilder().setTransports(['websocket']).build());
    _socket.onConnect((_) => _socket.emit('join_chat', widget.chatId));
    _socket.on('new_message', (d) {
      if (d['chatId'] == widget.chatId) _loadMessages();
    });
  }

  _loadMessages() async {
    try {
      final res = await http.get(Uri.parse('$SERVER_URL/api/messages/${widget.chatId}'));
      final data = jsonDecode(res.body);
      if (mounted) setState(() => _messages = data['messages'] ?? []);
    } catch (_) {}
  }

  _send() async {
    if (_ctrl.text.trim().isEmpty || _user == null) return;
    final content = _ctrl.text.trim();
    _ctrl.clear();

    try {
      await http.post(
        Uri.parse('$SERVER_URL/api/messages'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'chatId': widget.chatId,
          'senderId': _user!['id'],
          'content': content,
          'type': 'text',
          'isScreenshotTrap': _trap,
          'decoyContent': _trap ? '🔒 Protected by Nishi' : null,
        }),
      );
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.chatName),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(Icons.shield, color: _trap ? Colors.amber : Colors.white54),
            onPressed: () {
              setState(() => _trap = !_trap);
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                content: Text(_trap ? '📸 Screenshot Trap চালু!' : '📸 Screenshot Trap বন্ধ'),
                duration: const Duration(seconds: 1),
              ));
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _messages.isEmpty
                ? const Center(child: Text('💬 মেসেজ শুরু করুন!', style: TextStyle(color: Colors.white54)))
                : ListView.builder(
                    reverse: true,
                    padding: const EdgeInsets.all(10),
                    itemCount: _messages.length,
                    itemBuilder: (ctx, i) {
                      final m = _messages[_messages.length - 1 - i];
                      final sent = m['senderId'] == _user?['id'];
                      return Align(
                        alignment: sent ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.symmetric(vertical: 4),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: sent ? const Color(0xFF6C63FF) : Colors.white10,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (!sent) Text(m['senderName'] ?? '', style: const TextStyle(fontSize: 11, color: Colors.white54)),
                              Text(m['content'] ?? '', style: const TextStyle(color: Colors.white)),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: const BoxDecoration(color: Colors.black54),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _ctrl,
                    decoration: InputDecoration(
                      hintText: 'মেসেজ লিখুন...',
                      filled: true,
                      fillColor: Colors.white10,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(25)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                    ),
                    onSubmitted: (_) => _send(),
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: const Color(0xFF6C63FF),
                  child: IconButton(
                    icon: const Icon(Icons.send, color: Colors.white, size: 20),
                    onPressed: _send,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
