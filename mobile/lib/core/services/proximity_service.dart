import 'dart:async';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:permission_handler/permission_handler.dart';

class ProximityService {
  static final ProximityService _instance = ProximityService._internal();
  factory ProximityService() => _instance;
  ProximityService._internal();

  // Stream controllers
  final _proximityController = StreamController<bool>.broadcast();
  Stream<bool> get proximityStream => _proximityController.stream;

  final _deviceController = StreamController<List<BluetoothDevice>>.broadcast();
  Stream<List<BluetoothDevice>> get deviceStream => _deviceController.stream;

  // State
  bool _isScanning = false;
  List<BluetoothDevice> _nearbyDevices = [];
  double _proximityRadiusFeet = 3.0;

  // Getters
  bool get isScanning => _isScanning;
  List<BluetoothDevice> get nearbyDevices => _nearbyDevices;
  double get proximityRadiusFeet => _proximityRadiusFeet;

  // Initialize Bluetooth
  Future<void> initialize() async {
    // Check if Bluetooth is available
    if (await FlutterBluePlus.isAvailable == false) {
      print('Bluetooth not available');
      return;
    }

    // Check permissions
    await _checkPermissions();

    // Listen to scan results
    FlutterBluePlus.scanResults.listen((results) {
      _updateNearbyDevices(results);
    });
  }

  // Check and request permissions
  Future<void> _checkPermissions() async {
    // Location permission (needed for Bluetooth scanning on Android)
    if (await Permission.location.isDenied) {
      await Permission.location.request();
    }

    // Bluetooth permission
    if (await Permission.bluetooth.isDenied) {
      await Permission.bluetooth.request();
    }

    // Bluetooth scan permission
    if (await Permission.bluetoothScan.isDenied) {
      await Permission.bluetoothScan.request();
    }

    // Bluetooth connect permission
    if (await Permission.bluetoothConnect.isDenied) {
      await Permission.bluetoothConnect.request();
    }
  }

  // Start scanning for nearby devices
  Future<void> startScanning() async {
    if (_isScanning) return;

    try {
      await FlutterBluePlus.startScan(
        timeout: const Duration(seconds: 10),
        androidUsesFineLocation: true,
      );

      _isScanning = true;
      print('🔍 Scanning for nearby devices...');
    } catch (e) {
      print('Error starting scan: $e');
    }
  }

  // Stop scanning
  Future<void> stopScanning() async {
    await FlutterBluePlus.stopScan();
    _isScanning = false;
    print('⏹️ Stopped scanning');
  }

  // Update nearby devices from scan results
  void _updateNearbyDevices(List<ScanResult> results) {
    _nearbyDevices = results
        .where((result) => result.device.platformName.isNotEmpty)
        .map((result) => result.device)
        .toList();

    _deviceController.add(_nearbyDevices);

    // Check if someone is in proximity
    _checkProximity();
  }

  // Check if any device is within proximity radius
  void _checkProximity() {
    // In a real app, you would calculate distance using RSSI
    // For now, we'll use a simple threshold
    final bool someoneNearby = _nearbyDevices.isNotEmpty;

    _proximityController.add(someoneNearby);

    if (someoneNearby) {
      print('⚠️ Someone is nearby!');
    }
  }

  // Calculate distance from RSSI (simplified)
  double _calculateDistance(int rssi) {
    // This is a simplified calculation
    // In production, use more accurate algorithms
    if (rssi == 0) return -1.0;

    double ratio = rssi * 1.0 / -70.0;
    if (ratio < 1.0) {
      return Math.pow(ratio, 10).toDouble();
    } else {
      double accuracy = (0.89976 * Math.pow(ratio, 7.7095) + 0.111);
      return accuracy;
    }
  }

  // Set proximity radius
  void setProximityRadius(double feet) {
    _proximityRadiusFeet = feet;
  }

  // Check if specific device is in proximity
  bool isDeviceInProximity(BluetoothDevice device, {required double radiusFeet}) {
    // Get RSSI from last scan
    // Calculate distance
    // Compare with radius
    return _nearbyDevices.contains(device);
  }

  // Dispose
  void dispose() {
    _proximityController.close();
    _deviceController.close();
    stopScanning();
  }
}

// Math utilities
class Math {
  static double pow(double x, double exponent) {
    return x > 0 ? _fastPow(x, exponent) : 0.0;
  }

  static double _fastPow(double base, double exp) {
    if (exp == 0) return 1.0;
    if (exp == 1) return base;

    double result = 1.0;
    double b = base;
    double e = exp;

    while (e > 0) {
      if (e % 2 == 1) {
        result *= b;
      }
      b *= b;
      e = e ~/ 2;
    }

    return result;
  }
}
