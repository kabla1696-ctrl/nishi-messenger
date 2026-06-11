import 'dart:async';
import 'package:flutter/services.dart';

class ScreenshotTrapService {
  static final ScreenshotTrapService _instance = ScreenshotTrapService._internal();
  factory ScreenshotTrapService() => _instance;
  ScreenshotTrapService._internal();

  // Stream controller
  final _screenshotController = StreamController<ScreenshotEvent>.broadcast();
  Stream<ScreenshotEvent> get screenshotStream => _screenshotController.stream;

  // State
  final Map<String, String> _decoyMessages = {};
  bool _isEnabled = true;

  // Getters
  bool get isEnabled => _isEnabled;
  Map<String, String> get decoyMessages => Map.unmodifiable(_decoyMessages);

  // Initialize
  Future<void> initialize() async {
    // Listen for screenshot events
    // This is platform-specific and may need native code

    // For now, we'll use a channel to detect screenshots
    const platform = MethodChannel('com.Nishi/screenshot');

    platform.setMethodCallHandler((MethodCall call) async {
      if (call.method == 'onScreenshot') {
        final String messageId = call.arguments['messageId'];
        final String chatId = call.arguments['chatId'];
        _handleScreenshot(messageId, chatId);
      }
    });

    print('📸 Screenshot Trap Service initialized');
  }

  // Handle screenshot detection
  void _handleScreenshot(String messageId, String chatId) {
    if (!_isEnabled) return;

    final event = ScreenshotEvent(
      messageId: messageId,
      chatId: chatId,
      timestamp: DateTime.now(),
    );

    _screenshotController.add(event);

    print('⚠️ Screenshot detected in chat: $chatId');
  }

  // Set decoy message for a chat
  void setDecoyMessage(String chatId, String decoyMessage) {
    _decoyMessages[chatId] = decoyMessage;
    print('🎭 Decoy message set for chat: $chatId');
  }

  // Get decoy message for a chat
  String? getDecoyMessage(String chatId) {
    return _decoyMessages[chatId];
  }

  // Remove decoy message
  void removeDecoyMessage(String chatId) {
    _decoyMessages.remove(chatId);
  }

  // Enable/disable service
  void setEnabled(bool enabled) {
    _isEnabled = enabled;
    print('📸 Screenshot Trap ${enabled ? "enabled" : "disabled"}');
  }

  // Check if message should show decoy
  bool shouldShowDecoy(String chatId, String messageId) {
    // Check if this message was screenshot trapped
    // In a real app, you'd check the message metadata
    return _decoyMessages.containsKey(chatId);
  }

  // Dispose
  void dispose() {
    _screenshotController.close();
  }
}

class ScreenshotEvent {
  final String messageId;
  final String chatId;
  final DateTime timestamp;

  ScreenshotEvent({
    required this.messageId,
    required this.chatId,
    required this.timestamp,
  });
}

// Native method channel handler (for platform-specific screenshot detection)
class ScreenshotTrapChannel {
  static const platform = MethodChannel('com.Nishi/screenshot');

  // Enable screenshot detection
  static Future<void> enable() async {
    try {
      await platform.invokeMethod('enableScreenshotDetection');
    } catch (e) {
      print('Error enabling screenshot detection: $e');
    }
  }

  // Disable screenshot detection
  static Future<void> disable() async {
    try {
      await platform.invokeMethod('disableScreenshotDetection');
    } catch (e) {
      print('Error disabling screenshot detection: $e');
    }
  }

  // Report screenshot
  static Future<void> reportScreenshot({
    required String messageId,
    required String chatId,
  }) async {
    try {
      await platform.invokeMethod('reportScreenshot', {
        'messageId': messageId,
        'chatId': chatId,
      });
    } catch (e) {
      print('Error reporting screenshot: $e');
    }
  }
}
