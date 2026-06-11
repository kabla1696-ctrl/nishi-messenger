import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class UniverseToggle extends StatelessWidget {
  final bool isReal;
  final Function(bool) onToggle;

  const UniverseToggle({
    super.key,
    required this.isReal,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onToggle(!isReal),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isReal
              ? AppTheme.NishiPurple.withOpacity(0.2)
              : AppTheme.universeOrange.withOpacity(0.2),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isReal
                ? AppTheme.NishiPurple.withOpacity(0.5)
                : AppTheme.universeOrange.withOpacity(0.5),
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isReal ? Icons.real_estate_agent : Icons.theater_comedy,
              color: isReal ? AppTheme.NishiPurple : AppTheme.universeOrange,
              size: 16,
            ),
            const SizedBox(width: 6),
            Text(
              isReal ? 'Real' : 'Decoy',
              style: TextStyle(
                color: isReal ? AppTheme.NishiPurple : AppTheme.universeOrange,
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
