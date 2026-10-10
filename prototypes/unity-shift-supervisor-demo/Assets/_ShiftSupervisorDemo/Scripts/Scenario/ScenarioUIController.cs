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

        public void ShowInspecting(SiteInfo site, SiteCondition condition, int decidedCount, int sitesTotal)
        {
            briefingPanel.SetActive(false);
            hudRoot.SetActive(true);
            decisionPanel.SetActive(true);
            summaryPanel.SetActive(false);
            ShowChoiceRow();
            decisionPrompt.text = DescribeSite(site, condition);
            UpdateHud(decidedCount, sitesTotal, 0);
        }

        /// <summary>
        /// The site, this shift's readings, and the rule they are judged
        /// against.
        ///
        /// The rule is restated on every site rather than only in the briefing.
        /// That is deliberate: a trainee should not have to have memorised a
        /// threshold to make the call, and the thing being trained is applying
        /// the rule to what is in front of you, not recalling the number. It
        /// also keeps this readable without a scene change to the briefing
        /// panel, whose body text is baked by the builder.
        /// </summary>
        private static string DescribeSite(SiteInfo site, SiteCondition condition)
        {
            string equipment = condition.EquipmentFault ? "FAULT" : "OK";
            return
                $"Now inspecting: {site.title}  ({site.siteType} - {site.stage})\n" +
                "\n" +
                $"Last inspection {condition.DaysSinceInspection} days ago   |   " +
                $"Open safety actions {condition.OpenSafetyActions}   |   " +
                $"Equipment {equipment}\n" +
                "\n" +
                $"Flag if: inspection over {ShiftConditions.InspectionOverdueDays} days, " +
                $"{ShiftConditions.OpenActionLimit}+ open actions, or an equipment fault.";
        }

        /// <summary>HUD line; called every frame while inspecting (F4).</summary>
        public void UpdateHud(int decidedCount, int sitesTotal, double elapsedSeconds)
        {
            int minutes = (int)(elapsedSeconds / 60);
            int seconds = (int)(elapsedSeconds % 60);
            hudText.text = $"Site {Mathf.Min(decidedCount + 1, sitesTotal)} of {sitesTotal}   |   Shift time {minutes:00}:{seconds:00}";
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

        /// <summary>
        /// The after-action review (F5), not just a scoreboard.
        ///
        /// Every call is judged and, where it was wrong, the reason is given
        /// from the readings that were on screen at the time. A training tool
        /// that only reports a score tells you that you failed; a debrief tells
        /// you what you missed, which is the part that changes behaviour on the
        /// next run. Correct calls are named too -- knowing a clean site was
        /// genuinely clean is feedback, not filler.
        /// </summary>
        public void ShowSummary(RoundSummary summary, ShiftConditions conditions)
        {
            briefingPanel.SetActive(false);
            hudRoot.SetActive(false);
            decisionPanel.SetActive(false);
            summaryPanel.SetActive(true);

            var lines = new System.Text.StringBuilder();
            int correct = 0;

            foreach (var decision in summary.Decisions)
            {
                var condition = conditions.For(decision.Site.siteCode);
                var outcome = ShiftAssessment.Classify(decision.Kind, condition);
                if (outcome == CallOutcome.CorrectFlag || outcome == CallOutcome.CorrectlyCleared) correct++;

                string call = decision.Kind == DecisionKind.LogOk
                    ? "Logged OK"
                    : $"Flagged - {decision.Reason}";

                lines.AppendLine($"{Mark(outcome)} {decision.Site.title}:  {call}");

                string note = Explain(outcome, condition);
                if (note.Length > 0) lines.AppendLine($"      {note}");
            }

            int minutes = (int)(summary.DurationSeconds / 60);
            int seconds = (int)(summary.DurationSeconds % 60);
            lines.AppendLine();
            lines.AppendLine($"{correct} of {summary.Decisions.Count} calls correct, in {minutes:00}:{seconds:00}.");
            lines.Append(summary.CaughtEveryTroubledSite
                ? "Every breaching site was flagged - good shift."
                : "A breaching site was waved through - see the misses above.");

            summaryBody.text = lines.ToString();
        }

        /// <summary>ASCII only: the bundled font has known glyph gaps.</summary>
        private static string Mark(CallOutcome outcome)
        {
            switch (outcome)
            {
                case CallOutcome.CorrectFlag:
                case CallOutcome.CorrectlyCleared: return "[ok]";
                case CallOutcome.FalseAlarm: return "[? ]";
                default: return "[X]";
            }
        }

        private static string Explain(CallOutcome outcome, SiteCondition condition)
        {
            switch (outcome)
            {
                case CallOutcome.Missed:
                    return "missed: " + string.Join("; ", ShiftAssessment.ExplainBreaches(condition));
                case CallOutcome.FalseAlarm:
                    return "false alarm: every reading was within limits";
                case CallOutcome.CorrectFlag:
                    return "correct: " + string.Join("; ", ShiftAssessment.ExplainBreaches(condition));
                default:
                    return string.Empty;
            }
        }
    }
}
