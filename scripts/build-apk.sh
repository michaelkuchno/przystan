#!/usr/bin/env bash
# Builds the signed release APK into release/przystan-<version>.apk
# Requires: Android SDK (ANDROID_HOME), JDK 21, android/keystore.properties or PRZYSTAN_* env vars.
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./package.json').version")
: "${ANDROID_HOME:=$HOME/android-sdk}"
export ANDROID_HOME
if [ -z "${JAVA_HOME:-}" ] && [ -d /usr/lib/jvm/temurin-21-jdk-amd64 ]; then export JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64; fi
npm run build
npx cap sync android
[ -f android/local.properties ] || echo "sdk.dir=$ANDROID_HOME" > android/local.properties
(cd android && ./gradlew --no-daemon -q assembleRelease)
mkdir -p release
cp android/app/build/outputs/apk/release/app-release.apk "release/przystan-$VERSION.apk"
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --print-certs "release/przystan-$VERSION.apk" | grep -E "SHA-1|SHA-256" || true
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify "release/przystan-$VERSION.apk"
echo "APK: release/przystan-$VERSION.apk"
