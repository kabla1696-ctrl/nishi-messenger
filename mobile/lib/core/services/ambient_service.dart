import 'dart:async';
import 'dart:io';
import 'package:sensors_plus/sensors_plus.dart';
import 'package:geolocator/geolocator.dart';
import 'package:light/light.dart';
import 'package:flutter/services.dart';

enum Activity {
  stationary,
  walking,
  running,
  driving,
  cycling,
  sleeping,
  eating,
  working,
  reading,
  listeningMusic
}

enum Environment {
  day,
  night,
  rain,
  cold,
  hot,
  indoor,
  outdoor
}

class AmbientService {
  static final AmbientService _instance = AmbientService._internal();
  factory AmbientService() => _instance;
  AmbientService._internal();

  // Stream controllers
  final _activityController = StreamController<Activity>.broadcast();
  Stream<Activity> get activityStream => _activityController.stream;

  final _environmentController = StreamController<Environment>.broadcast();
  Stream<Environment> get environmentStream => _environmentController.stream;

  final _ambientStateController = StreamController<AmbientState>.broadcast();
  Stream<AmbientState> get ambientStateStream => _ambientStateController.stream;

  // State
  Activity _currentActivity = Activity.stationary;
  Environment _currentEnvironment = Environment.day;
  AmbientState? _lastState;

  // Getters
  Activity get currentActivity => _currentActivity;
  Environment get currentEnvironment => _currentEnvironment;

  // Initialize
  Future<void> initialize() async {
    await _checkPermissions();
    _startListening();
  }

  // Check permissions
  Future<void> _checkPermissions() async {
    // Location permission
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
  }

  // Start listening to sensors
  void _startListening() {
    // Accelerometer for movement detection
    accelerometerEvents.listen((event) {
      _analyzeMovement(event);
    });

    // Gyroscope for orientation
    gyroscopeEvents.listen((event) {
      _analyzeOrientation(event);
    });

    // Location for environment detection
    Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      ),
    ).listen((position) {
      _analyzeLocation(position);
    });

    // Light sensor for day/night
    try {
      Light().lightSensorStream.listen((luxValue) {
        _analyzeLight(luxValue);
      });
    } catch (e) {
      print('Light sensor not available: $e');
    }
  }

  // Analyze movement from accelerometer
  void _analyzeMovement(AccelerometerEvent event) {
    double magnitude = _calculateMagnitude(event.x, event.y, event.z);
    double gravity = 9.81;
    double acceleration = magnitude - gravity;

    // Determine activity based on acceleration patterns
    Activity newActivity;

    if (acceleration < 0.5) {
      newActivity = Activity.stationary;
    } else if (acceleration < 2.0) {
      newActivity = Activity.walking;
    } else if (acceleration < 5.0) {
      newActivity = Activity.running;
    } else {
      // Check if driving (high acceleration but stable)
      newActivity = Activity.driving;
    }

    if (newActivity != _currentActivity) {
      _currentActivity = newActivity;
      _activityController.add(newActivity);
      _updateAmbientState();
    }
  }

  // Analyze orientation from gyroscope
  void _analyzeOrientation(GyroscopeEvent event) {
    // Detect if phone is flat (reading position)
    if (event.x.abs() < 0.1 && event.y.abs() < 0.1 && event.z.abs() > 9) {
      if (_currentActivity == Activity.stationary) {
        _currentActivity = Activity.reading;
        _activityController.add(Activity.reading);
        _updateAmbientState();
      }
    }
  }

  // Analyze location
  void _analyzeLocation(Position position) {
    // Determine environment based on location
    // This is simplified - in production, use map data
    Environment newEnvironment;

    // Check time of day
    int hour = DateTime.now().hour;
    if (hour >= 6 && hour < 18) {
      newEnvironment = Environment.day;
    } else {
      newEnvironment = Environment.night;
    }

    // Check if indoor (using altitude and accuracy)
    if (position.altitude == 0 && position.accuracy < 10) {
      newEnvironment = Environment.indoor;
    } else {
      newEnvironment = Environment.outdoor;
    }

    if (newEnvironment != _currentEnvironment) {
      _currentEnvironment = newEnvironment;
      _environmentController.add(newEnvironment);
      _updateAmbientState();
    }
  }

  // Analyze light level
  void _analyzeLight(int luxValue) {
    Environment newEnvironment;

    if (luxValue < 10) {
      newEnvironment = Environment.night;
    } else if (luxValue < 1000) {
      newEnvironment = Environment.indoor;
    } else {
      newEnvironment = Environment.outdoor;
    }

    if (newEnvironment != _currentEnvironment) {
      _currentEnvironment = newEnvironment;
      _environmentController.add(newEnvironment);
      _updateAmbientState();
    }
  }

  // Calculate magnitude
  double _calculateMagnitude(double x, double y, double z) {
    return x * x + y * y + z * z;
  }

  // Update ambient state
  void _updateAmbientState() {
    final state = AmbientState(
      activity: _currentActivity,
      environment: _currentEnvironment,
      timestamp: DateTime.now(),
    );

    if (state != _lastState) {
      _lastState = state;
      _ambientStateController.add(state);
    }
  }

  // Get current state
  AmbientState getCurrentState() {
    return AmbientState(
      activity: _currentActivity,
      environment: _currentEnvironment,
      timestamp: DateTime.now(),
    );
  }

  // Dispose
  void dispose() {
    _activityController.close();
    _environmentController.close();
    _ambientStateController.close();
  }
}

class AmbientState {
  final Activity activity;
  final Environment environment;
  final DateTime timestamp;

  AmbientState({
    required this.activity,
    required this.environment,
    required this.timestamp,
  });

  // Get emoji representation
  String get activityEmoji {
    switch (activity) {
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

  String get environmentEmoji {
    switch (environment) {
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

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is AmbientState &&
        other.activity == activity &&
        other.environment == environment;
  }

  @override
  int get hashCode => activity.hashCode ^ environment.hashCode;
}
