#!/bin/bash
# Bump Android + iOS version numbers in a single command.
#
# Usage:  ./scripts/bump-version.sh 132
#
# This keeps Android versionCode/versionName and iOS CFBundleVersion/
# CFBundleShortVersionString in lockstep so TestFlight and Play Console
# don't drift. iOS marketing version is always 1.0.<N>.

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <build-number>" >&2
  echo "Example: $0 132" >&2
  exit 1
fi

V="$1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Android — packages/client/android/app/build.gradle
GRADLE="$ROOT/packages/client/android/app/build.gradle"
sed -i '' "s/versionCode [0-9]*/versionCode $V/" "$GRADLE"
sed -i '' "s/versionName \"[^\"]*\"/versionName \"1.0.$V\"/" "$GRADLE"

# iOS — packages/client/ios/App/App.xcodeproj/project.pbxproj (Release + Debug)
PBX="$ROOT/packages/client/ios/App/App.xcodeproj/project.pbxproj"
sed -i '' "s/CURRENT_PROJECT_VERSION = [0-9][0-9.]*;/CURRENT_PROJECT_VERSION = $V;/g" "$PBX"
sed -i '' "s/MARKETING_VERSION = [0-9][0-9.]*;/MARKETING_VERSION = 1.0.$V;/g" "$PBX"

echo "Bumped to build $V (1.0.$V):"
echo "  Android: $(grep 'versionCode\|versionName' "$GRADLE" | head -2)"
echo "  iOS:"
echo "    $(grep 'CURRENT_PROJECT_VERSION\|MARKETING_VERSION' "$PBX" | head -2 | sed 's/^/      /')"
