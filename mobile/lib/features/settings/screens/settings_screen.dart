import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  // Settings state
  bool _screenshotTrapEnabled = true;
  bool _vanishModeEnabled = true;
  bool _ambientPresenceEnabled = true;
  bool _parallelUniverseEnabled = true;
  double _proximityRadius = 3.0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Screenshot Trap Section
          _buildSectionHeader('📸 Screenshot Trap'),
          _buildSwitchTile(
            title: 'Enable Screenshot Trap',
            subtitle: 'Detect when someone takes a screenshot',
            value: _screenshotTrapEnabled,
            onChanged: (value) {
              setState(() {
                _screenshotTrapEnabled = value;
              });
            },
          ),
          _buildNavigationTile(
            title: 'Manage Decoy Messages',
            subtitle: 'Set fake messages for each chat',
            onTap: () {},
          ),

          const SizedBox(height: 24),

          // Vanish Mode Section
          _buildSectionHeader('🫥 Vanish Mode Proximity'),
          _buildSwitchTile(
            title: 'Enable Vanish Mode',
            subtitle: 'Hide messages when someone is nearby',
            value: _vanishModeEnabled,
            onChanged: (value) {
              setState(() {
                _vanishModeEnabled = value;
              });
            },
          ),
          _buildSliderTile(
            title: 'Proximity Radius',
            subtitle: '${_proximityRadius.round()} feet',
            value: _proximityRadius,
            min: 1,
            max: 10,
            onChanged: (value) {
              setState(() {
                _proximityRadius = value;
              });
            },
          ),

          const SizedBox(height: 24),

          // Parallel Universe Section
          _buildSectionHeader('🎭 Parallel Universe'),
          _buildSwitchTile(
            title: 'Enable Parallel Universe',
            subtitle: 'Create decoy versions of your chats',
            value: _parallelUniverseEnabled,
            onChanged: (value) {
              setState(() {
                _parallelUniverseEnabled = value;
              });
            },
          ),
          _buildNavigationTile(
            title: 'Manage Chat Universes',
            subtitle: 'Set up real and decoy versions',
            onTap: () {},
          ),

          const SizedBox(height: 24),

          // Ambient Presence Section
          _buildSectionHeader('🌫️ Ambient Presence'),
          _buildSwitchTile(
            title: 'Enable Ambient Presence',
            subtitle: 'Let friends see what you\'re doing',
            value: _ambientPresenceEnabled,
            onChanged: (value) {
              setState(() {
                _ambientPresenceEnabled = value;
              });
            },
          ),
          _buildNavigationTile(
            title: 'Customize What Friends See',
            subtitle: 'Control activity and environment sharing',
            onTap: () {},
          ),

          const SizedBox(height: 24),

          // Ghost Drop Section
          _buildSectionHeader('🗺️ Ghost Drop'),
          _buildNavigationTile(
            title: 'Manage Ghost Drops',
            subtitle: 'View and delete your drops',
            onTap: () {},
          ),
          _buildNavigationTile(
            title: 'Default Drop Settings',
            subtitle: 'Set default radius and expiry',
            onTap: () {},
          ),

          const SizedBox(height: 24),

          // Privacy Section
          _buildSectionHeader('🔐 Privacy'),
          _buildNavigationTile(
            title: 'Blocked Users',
            subtitle: 'Manage blocked contacts',
            onTap: () {},
          ),
          _buildNavigationTile(
            title: 'Data & Storage',
            subtitle: 'Manage your data',
            onTap: () {},
          ),

          const SizedBox(height: 24),

          // About Section
          _buildSectionHeader('ℹ️ About'),
          _buildNavigationTile(
            title: 'Version',
            subtitle: '1.0.0',
            onTap: () {},
          ),
          _buildNavigationTile(
            title: 'Help & Support',
            subtitle: 'FAQ, contact us',
            onTap: () {},
          ),
          _buildNavigationTile(
            title: 'Terms of Service',
            subtitle: 'Read our terms',
            onTap: () {},
          ),
          _buildNavigationTile(
            title: 'Privacy Policy',
            subtitle: 'Read our policy',
            onTap: () {},
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: AppTheme.NishiPurple,
        ),
      ),
    );
  }

  Widget _buildSwitchTile({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppTheme.deepShadow,
        borderRadius: BorderRadius.circular(12),
      ),
      child: SwitchListTile(
        title: Text(title),
        subtitle: Text(
          subtitle,
          style: TextStyle(color: AppTheme.vanishGray, fontSize: 12),
        ),
        value: value,
        onChanged: onChanged,
        activeColor: AppTheme.NishiPurple,
      ),
    );
  }

  Widget _buildNavigationTile({
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppTheme.deepShadow,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        title: Text(title),
        subtitle: Text(
          subtitle,
          style: TextStyle(color: AppTheme.vanishGray, fontSize: 12),
        ),
        trailing: Icon(
          Icons.chevron_right,
          color: AppTheme.vanishGray,
        ),
        onTap: onTap,
      ),
    );
  }

  Widget _buildSliderTile({
    required String title,
    required String subtitle,
    required double value,
    required double min,
    required double max,
    required ValueChanged<double> onChanged,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.deepShadow,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: TextStyle(color: AppTheme.vanishGray, fontSize: 12),
          ),
          Slider(
            value: value,
            min: min,
            max: max,
            divisions: (max - min).round(),
            activeColor: AppTheme.NishiPurple,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}
