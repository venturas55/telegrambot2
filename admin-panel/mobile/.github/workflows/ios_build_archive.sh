#!/usr/bin/env bash
set -euo pipefail
: "${APPLE_TEAM_ID:?Missing APPLE_TEAM_ID}"
: "${APPLE_BUNDLE_ID:?Missing APPLE_BUNDLE_ID}"
: "${PROFILE_UUID:?Missing PROFILE_UUID}"
: "${RUNNER_TEMP:?Missing RUNNER_TEMP}"

WORKSPACE=$(find ios -maxdepth 1 -name '*.xcworkspace' -type d -print -quit)
[ -n "$WORKSPACE" ] || { echo 'No CocoaPods workspace found'; exit 1; }
SCHEME_FILE=$(find ios -path '*/xcshareddata/xcschemes/*.xcscheme' -type f ! -path '*/Pods/*' -print -quit)
[ -n "$SCHEME_FILE" ] || { echo 'No shared Xcode scheme found'; exit 1; }
SCHEME=$(basename "$SCHEME_FILE" .xcscheme)
echo "Building Xcode scheme: $SCHEME"

mkdir -p output
ARCHIVE="$RUNNER_TEMP/Buscaviento.xcarchive"
DERIVED_DATA="$RUNNER_TEMP/BuscavientoDerivedData"
RESULT_BUNDLE="$RUNNER_TEMP/BuscavientoArchive.xcresult"
rm -rf "$ARCHIVE" "$DERIVED_DATA" "$RESULT_BUNDLE"

# Set signing at the app target only; leave CocoaPods-generated targets unchanged.
ruby - ios <<'RUBY'
require 'xcodeproj'
project_path = Dir.glob(File.join(ARGV.fetch(0), '*.xcodeproj')).fetch(0)
project = Xcodeproj::Project.open(project_path)
apps = project.targets.select { |target| target.product_type == 'com.apple.product-type.application' }
abort 'No app target found' if apps.empty?
apps.each do |target|
  target.build_configurations.each do |config|
    next unless config.name == 'Release'
    config.build_settings['DEVELOPMENT_TEAM'] = ENV.fetch('APPLE_TEAM_ID')
    config.build_settings['CODE_SIGN_STYLE'] = 'Manual'
    config.build_settings['CODE_SIGN_IDENTITY'] = 'Apple Distribution'
    config.build_settings['PROVISIONING_PROFILE_SPECIFIER'] = ENV.fetch('PROFILE_UUID')
  end
end
project.save
RUBY

BUILD_NUMBER="${GITHUB_RUN_NUMBER:?Missing GITHUB_RUN_NUMBER}"
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" \
  -derivedDataPath "$DERIVED_DATA" \
  -resultBundlePath "$RESULT_BUNDLE" \
  -sdk iphoneos \
  ONLY_ACTIVE_ARCH=NO \
  SWIFT_ENABLE_EXPLICIT_MODULES=NO \
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  clean archive 2>&1 | tee "$RUNNER_TEMP/buscaviento-archive.log"

APP_PATH=$(find "$ARCHIVE/Products/Applications" -maxdepth 1 -type d -name '*.app' -print -quit)
[ -n "$APP_PATH" ] || { echo 'Archive contains no .app'; exit 1; }
ARCHIVED_ID=$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$APP_PATH/Info.plist")
[ "$ARCHIVED_ID" = "$APPLE_BUNDLE_ID" ] || { echo "Archive bundle ID mismatch: $ARCHIVED_ID"; exit 1; }

python3 - <<'PY'
import os, plistlib
options = {
    'method': 'release-testing',  # Ad Hoc export in recent Xcode releases
    'destination': 'export',
    'signingStyle': 'manual',
    'teamID': os.environ['APPLE_TEAM_ID'],
    'signingCertificate': 'Apple Distribution',
    'provisioningProfiles': {os.environ['APPLE_BUNDLE_ID']: os.environ['PROFILE_UUID']},
    'manageAppVersionAndBuildNumber': False,
    'stripSwiftSymbols': True,
}
with open(os.environ['RUNNER_TEMP'] + '/BuscavientoExportOptions.plist', 'wb') as f:
    plistlib.dump(options, f)
PY
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportPath "$PWD/output" \
  -exportOptionsPlist "$RUNNER_TEMP/BuscavientoExportOptions.plist"
IPA_FILE=$(find output -maxdepth 1 -name '*.ipa' -type f -print -quit)
[ -n "$IPA_FILE" ] || { echo 'No IPA generated'; exit 1; }
if [ "$IPA_FILE" != 'output/Buscaviento.ipa' ]; then mv "$IPA_FILE" output/Buscaviento.ipa; fi
ls -lh output/Buscaviento.ipa
