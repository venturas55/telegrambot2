# Buscaviento: build iOS Ad Hoc with GitHub Actions

Copy `.github/workflows/ios-buscaviento.yml` and the three files in `scripts/` into the root of the **Buscaviento** repository. Do not copy them into the RITMO repository. Existing workflows remain unchanged.

## GitHub repository Settings → Secrets and variables → Actions

Variables:
- `APPLE_BUNDLE_ID`: exact `expo.ios.bundleIdentifier` (e.g. `com.company.buscaviento` — replace this example)
- `APPLE_TEAM_ID`: Apple Developer team ID

Secrets:
- `IOS_P12_BASE64`: Base64 of the Apple Distribution `.p12` **including its private key**
- `IOS_P12_PASSWORD`: password of that `.p12`
- `IOS_ADHOC_PROFILE_BASE64`: Base64 of the **Ad Hoc** `.mobileprovision` for Buscaviento that contains the iPhone UDID and uses the above Apple Distribution certificate

To create Base64 values using Windows PowerShell:
```
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\\path\\to\\cert.p12')) | Set-Clipboard
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\\path\\to\\profile.mobileprovision')) | Set-Clipboard
```
Copy the values individually into their corresponding GitHub Secrets. Never commit certificates, private keys, profiles, or the Base64 strings to the repository.

## Provisioning

1. Find your iPhone's UDID via Finder/iTunes/Apple Devices or the method supported by Apple Developer.
2. Apple Developer → Certificates, Identifiers & Profiles → Devices: register it.
3. Ensure the Buscaviento App ID (`APPLE_BUNDLE_ID`) exists with the required entitlements.
4. Profiles → add new → **Ad Hoc** → choose the Buscaviento App ID, Apple Distribution certificate, and your iPhone → download `.mobileprovision`.
5. Use the .p12 that matches the certificate selected above. If you only have the certificate on a different machine and not its private key, you must securely export it first or create a new certificate/key pair.

## Run

GitHub repository → Actions → **Buscaviento iOS — Ad Hoc iPhone** → Run workflow. Download `buscaviento-adhoc-...` artifact when finished and extract `Buscaviento.ipa`.

## Install

An IPA downloaded in Safari does **not** install by tapping it. Install using an Ad Hoc-capable installation tool connected to the iPhone, or host the IPA and an `itms-services` OTA manifest on HTTPS and open the installation link in Safari. The iPhone must be in the Ad Hoc provisioning profile. iOS may require Developer Mode.

## Important assumptions / limits

- The repository is an **Expo project with `package-lock.json`**, working `npx expo prebuild` and `app.json`/`app.config.*` containing a valid `ios.bundleIdentifier`.
- This is for the main app target. Additional separately signed extensions (notification service, widgets, etc.) need extra provisioning profiles and signing/export entries.
- This workflow is for **Ad Hoc only**. Keep any existing App Store/TestFlight workflow separate.
- The package was structurally checked, but no actual Apple-signed build can be tested without the Buscaviento project and credentials.
- GitHub-hosted macOS build minutes are subject to GitHub's pricing and quota.
