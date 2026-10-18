#!/usr/bin/env python3
"""Verify the Expo iOS bundle identifier matches the GitHub variable."""
import json
import os
import sys

with open(sys.argv[1], encoding="utf-8") as f:
    cfg = json.load(f)
app = cfg.get("exp", cfg)
expected = os.getenv("APPLE_BUNDLE_ID", "")
team = os.getenv("APPLE_TEAM_ID", "")
actual = (app.get("ios") or {}).get("bundleIdentifier")
if not expected or not team:
    sys.exit("Set GitHub variables APPLE_BUNDLE_ID and APPLE_TEAM_ID")
if not actual or actual != expected:
    sys.exit(f"iOS bundle identifier mismatch: Expo={actual!r}, GitHub={expected!r}")
print("Expo iOS bundle ID matches GitHub settings")
