using UnityEngine;

namespace WAMining.ShiftSupervisorDemo
{
    /// <summary>
    /// The bridge between the pure scenario core and the scene (spec §5):
    /// owns the InspectionRound, feeds it time and button-driven decisions,
    /// and tells the view what to render on every phase change. Button
    /// listeners are wired here at runtime rather than as persistent
    /// UnityEvents in the scene file -- the wiring is code-reviewable and
    /// cannot silently break when the scene is regenerated.
    /// </summary>
    public sealed class ShiftScenarioController : MonoBehaviour
    {
        [SerializeField] private SiteDatabase siteDatabase;
        [SerializeField] private ScenarioUIController view;

        private InspectionRound _round;

        private void Start()
        {
            if (siteDatabase == null || view == null)
            {
                Debug.LogWarning($"{nameof(ShiftScenarioController)}: missing references; scenario disabled.");
                enabled = false;
                return;
            }
            if (siteDatabase.Sites.Length == 0)
            {
                Debug.LogWarning($"{nameof(ShiftScenarioController)}: no sites loaded; scenario disabled.");
                enabled = false;
                return;
            }

            _round = new InspectionRound(siteDatabase.Sites);

            view.StartButton.onClick.AddListener(OnStartShift);
            view.LogOkButton.onClick.AddListener(OnLogOk);
            view.FlagIssueButton.onClick.AddListener(view.ShowReasonRow);
            view.ReasonBackButton.onClick.AddListener(view.ShowChoiceRow);
            view.ReasonSafetyButton.onClick.AddListener(() => OnFlag(FlagReason.Safety));
            view.ReasonEquipmentButton.onClick.AddListener(() => OnFlag(FlagReason.Equipment));
            view.ReasonOutputButton.onClick.AddListener(() => OnFlag(FlagReason.Output));
            view.RestartButton.onClick.AddListener(OnRestart);

            view.ShowBriefing();
        }

        private void Update()
        {
            if (_round == null || _round.Phase != RoundPhase.Inspecting) return;
            _round.Tick(Time.deltaTime);
            view.UpdateHud(_round.DecidedCount, _round.SitesTotal, _round.ElapsedSeconds);
        }

        private void OnStartShift()
        {
            _round.Begin();
            view.ShowInspecting(_round.CurrentSite, _round.DecidedCount, _round.SitesTotal);
        }

        private void OnLogOk()
        {
            _round.Decide(DecisionKind.LogOk);
            AfterDecision();
        }

        private void OnFlag(FlagReason reason)
        {
            _round.Decide(DecisionKind.FlagIssue, reason);
            AfterDecision();
        }

        private void AfterDecision()
        {
            if (_round.Phase == RoundPhase.Summary)
            {
                view.ShowSummary(_round.BuildSummary());
            }
            else
            {
                view.ShowInspecting(_round.CurrentSite, _round.DecidedCount, _round.SitesTotal);
            }
        }

        private void OnRestart()
        {
            _round.Reset();
            view.ShowBriefing();
        }
    }
}
