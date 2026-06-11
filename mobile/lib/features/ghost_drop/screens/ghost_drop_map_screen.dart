import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import '../../../core/theme/app_theme.dart';

class GhostDropMapScreen extends StatefulWidget {
  const GhostDropMapScreen({super.key});

  @override
  State<GhostDropMapScreen> createState() => _GhostDropMapScreenState();
}

class _GhostDropMapScreenState extends State<GhostDropMapScreen> {
  GoogleMapController? _mapController;
  Position? _currentPosition;
  final Set<Marker> _markers = {};
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
  }

  Future<void> _getCurrentLocation() async {
    try {
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      setState(() {
        _currentPosition = position;
        _isLoading = false;

        // Add current location marker
        _markers.add(
          Marker(
            markerId: const MarkerId('current_location'),
            position: LatLng(position.latitude, position.longitude),
            infoWindow: const InfoWindow(
              title: 'You are here',
              snippet: 'Your current location',
            ),
            icon: BitmapDescriptor.defaultMarkerWithHue(
              BitmapDescriptor.hueGreen,
            ),
          ),
        );
      });
    } catch (e) {
      print('Error getting location: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('🗺️ Ghost Drop Map'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_location),
            onPressed: _createGhostDrop,
            tooltip: 'Create Ghost Drop',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(
                color: AppTheme.NishiPurple,
              ),
            )
          : _currentPosition == null
              ? const Center(
                  child: Text(
                    'Unable to get location',
                    style: TextStyle(color: Colors.white),
                  ),
                )
              : Stack(
                  children: [
                    // Map
                    GoogleMap(
                      initialCameraPosition: CameraPosition(
                        target: LatLng(
                          _currentPosition!.latitude,
                          _currentPosition!.longitude,
                        ),
                        zoom: 15,
                      ),
                      onMapCreated: (controller) {
                        _mapController = controller;
                      },
                      markers: _markers,
                      myLocationEnabled: true,
                      myLocationButtonEnabled: false,
                      zoomControlsEnabled: false,
                      mapToolbarEnabled: false,
                    ),

                    // Bottom sheet for ghost drops
                    Positioned(
                      bottom: 0,
                      left: 0,
                      right: 0,
                      child: _buildGhostDropsSheet(),
                    ),

                    // Center on me button
                    Positioned(
                      bottom: 200,
                      right: 16,
                      child: FloatingActionButton(
                        mini: true,
                        backgroundColor: AppTheme.NishiPurple,
                        onPressed: _centerOnMe,
                        child: const Icon(
                          Icons.my_location,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }

  Widget _buildGhostDropsSheet() {
    return Container(
      height: 200,
      decoration: BoxDecoration(
        color: AppTheme.deepShadow,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(20),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Column(
        children: [
          // Handle
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppTheme.vanishGray.withOpacity(0.3),
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Title
          const Padding(
            padding: EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(Icons.map, color: AppTheme.dropBlue),
                SizedBox(width: 8),
                Text(
                  'Ghost Drops Nearby',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),

          // Ghost drops list
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                _buildGhostDropItem(
                  'Secret message at Café',
                  '0.5 km away',
                  Icons.coffee,
                ),
                _buildGhostDropItem(
                  'Hidden note at park',
                  '1.2 km away',
                  Icons.park,
                ),
                _buildGhostDropItem(
                  'Surprise at library',
                  '2.0 km away',
                  Icons.library_books,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGhostDropItem(String title, String distance, IconData icon) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.shadowBlack,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.dropBlue.withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              icon,
              color: AppTheme.dropBlue,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                Text(
                  distance,
                  style: TextStyle(
                    color: AppTheme.vanishGray,
                    fontSize: 12,
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
    );
  }

  void _centerOnMe() {
    if (_currentPosition != null && _mapController != null) {
      _mapController!.animateCamera(
        CameraUpdate.newLatLng(
          LatLng(
            _currentPosition!.latitude,
            _currentPosition!.longitude,
          ),
        ),
      );
    }
  }

  void _createGhostDrop() {
    // TODO: Show create ghost drop dialog
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _buildCreateGhostDropSheet(),
    );
  }

  Widget _buildCreateGhostDropSheet() {
    return Container(
      height: MediaQuery.of(context).size.height * 0.6,
      decoration: const BoxDecoration(
        color: AppTheme.deepShadow,
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(20),
        ),
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppTheme.vanishGray.withOpacity(0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Title
          const Text(
            '🗺️ Create Ghost Drop',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),

          const SizedBox(height: 24),

          // Message input
          TextField(
            maxLines: 3,
            decoration: InputDecoration(
              hintText: 'Write your secret message...',
              hintStyle: TextStyle(color: AppTheme.vanishGray),
            ),
          ),

          const SizedBox(height: 16),

          // Radius slider
          Row(
            children: [
              const Text('Radius: '),
              Expanded(
                child: Slider(
                  value: 50,
                  min: 10,
                  max: 500,
                  divisions: 49,
                  label: '50m',
                  onChanged: (value) {
                    // TODO: Update radius
                  },
                ),
              ),
              const Text('50m'),
            ],
          ),

          const Spacer(),

          // Create button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                // TODO: Create ghost drop
                Navigator.pop(context);
              },
              icon: const Icon(Icons.add_location),
              label: const Text('Create Ghost Drop'),
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }
}
