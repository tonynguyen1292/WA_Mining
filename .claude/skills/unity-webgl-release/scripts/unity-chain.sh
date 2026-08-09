#!/usr/bin/env bash
# Headless Unity chain for the shift-supervisor prototype.
#
#   ./unity-chain.sh [ui] [test] [build]     run the named stages, in order
#   ./unity-chain.sh all                     run all three
#
# Stages are independent -- skip the ones your change cannot affect. Rebuilding
# the scene UI for a logic-only change just produces a noisy scene diff.
#
# Exits non-zero on the first failing stage so a caller can stop early.

set -u

UNITY="${UNITY_PATH:-/c/Program Files/Unity/Hub/Editor/6000.5.4f1/Editor/Unity.exe}"
PROJ="${UNITY_PROJECT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)/prototypes/unity-shift-supervisor-demo}"
OUT="${OUT_DIR:-${TMPDIR:-/tmp}}"
RESULTS="$OUT/editmode-results.xml"

[ -f "$UNITY" ] || { echo "Unity not found at: $UNITY" >&2; exit 1; }
[ -d "$PROJ" ] || { echo "Project not found at: $PROJ" >&2; exit 1; }

# The Editor holds an exclusive lock. Bail with a clear message rather than
# letting Unity fail with its own less obvious wording -- and never kill the
# user's Editor, which may hold unsaved scene work.
#
# The lockfile alone is NOT proof the Editor is open: an unclean shutdown
# leaves it behind, and a stale one then blocks every headless run while the
# user is (correctly) insisting they closed Unity. Confirm against the actual
# process list before refusing to run.
if [ -f "$PROJ/Temp/UnityLockfile" ]; then
  unity_running=0
  if command -v tasklist >/dev/null 2>&1; then
    tasklist //FI "IMAGENAME eq Unity.exe" //NH 2>/dev/null | grep -qi "^Unity.exe" && unity_running=1
  elif command -v pgrep >/dev/null 2>&1; then
    pgrep -x Unity >/dev/null 2>&1 && unity_running=1
  else
    unity_running=1  # Can't tell -- assume the lock is real and stay safe.
  fi

  if [ "$unity_running" -eq 1 ]; then
    echo "Unity has the project locked. Ask the user to close the Editor, then re-run." >&2
    exit 1
  fi

  echo "Stale UnityLockfile (no Unity process running) -- removing and continuing." >&2
  rm -f "$PROJ/Temp/UnityLockfile"
fi

run_ui() {
  echo "=== 1/3 scenario UI rebuild ==="
  "$UNITY" -batchmode -nographics -quit -projectPath "$PROJ" \
    -executeMethod WAMining.ShiftSupervisorDemo.EditorTools.ScenarioUiBuilder.Build
  local rc=$?
  echo "builder exit: $rc"
  return $rc
}

run_test() {
  echo "=== 2/3 EditMode tests ==="
  # No -quit here: it makes Unity exit as soon as the run is queued, which
  # yields a green exit code and an empty/truncated results file.
  "$UNITY" -batchmode -nographics -projectPath "$PROJ" \
    -runTests -testPlatform EditMode -testResults "$RESULTS"
  local rc=$?
  echo "tests exit: $rc"
  if [ -f "$RESULTS" ]; then
    grep -o 'total="[0-9]*" passed="[0-9]*"[^>]*failed="[0-9]*"' "$RESULTS" | head -1
  else
    echo "no results file at $RESULTS -- did -quit sneak into the command?" >&2
    return 1
  fi
  return $rc
}

run_build() {
  echo "=== 3/3 WebGL build ==="
  "$UNITY" -batchmode -nographics -quit -projectPath "$PROJ" \
    -buildTarget WebGL \
    -executeMethod WAMining.ShiftSupervisorDemo.EditorTools.WebGLBuildScript.Build
  local rc=$?
  echo "webgl exit: $rc"
  [ $rc -eq 0 ] && ls "$PROJ/Builds/WebGL" | grep -E '^WebGL\.(data|wasm|loader\.js|framework\.js)$'
  return $rc
}

stages="${*:-all}"
case "$stages" in all) stages="ui test build" ;; esac

for stage in $stages; do
  case "$stage" in
    ui)    run_ui    || exit $? ;;
    test)  run_test  || exit $? ;;
    build) run_build || exit $? ;;
    *) echo "unknown stage: $stage (expected ui, test, build, or all)" >&2; exit 2 ;;
  esac
done

echo "chain complete: $stages"
echo "A green chain is not a verified build -- see references/webgl-verification.md"
