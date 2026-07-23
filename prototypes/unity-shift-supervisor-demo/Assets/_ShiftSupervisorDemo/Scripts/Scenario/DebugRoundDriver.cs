#if UNITY_EDITOR
using UnityEngine;

namespace WAMining.ShiftSupervisorDemo
{
    /// <summary>
    /// I1's placeholder UI: a throwaway IMGUI panel that drives a full
    /// InspectionRound end-to-end in Editor play mode, so the core is
    /// demonstrable before the real I2 UGUI exists.
    ///
    /// Editor-only by construction (the whole file is UNITY_EDITOR-gated
    /// and it self-spawns via RuntimeInitializeOnLoadMethod), so it needs
    /// no scene edit and can never leak into the WebGL build. Replaced
    /// wholesale by ScenarioUIController in increment I2.
    /// </summary>
    public sealed class DebugRoundDriver : MonoBehaviour
    {
        private InspectionRound _round;
        private RoundSummary _summary;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void SpawnIfSceneHasData()
        {
            // Only attach in scenes that actually have the demo's data
            // source -- keeps the driver out of unrelated test scenes.
            if (FindFirstObjectByType<SiteDatabase>() == null) return;
            new GameObject(nameof(DebugRoundDriver)).AddComponent<DebugRoundDriver>();
        }

        private void Start()
        {
            var database = FindFirstObjectByType<SiteDatabase>();
            if (database == null || database.Sites.Length == 0)
            {
                Debug.LogWarning($"{nameof(DebugRoundDriver)}: no sites available; driver disabled.");
                enabled = false;
                return;
            }
            _round = new InspectionRound(database.Sites);
        }

        private void Update()
        {
            _round?.Tick(Time.deltaTime);
        }

        private void OnGUI()
        {
            if (_round == null) return;

            GUILayout.BeginArea(new Rect(10, 10, 340, 400), GUI.skin.box);
            GUILayout.Label($"[DEBUG DRIVER — I1] Phase: {_round.Phase}");

            switch (_round.Phase)
            {
                case RoundPhase.Briefing:
                    GUILayout.Label("Visit every site and log its status.");
                    if (GUILayout.Button("Start shift")) _round.Begin();
                    break;

                case RoundPhase.Inspecting:
                    GUILayout.Label($"Site {_round.DecidedCount + 1} of {_round.SitesTotal}  |  " +
                                    $"t = {_round.ElapsedSeconds:F1}s");
                    GUILayout.Label($"{_round.CurrentSite.title} — {_round.CurrentSite.stage}");
                    if (GUILayout.Button("Log OK"))
                        _round.Decide(DecisionKind.LogOk);
                    if (GUILayout.Button("Flag: Safety"))
                        _round.Decide(DecisionKind.FlagIssue, FlagReason.Safety);
                    if (GUILayout.Button("Flag: Equipment"))
                        _round.Decide(DecisionKind.FlagIssue, FlagReason.Equipment);
                    if (GUILayout.Button("Flag: Output"))
                        _round.Decide(DecisionKind.FlagIssue, FlagReason.Output);
                    if (_round.Phase == RoundPhase.Summary)
                        _summary = _round.BuildSummary();
                    break;

                case RoundPhase.Summary:
                    _summary ??= _round.BuildSummary();
                    GUILayout.Label($"Shift complete in {_summary.DurationSeconds:F1}s");
                    GUILayout.Label(_summary.CaughtEveryTroubledSite
                        ? "Caught the troubled site — good shift."
                        : "Missed a troubled site — review the flags.");
                    foreach (var decision in _summary.Decisions)
                    {
                        string reason = decision.Reason == FlagReason.None ? "" : $" ({decision.Reason})";
                        GUILayout.Label($"• {decision.Site.siteCode}: {decision.Kind}{reason}");
                    }
                    if (GUILayout.Button("Restart"))
                    {
                        _summary = null;
                        _round.Reset();
                    }
                    break;
            }

            GUILayout.EndArea();
        }
    }
}
#endif
