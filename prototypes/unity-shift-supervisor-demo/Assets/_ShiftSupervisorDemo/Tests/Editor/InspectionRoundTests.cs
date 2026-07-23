using System;
using System.Collections.Generic;
using NUnit.Framework;

namespace WAMining.ShiftSupervisorDemo.Tests
{
    /// <summary>
    /// EditMode coverage of the pure scenario core (spec N1) -- no scene,
    /// no MonoBehaviour, no play mode: these run in the Editor's domain
    /// exactly like the backend's pytest suite runs against SQLite. The
    /// fixture mirrors the shipped sample data's shape: several Operating
    /// sites, one Proposed (not-yet-operating, NOT troubled), and one
    /// Care And Maintenance entry that is the round's win condition.
    /// </summary>
    public static class InspectionRoundTests
    {
        private static SiteInfo Site(string code, string stage = "Operating") => new SiteInfo
        {
            siteCode = code,
            title = $"Site {code}",
            siteType = "Mine",
            stage = stage,
            commodity = "Gold",
            region = "Pilbara",
        };

        private static List<SiteInfo> SampleSites() => new List<SiteInfo>
        {
            Site("S001"),
            Site("S002"),
            Site("S003", stage: "Proposed"),
            Site("S004", stage: InspectionRound.TroubledStage),
            Site("S005"),
        };

        private static InspectionRound BegunRound(List<SiteInfo> sites = null)
        {
            var round = new InspectionRound(sites ?? SampleSites());
            round.Begin();
            return round;
        }

        // --- construction -------------------------------------------------

        [Test]
        public static void Constructor_NullSites_Throws() =>
            Assert.Throws<ArgumentNullException>(() => new InspectionRound(null));

        [Test]
        public static void Constructor_EmptySites_Throws() =>
            Assert.Throws<ArgumentException>(() => new InspectionRound(new List<SiteInfo>()));

        [Test]
        public static void Constructor_NullEntry_Throws() =>
            Assert.Throws<ArgumentException>(() =>
                new InspectionRound(new List<SiteInfo> { Site("S001"), null }));

        // --- phase machine ------------------------------------------------

        [Test]
        public static void NewRound_StartsInBriefing_WithNoCurrentSite()
        {
            var round = new InspectionRound(SampleSites());
            Assert.That(round.Phase, Is.EqualTo(RoundPhase.Briefing));
            Assert.That(round.CurrentSite, Is.Null);
            Assert.That(round.CurrentIndex, Is.EqualTo(-1));
            Assert.That(round.ElapsedSeconds, Is.Zero);
        }

        [Test]
        public static void Begin_MovesToFirstSite()
        {
            var round = BegunRound();
            Assert.That(round.Phase, Is.EqualTo(RoundPhase.Inspecting));
            Assert.That(round.CurrentIndex, Is.EqualTo(0));
            Assert.That(round.CurrentSite.siteCode, Is.EqualTo("S001"));
        }

        [Test]
        public static void Begin_OutsideBriefing_Throws()
        {
            var round = BegunRound();
            Assert.Throws<InvalidOperationException>(round.Begin);
        }

        [Test]
        public static void Decide_BeforeBegin_Throws()
        {
            var round = new InspectionRound(SampleSites());
            Assert.Throws<InvalidOperationException>(() => round.Decide(DecisionKind.LogOk));
        }

        // --- decisions ----------------------------------------------------

        [Test]
        public static void LogOk_AdvancesToNextSite()
        {
            var round = BegunRound();
            round.Decide(DecisionKind.LogOk);
            Assert.That(round.CurrentSite.siteCode, Is.EqualTo("S002"));
            Assert.That(round.DecidedCount, Is.EqualTo(1));
        }

        [Test]
        public static void FlagIssue_WithoutReason_Throws()
        {
            var round = BegunRound();
            Assert.Throws<ArgumentException>(() => round.Decide(DecisionKind.FlagIssue));
        }

        [Test]
        public static void LogOk_WithReason_Throws()
        {
            var round = BegunRound();
            Assert.Throws<ArgumentException>(() =>
                round.Decide(DecisionKind.LogOk, FlagReason.Safety));
        }

        [Test]
        public static void CompletingEverySite_ReachesSummary()
        {
            var round = BegunRound();
            for (int i = 0; i < round.SitesTotal; i++)
                round.Decide(DecisionKind.LogOk);
            Assert.That(round.Phase, Is.EqualTo(RoundPhase.Summary));
            Assert.That(round.CurrentSite, Is.Null);
        }

        // --- timing -------------------------------------------------------

        [Test]
        public static void Tick_AccumulatesOnlyWhileInspecting()
        {
            var round = new InspectionRound(SampleSites());
            round.Tick(5);                       // briefing: ignored
            Assert.That(round.ElapsedSeconds, Is.Zero);

            round.Begin();
            round.Tick(1.5);
            round.Tick(0.5);                     // inspecting: counted
            Assert.That(round.ElapsedSeconds, Is.EqualTo(2.0).Within(1e-9));

            for (int i = 0; i < round.SitesTotal; i++)
                round.Decide(DecisionKind.LogOk);
            round.Tick(60);                      // summary: ignored
            Assert.That(round.ElapsedSeconds, Is.EqualTo(2.0).Within(1e-9));
        }

        [Test]
        public static void Tick_NegativeDelta_Throws()
        {
            var round = BegunRound();
            Assert.Throws<ArgumentOutOfRangeException>(() => round.Tick(-0.1));
        }

