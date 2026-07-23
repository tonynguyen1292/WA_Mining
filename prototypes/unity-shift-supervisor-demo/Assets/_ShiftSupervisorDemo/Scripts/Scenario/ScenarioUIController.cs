using UnityEngine;
using UnityEngine.UI;

namespace WAMining.ShiftSupervisorDemo
{
    /// <summary>
    /// Pure view for the inspection round (spec F2/F4/F5): owns references
    /// to the UGUI panels the Editor-time ScenarioUiBuilder creates, and
    /// renders whatever state it is handed. No scenario rules live here --
    /// it never touches InspectionRound directly, so the view can be
    /// reskinned without the logic noticing (and vice versa).
    /// </summary>
    public sealed class ScenarioUIController : MonoBehaviour
    {
        [Header("Briefing (F2)")]
        [SerializeField] private GameObject briefingPanel;
        [SerializeField] private Button startButton;

        [Header("HUD (F4)")]
        [SerializeField] private GameObject hudRoot;
        [SerializeField] private Text hudText;

        [Header("Decision panel (F3)")]
        [SerializeField] private GameObject decisionPanel;
        [SerializeField] private Text decisionPrompt;
        [SerializeField] private GameObject choiceRow;
        [SerializeField] private Button logOkButton;
        [SerializeField] private Button flagIssueButton;
        [SerializeField] private GameObject reasonRow;
        [SerializeField] private Button reasonSafetyButton;
        [SerializeField] private Button reasonEquipmentButton;
        [SerializeField] private Button reasonOutputButton;
        [SerializeField] private Button reasonBackButton;

        [Header("Summary (F5/F6)")]
        [SerializeField] private GameObject summaryPanel;
        [SerializeField] private Text summaryBody;
        [SerializeField] private Button restartButton;

        public Button StartButton => startButton;
        public Button LogOkButton => logOkButton;
        public Button FlagIssueButton => flagIssueButton;
        public Button ReasonSafetyButton => reasonSafetyButton;
        public Button ReasonEquipmentButton => reasonEquipmentButton;
        public Button ReasonOutputButton => reasonOutputButton;
        public Button ReasonBackButton => reasonBackButton;
        public Button RestartButton => restartButton;

        public void ShowBriefing()
        {
            briefingPanel.SetActive(true);
            hudRoot.SetActive(false);
            decisionPanel.SetActive(false);
            summaryPanel.SetActive(false);
        }

        public void ShowInspecting(SiteInfo site, int decidedCount, int sitesTotal)
        {
            briefingPanel.SetActive(false);
            hudRoot.SetActive(true);
            decisionPanel.SetActive(true);
            summaryPanel.SetActive(false);
            ShowChoiceRow();
            decisionPrompt.text =
                $"Now inspecting: {site.title}  ({site.siteType} - {site.stage})";
            UpdateHud(decidedCount, sitesTotal, 0);
        }

        /// <summary>HUD line; called every frame while inspecting (F4).</summary>
        public void UpdateHud(int decidedCount, int sitesTotal, double elapsedSeconds)
        {
            int minutes = (int)(elapsedSeconds / 60);
            int seconds = (int)(elapsedSeconds % 60);
            hudText.text = $"Site {Mathf.Min(decidedCount + 1, sitesTotal)} of {sitesTotal}   ·   Shift time {minutes:00}:{seconds:00}";
        }

        /// <summary>The two-step flag flow (F3): first the choice row...</summary>
        public void ShowChoiceRow()
        {
            choiceRow.SetActive(true);
            reasonRow.SetActive(false);
        }

        /// <summary>...then the reason row once "Flag issue" is picked.</summary>
        public void ShowReasonRow()
        {
            choiceRow.SetActive(false);
            reasonRow.SetActive(true);
        }

        public void ShowSummary(RoundSummary summary)
        {
            briefingPanel.SetActive(false);
            hudRoot.SetActive(false);
            decisionPanel.SetActive(false);
            summaryPanel.SetActive(true);

            var lines = new System.Text.StringBuilder();
            foreach (var decision in summary.Decisions)
            {
                string call = decision.Kind == DecisionKind.LogOk
                    ? "Logged OK"
                    : $"Flagged - {decision.Reason}";
                lines.AppendLine($"{decision.Site.title}:  {call}");
            }

            int minutes = (int)(summary.DurationSeconds / 60);
            int seconds = (int)(summary.DurationSeconds % 60);
            lines.AppendLine();
            lines.AppendLine($"Shift completed in {minutes:00}:{seconds:00}.");
            lines.Append(summary.CaughtEveryTroubledSite
                ? "You caught the site that needed attention - good shift."
                : "A troubled site was waved through - review your flags.");

            summaryBody.text = lines.ToString();
        }
    }
}
