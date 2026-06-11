import 'package:flutter/material.dart';
import '../../../core/services/ambient_service.dart';
import '../../../core/theme/app_theme.dart';

class AmbientIndicator extends StatefulWidget {
  final String userId;

  const AmbientIndicator({super.key, required this.userId});

  @override
  State<AmbientIndicator> createState() => _AmbientIndicatorState();
}

class _AmbientIndicatorState extends State<AmbientIndicator> {
  final AmbientService _ambientService = AmbientService();
  Activity _activity = Activity.stationary;
  Environment _environment = Environment.day;

  @override
  void initState() {
    super.initState();
    _listenToAmbient();
  }

  void _listenToAmbient() {
    _ambientService.activityStream.listen((activity) {
      if (mounted) {
        setState(() {
          _activity = activity;
        });
      }
    });

    _ambientService.environmentStream.listen((environment) {
      if (mounted) {
        setState(() {
          _environment = environment;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Activity emoji
        Text(
          _getActivityEmoji(),
          style: const TextStyle(fontSize: 12),
        ),
        const SizedBox(width: 4),
        // Environment emoji
        Text(
          _getEnvironmentEmoji(),
          style: const TextStyle(fontSize: 12),
        ),
        const SizedBox(width: 4),
        // Activity text
        Text(
          _getActivityText(),
          style: TextStyle(
            color: AppTheme.vanishGray,
            fontSize: 11,
          ),
        ),
      ],
    );
  }

  String _getActivityEmoji() {
    switch (_activity) {
      case Activity.walking:
        return '🚶';
      case Activity.running:
        return '🏃';
      case Activity.driving:
        return '🚗';
      case Activity.cycling:
        return '🚴';
      case Activity.sleeping:
        return '💤';
      case Activity.eating:
        return '🍽️';
      case Activity.working:
        return '💼';
      case Activity.reading:
        return '📖';
      case Activity.listeningMusic:
        return '🎵';
      case Activity.stationary:
      default:
        return '🏠';
    }
  }

  String _getEnvironmentEmoji() {
    switch (_environment) {
      case Environment.day:
        return '☀️';
      case Environment.night:
        return '🌙';
      case Environment.rain:
        return '🌧️';
      case Environment.cold:
        return '❄️';
      case Environment.hot:
        return '🔥';
      case Environment.indoor:
        return '🏢';
      case Environment.outdoor:
        return '🌳';
    }
  }

  String _getActivityText() {
    switch (_activity) {
      case Activity.walking:
        return 'Walking';
      case Activity.running:
        return 'Running';
      case Activity.driving:
        return 'Driving';
      case Activity.cycling:
        return 'Cycling';
      case Activity.sleeping:
        return 'Sleeping';
      case Activity.eating:
        return 'Eating';
      case Activity.working:
        return 'Working';
      case Activity.reading:
        return 'Reading';
      case Activity.listeningMusic:
        return 'Listening to music';
      case Activity.stationary:
      default:
        return 'Online';
    }
  }
}