        [Test]
        public static void Decisions_RecordElapsedTimeAtTheMoment()
        {
            var round = BegunRound();
            round.Tick(3);
            round.Decide(DecisionKind.LogOk);
            round.Tick(4);
            round.Decide(DecisionKind.LogOk);

            var third = round.CurrentSite;
            for (int i = 2; i < round.SitesTotal; i++)
                round.Decide(DecisionKind.LogOk);

            var summary = round.BuildSummary();
            Assert.That(summary.Decisions[0].AtSeconds, Is.EqualTo(3).Within(1e-9));
            Assert.That(summary.Decisions[1].AtSeconds, Is.EqualTo(7).Within(1e-9));
            Assert.That(third, Is.Not.Null); // silence the unused-local style nag
        }

        // --- summary + win condition -------------------------------------

        [Test]
        public static void Summary_RecordsEveryDecision_InOrder()
        {
            var round = BegunRound();
            round.Decide(DecisionKind.LogOk);                              // S001
            round.Decide(DecisionKind.FlagIssue, FlagReason.Equipment);    // S002
            round.Decide(DecisionKind.LogOk);                              // S003
            round.Decide(DecisionKind.FlagIssue, FlagReason.Safety);       // S004
            round.Decide(DecisionKind.LogOk);                              // S005

            var summary = round.BuildSummary();
            Assert.That(summary.Decisions.Count, Is.EqualTo(5));
            Assert.That(summary.Decisions[1].Site.siteCode, Is.EqualTo("S002"));
            Assert.That(summary.Decisions[1].Reason, Is.EqualTo(FlagReason.Equipment));
            Assert.That(summary.Decisions[3].Site.siteCode, Is.EqualTo("S004"));
        }

        [Test]
        public static void Summary_FlaggingTheTroubledSite_Wins()
        {
            var round = BegunRound();
            round.Decide(DecisionKind.LogOk);                            // S001
            round.Decide(DecisionKind.LogOk);                            // S002
            round.Decide(DecisionKind.LogOk);                            // S003 (Proposed: not troubled)
            round.Decide(DecisionKind.FlagIssue, FlagReason.Safety);     // S004 (troubled: caught)
            round.Decide(DecisionKind.LogOk);                            // S005

            var summary = round.BuildSummary();
            Assert.That(summary.TroubledSiteCodes, Is.EqualTo(new[] { "S004" }));
            Assert.That(summary.CaughtEveryTroubledSite, Is.True);
        }

        [Test]
        public static void Summary_LoggingOkOnTheTroubledSite_Loses()
        {
            var round = BegunRound();
            for (int i = 0; i < round.SitesTotal; i++)
                round.Decide(DecisionKind.LogOk);                        // S004 waved through

            Assert.That(round.BuildSummary().CaughtEveryTroubledSite, Is.False);
        }

        [Test]
        public static void Summary_NoTroubledSites_IsVacuouslyCaught()
        {
            var sites = new List<SiteInfo> { Site("S001"), Site("S002") };
            var round = BegunRound(sites);
            round.Decide(DecisionKind.LogOk);
            round.Decide(DecisionKind.LogOk);

            var summary = round.BuildSummary();
            Assert.That(summary.TroubledSiteCodes, Is.Empty);
            Assert.That(summary.CaughtEveryTroubledSite, Is.True);
        }

        [Test]
        public static void BuildSummary_BeforeSummaryPhase_Throws()
        {
            var round = BegunRound();
            Assert.Throws<InvalidOperationException>(() => round.BuildSummary());
        }

        // --- free roam (F10) ---------------------------------------------

        [Test]
        public static void JumpTo_UndecidedSite_ResequencesAndStillCompletes()
        {
            var round = BegunRound();
            round.JumpTo(3);                                             // detour to S004
            Assert.That(round.CurrentSite.siteCode, Is.EqualTo("S004"));

            round.Decide(DecisionKind.FlagIssue, FlagReason.Safety);     // S004 -> next fwd: S005
            Assert.That(round.CurrentSite.siteCode, Is.EqualTo("S005"));

            round.Decide(DecisionKind.LogOk);                            // S005 -> wraps to S001
            Assert.That(round.CurrentSite.siteCode, Is.EqualTo("S001"));

            round.Decide(DecisionKind.LogOk);                            // S001 -> S002
            round.Decide(DecisionKind.LogOk);                            // S002 -> S003
            round.Decide(DecisionKind.LogOk);                            // S003 -> done
            Assert.That(round.Phase, Is.EqualTo(RoundPhase.Summary));
            Assert.That(round.BuildSummary().Decisions.Count, Is.EqualTo(5));
        }

        [Test]
        public static void JumpTo_AlreadyDecidedSite_Throws()
        {
            var round = BegunRound();
            round.Decide(DecisionKind.LogOk);                            // S001 decided
            Assert.Throws<InvalidOperationException>(() => round.JumpTo(0));
        }

        [Test]
        public static void JumpTo_OutOfRange_Throws()
        {
            var round = BegunRound();
            Assert.Throws<ArgumentOutOfRangeException>(() => round.JumpTo(99));
        }

        // --- restart (F6) -------------------------------------------------

        [Test]
        public static void Reset_ReturnsToBriefing_WithCleanState()
        {
            var round = BegunRound();
            round.Tick(9);
            round.Decide(DecisionKind.LogOk);
            round.Reset();

            Assert.That(round.Phase, Is.EqualTo(RoundPhase.Briefing));
            Assert.That(round.ElapsedSeconds, Is.Zero);
            Assert.That(round.DecidedCount, Is.Zero);
            Assert.That(round.CurrentSite, Is.Null);

            round.Begin();                                               // and it runs again
            Assert.That(round.CurrentSite.siteCode, Is.EqualTo("S001"));
        }
    }
}
