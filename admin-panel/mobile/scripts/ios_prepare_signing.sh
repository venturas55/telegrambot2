#!/usr/bin/env bash
set -euo pipefail
: "${IOS_P12_BASE64:?Missing IOS_P12_BASE64}"
: "${IOS_P12_PASSWORD:?Missing IOS_P12_PASSWORD}"
: "${IOS_ADHOC_PROFILE_BASE64:?Missing IOS_ADHOC_PROFILE_BASE64}"
: "${APPLE_TEAM_ID:?Missing APPLE_TEAM_ID}"
: "${APPLE_BUNDLE_ID:?Missing APPLE_BUNDLE_ID}"
: "${RUNNER_TEMP:?Missing RUNNER_TEMP}"

umask 077
CERT_FILE="$RUNNER_TEMP/buscaviento-dist.p12"
PROFILE_FILE="$RUNNER_TEMP/buscaviento-adhoc.mobileprovision"
PROFILE_PLIST="$RUNNER_TEMP/buscaviento-adhoc.plist"
KEYCHAIN="$RUNNER_TEMP/buscaviento-signing.keychain-db"
printf '%s' "$IOS_P12_BASE64" | base64 -D > "$CERT_FILE"
printf '%s' "$IOS_ADHOC_PROFILE_BASE64" | base64 -D > "$PROFILE_FILE"
KEYCHAIN_PASSWORD="$(openssl rand -hex 24)"
security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
security set-keychain-settings -lut 21600 "$KEYCHAIN"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
security list-keychains -d user -s "$KEYCHAIN" login.keychain-db
security default-keychain -d user -s "$KEYCHAIN"
security import "$CERT_FILE" -k "$KEYCHAIN" -P "$IOS_P12_PASSWORD" -T /usr/bin/codesign -T /usr/bin/security
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN" >/dev/null
security find-identity -v -p codesigning "$KEYCHAIN"
security cms -D -i "$PROFILE_FILE" > "$PROFILE_PLIST"
python3 - "$PROFILE_PLIST" <<'PY'
import os, plistlib, sys
with open(sys.argv[1], 'rb') as f:
    p = plistlib.load(f)
team = os.environ['APPLE_TEAM_ID']
bundle = os.environ['APPLE_BUNDLE_ID']
ids = p.get('TeamIdentifier') or []
app_id = p.get('Entitlements', {}).get('application-identifier', '')
devices = p.get('ProvisionedDevices') or []
if team not in ids:
    sys.exit('ERROR: Profile belongs to a different Apple team')
if app_id != f'{team}.{bundle}':
    sys.exit('ERROR: Profile App ID does not match the exact bundle ID')
if not devices or p.get('ProvisionsAllDevices'):
    sys.exit('ERROR: Expected an Ad Hoc profile with registered device UDIDs')
if p.get('Entitlements', {}).get('get-task-allow'):
    sys.exit('ERROR: Development profile supplied; expected Ad Hoc distribution')
if p.get('ExpirationDate'):
    from datetime import datetime, timezone
    if p['ExpirationDate'].replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        sys.exit('ERROR: Provisioning profile expired')
uuid = p['UUID']
with open(os.environ['GITHUB_ENV'], 'a', encoding='utf-8') as f:
    f.write(f'PROFILE_UUID={uuid}\n')
    f.write(f'SIGNING_PROFILE_PATH={os.path.expanduser("~/Library/MobileDevice/Provisioning Profiles")}/{uuid}.mobileprovision\n')
print(f'Validated Ad Hoc distribution profile ({len(devices)} registered devices)')
PY
mkdir -p "$HOME/Library/MobileDevice/Provisioning Profiles"
PROFILE_UUID=$(/usr/libexec/PlistBuddy -c 'Print UUID' "$PROFILE_PLIST")
cp "$PROFILE_FILE" "$HOME/Library/MobileDevice/Provisioning Profiles/$PROFILE_UUID.mobileprovision"
rm -f "$CERT_FILE" "$PROFILE_FILE" "$PROFILE_PLIST"
