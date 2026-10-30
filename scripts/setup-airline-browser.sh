#!/bin/sh
set -eu
export PLAYWRIGHT_BROWSERS_PATH=/opt/shihou/browser-cache
systemd-run --wait --pipe --property=MemoryMax=350M --property=MemorySwapMax=512M --property=CPUQuota=50% --setenv=PLAYWRIGHT_BROWSERS_PATH="$PLAYWRIGHT_BROWSERS_PATH" npx --yes playwright@1.64.1 install chromium-headless-shell
# Check ldd output and install only missing runtime libraries; avoid a full apt index refresh.
chmod -R a+rX /opt/shihou/browser-cache
cat > /etc/apparmor.d/shihou-airline-headless <<'PROFILE'
abi <abi/4.0>,
include <tunables/global>
profile shihou-airline-headless /opt/shihou/browser-cache/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell flags=(unconfined) {
  userns,
}
PROFILE
apparmor_parser -r /etc/apparmor.d/shihou-airline-headless
# The existing small ECS needs to use its pre-existing swap while Chromium runs.
test "$(awk '/SwapTotal:/ {print $2}' /proc/meminfo)" -gt 0
printf 'vm.swappiness = 60\n' > /etc/sysctl.d/99-shihou-airline-memory.conf
sysctl -w vm.swappiness=60
