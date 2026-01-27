---
allowed-tools: Bash(eas build:*), Bash(eas submit:*)
description: Build and submit iOS app to TestFlight
---

## Your task

Run the following commands in sequence:

1. `eas build --platform ios --non-interactive`
2. After the build completes successfully, run `eas submit --platform ios --latest --non-interactive`

Wait for each command to complete before running the next. Report the status after each step.

If a command fails due to missing credentials, tell the user to run `eas credentials --platform ios` in their terminal first to set up Apple credentials.
