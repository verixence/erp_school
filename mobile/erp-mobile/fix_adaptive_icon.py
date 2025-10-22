#!/usr/bin/env python3
"""
Fix adaptive icon by adding proper padding for Android's safe zone.
Android adaptive icons use only the center 66% of the image.
"""

from PIL import Image
import os

# Paths
ADAPTIVE_ICON_PATH = 'assets/adaptive-icon.png'
BACKUP_PATH = 'assets/adaptive-icon-original.png'

# Open the original icon
print(f"Opening {ADAPTIVE_ICON_PATH}...")
img = Image.open(ADAPTIVE_ICON_PATH).convert('RGBA')
original_width, original_height = img.size

print(f"Original size: {original_width}x{original_height}")

# Backup original
print(f"Backing up original to {BACKUP_PATH}...")
img.save(BACKUP_PATH)

# Calculate new size (66% of original to fit in safe zone)
# Then the safe zone content will be in the center 66% of the final 1024x1024
safe_zone_percentage = 0.66
new_content_width = int(original_width * safe_zone_percentage)
new_content_height = int(original_height * safe_zone_percentage)

print(f"Resizing content to {new_content_width}x{new_content_height} (66% of original)")

# Resize the content
resized_img = img.resize((new_content_width, new_content_height), Image.Resampling.LANCZOS)

# Create a new transparent canvas of the original size
new_img = Image.new('RGBA', (original_width, original_height), (255, 255, 255, 0))

# Calculate position to center the resized image
x_offset = (original_width - new_content_width) // 2
y_offset = (original_height - new_content_height) // 2

print(f"Centering content with offset: ({x_offset}, {y_offset})")

# Paste the resized image onto the center of the new canvas
new_img.paste(resized_img, (x_offset, y_offset), resized_img)

# Save the fixed icon
print(f"Saving fixed icon to {ADAPTIVE_ICON_PATH}...")
new_img.save(ADAPTIVE_ICON_PATH)

print("✅ Done! Your adaptive icon now has proper padding for Android.")
print(f"Original icon backed up to: {BACKUP_PATH}")
