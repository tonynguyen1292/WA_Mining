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
    /// Care and Maintenance entry that is the round's win condition.
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
            Site("S004", stage: "Care and Maintenance"),
            Site("S005"),
        };

        private static readonly SiteCondition Clean = new SiteCondition(10, 0, false);
        private static readonly SiteCondition Breached = new SiteCondition(200, 0, false);

        /// <summary>
        /// Conditions where exactly S004 is troubled, so the assertions below
        /// read the same as they did when "troubled" meant the Care and
        /// Maintenance stage. The difference is that it is now stated by the
        /// fixture rather than inferred from site data -- which is the whole
        /// point of the change: the shift decides, not the site.
        /// </summary>
        private static ShiftConditions ConditionsFor(
            IEnumerable<SiteInfo> sites, params string[] troubledCodes)
        {
            var map = new Dictionary<string, SiteCondition>();
            foreach (var site in sites)
                map[site.siteCode] = Array.IndexOf(troubledCodes, site.siteCode) >= 0 ? Breached : Clean;
            return ShiftConditions.FromMap(seed: 1234, byCode: map);
        }

        private static InspectionRound Round(List<SiteInfo> sites = null, params string[] troubled)
        {
            var list = sites ?? SampleSites();
            if (troubled.Length == 0) troubled = new[] { "S004" };
            return new InspectionRound(list, ConditionsFor(list, troubled));
        }

        private static InspectionRound BegunRound(List<SiteInfo> sites = null)
        {
            var round = Round(sites);
            round.Begin();
            return round;
        }

        // --- construction -------------------------------------------------

        [Test]
        public static void Constructor_NullSites_Throws() =>
            Assert.Throws<ArgumentNullException>(() =>
                new InspectionRound(null, ConditionsFor(SampleSites())));

        [Test]
        public static void Constructor_EmptySites_Throws() =>
            Assert.Throws<ArgumentException>(() =>
                new InspectionRound(new List<SiteInfo>(), ConditionsFor(SampleSites())));

        [Test]
        public static void Constructor_NullEntry_Throws() =>
            Assert.Throws<ArgumentException>(() =>
                new InspectionRound(new List<SiteInfo> { Site("S001"), null }, ConditionsFor(SampleSites())));

        // --- phase machine ------------------------------------------------

        [Test]
        public static void NewRound_StartsInBriefing_WithNoCurrentSite()
        {
            var round = Round();
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
            var round = Round();
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
            var round = Round();
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

        // --- shift conditions: the rule ----------------------------------

        [Test]
        public static void Condition_WithinEveryThreshold_IsClean()
        {
            var condition = new SiteCondition(
                daysSinceInspection: ShiftConditions.InspectionOverdueDays,
                openSafetyActions: ShiftConditions.OpenActionLimit - 1,
                equipmentFault: false);

            Assert.That(condition.IsTroubled, Is.False);
            Assert.That(condition.Breaches, Is.EqualTo(BreachKind.None));
        }

        [Test]
        public static void Condition_InspectionOneDayOverdue_Breaches()
        {
            // Boundary matters: the rule is "older than", so exactly the
            // threshold is still fine and one day past it is not.
            var condition = new SiteCondition(ShiftConditions.InspectionOverdueDays + 1, 0, false);

            Assert.That(condition.IsTroubled, Is.True);
            Assert.That(condition.Breaches, Is.EqualTo(BreachKind.InspectionOverdue));
        }

        [Test]
        public static void Condition_OpenActionsAtLimit_Breaches()
        {
            // "At or above" here, unlike the inspection rule. The asymmetry is
            // deliberate and this pins it.
            var condition = new SiteCondition(0, ShiftConditions.OpenActionLimit, false);

            Assert.That(condition.Breaches, Is.EqualTo(BreachKind.TooManyOpenActions));
        }

        [Test]
        public static void Condition_EquipmentFault_Breaches() =>
            Assert.That(new SiteCondition(0, 0, true).Breaches,
                Is.EqualTo(BreachKind.EquipmentFault));

        [Test]
        public static void Condition_MultipleBreaches_AreAllReported()
        {
            var condition = new SiteCondition(
                ShiftConditions.InspectionOverdueDays + 1, ShiftConditions.OpenActionLimit, true);

            Assert.That(condition.Breaches, Is.EqualTo(
                BreachKind.InspectionOverdue | BreachKind.TooManyOpenActions | BreachKind.EquipmentFault));
        }

        [Test]
        public static void Condition_NegativeReadings_Throw()
        {
            Assert.Throws<ArgumentOutOfRangeException>(() => new SiteCondition(-1, 0, false));
            Assert.Throws<ArgumentOutOfRangeException>(() => new SiteCondition(0, -1, false));
        }

        // --- shift conditions: generation --------------------------------

        [Test]
        public static void Generate_SameSeed_ProducesIdenticalShift()
        {
            // The property the whole feature rests on. Without it a run cannot
            // be replayed and none of the tests below mean anything.
            var first = ShiftConditions.Generate(SampleSites(), 42);
            var second = ShiftConditions.Generate(SampleSites(), 42);

            Assert.That(second.TroubledSiteCodes, Is.EqualTo(first.TroubledSiteCodes));
            foreach (var site in SampleSites())
            {
                Assert.That(second.For(site.siteCode).DaysSinceInspection,
                    Is.EqualTo(first.For(site.siteCode).DaysSinceInspection), site.siteCode);
                Assert.That(second.For(site.siteCode).OpenSafetyActions,
                    Is.EqualTo(first.For(site.siteCode).OpenSafetyActions), site.siteCode);
                Assert.That(second.For(site.siteCode).EquipmentFault,
                    Is.EqualTo(first.For(site.siteCode).EquipmentFault), site.siteCode);
            }
        }

        [Test]
        public static void Generate_AcrossSeeds_DoesNotAlwaysTroubleTheSameSites()
        {
            // The defect this feature exists to fix: the old scenario always
            // had the same answer. Asserted over a range rather than against a
            // single other seed, which could collide by chance.
            var seen = new HashSet<string>();
            for (int seed = 0; seed < 40; seed++)
                seen.Add(string.Join(",", ShiftConditions.Generate(SampleSites(), seed).TroubledSiteCodes));

            Assert.That(seen.Count, Is.GreaterThan(1),
                "every seed produced the same troubled set -- the shift is not varying");
        }

        [Test]
        public static void Generate_AlwaysTroublesBetweenOneAndTwoSites()
        {
            // A shift with none is vacuous: log everything OK and win. A shift
            // where everything is broken teaches nothing either.
            for (int seed = -20; seed < 60; seed++)
            {
                int troubled = ShiftConditions.Generate(SampleSites(), seed).TroubledSiteCodes.Count;
                Assert.That(troubled, Is.InRange(1, 2), "seed " + seed + " troubled " + troubled + " sites");
            }
        }

        [Test]
        public static void Generate_IsIndependentOfSiteOrder()
        {
            // Generation ranks by hash rather than sampling the list, so the
            // visiting order must not change who ends up troubled.
            var forward = SampleSites();
            var reversed = SampleSites();
            reversed.Reverse();

            Assert.That(ShiftConditions.Generate(reversed, 7).TroubledSiteCodes,
                Is.EqualTo(ShiftConditions.Generate(forward, 7).TroubledSiteCodes));
        }

        [Test]
        public static void Generate_CoversEverySite()
        {
            var conditions = ShiftConditions.Generate(SampleSites(), 3);
            foreach (var site in SampleSites())
                Assert.That(conditions.Has(site.siteCode), Is.True, site.siteCode);
        }

        [Test]
        public static void Generate_Guards()
        {
            Assert.Throws<ArgumentNullException>(() => ShiftConditions.Generate(null, 1));
            Assert.Throws<ArgumentException>(() => ShiftConditions.Generate(new List<SiteInfo>(), 1));
            Assert.Throws<ArgumentException>(() =>
                ShiftConditions.Generate(new List<SiteInfo> { Site("") }, 1));
        }

        [Test]
        public static void For_UnknownSite_Throws() =>
            Assert.Throws<KeyNotFoundException>(() =>
                ShiftConditions.Generate(SampleSites(), 1).For("NOPE"));

        // --- round integration -------------------------------------------

        [Test]
        public static void Constructor_SiteWithoutCondition_Throws()
        {
            // Fails at construction rather than silently treating the site as
            // clean and producing a wrong verdict at the end of the shift.
            var sites = SampleSites();
            var partial = ConditionsFor(new List<SiteInfo> { sites[0] });

            var ex = Assert.Throws<ArgumentException>(() => new InspectionRound(sites, partial));
            Assert.That(ex.Message, Does.Contain("S002"));
        }

        [Test]
        public static void Constructor_NullConditions_Throws() =>
            Assert.Throws<ArgumentNullException>(() => new InspectionRound(SampleSites(), null));

        [Test]
        public static void Summary_TroubledSites_ComeFromConditionsNotStage()
        {
            // S003 is Proposed and S004 is Care and Maintenance in the fixture;
            // neither matters any more. This shift says S001 is the troubled one.
            var sites = SampleSites();
            var round = new InspectionRound(sites, ConditionsFor(sites, "S001"));
            round.Begin();
            round.Decide(DecisionKind.FlagIssue, FlagReason.Safety);     // S001
            for (int i = 1; i < sites.Count; i++)
                round.Decide(DecisionKind.LogOk);

            var summary = round.BuildSummary();

            Assert.That(summary.TroubledSiteCodes, Is.EqualTo(new[] { "S001" }));
            Assert.That(summary.CaughtEveryTroubledSite, Is.True);
        }

        [Test]
        public static void Summary_CarriesTheSeedForReplay()
        {
            var sites = SampleSites();
            var round = new InspectionRound(sites, ShiftConditions.Generate(sites, 99));
            round.Begin();
            for (int i = 0; i < sites.Count; i++) round.Decide(DecisionKind.LogOk);

            Assert.That(round.BuildSummary().Seed, Is.EqualTo(99));
        }

        // --- assessment: what the debrief says ---------------------------

        private static readonly SiteCondition Overdue =
            new SiteCondition(ShiftConditions.InspectionOverdueDays + 52, 0, false);

        [Test]
        public static void Classify_FlagOnBreachingSite_IsCorrectFlag() =>
            Assert.That(ShiftAssessment.Classify(DecisionKind.FlagIssue, Overdue),
                Is.EqualTo(CallOutcome.CorrectFlag));

        [Test]
        public static void Classify_LogOkOnBreachingSite_IsMissed() =>
            Assert.That(ShiftAssessment.Classify(DecisionKind.LogOk, Overdue),
                Is.EqualTo(CallOutcome.Missed));

        [Test]
        public static void Classify_FlagOnCleanSite_IsFalseAlarm() =>
            Assert.That(ShiftAssessment.Classify(DecisionKind.FlagIssue, Clean),
                Is.EqualTo(CallOutcome.FalseAlarm));

        [Test]
        public static void Classify_LogOkOnCleanSite_IsCorrectlyCleared() =>
            Assert.That(ShiftAssessment.Classify(DecisionKind.LogOk, Clean),
                Is.EqualTo(CallOutcome.CorrectlyCleared));

        [Test]
        public static void Classify_NullCondition_Throws() =>
            Assert.Throws<ArgumentNullException>(() =>
                ShiftAssessment.Classify(DecisionKind.LogOk, null));

        [Test]
        public static void ExplainBreaches_CleanSite_IsEmpty() =>
            Assert.That(ShiftAssessment.ExplainBreaches(Clean), Is.Empty);

        [Test]
        public static void ExplainBreaches_Overdue_NamesTheReadingAndTheLimit()
        {
            // The debrief has to say what was missed, not just that something
            // was: "142 days, over the 90 day limit" is actionable where
            // "you missed one" is not.
            var reasons = ShiftAssessment.ExplainBreaches(Overdue);

            Assert.That(reasons.Count, Is.EqualTo(1));
            Assert.That(reasons[0], Does.Contain("142"));
            Assert.That(reasons[0], Does.Contain(ShiftConditions.InspectionOverdueDays.ToString()));
        }

        [Test]
        public static void ExplainBreaches_EveryBreach_IsListedSeparately()
        {
            var all = new SiteCondition(ShiftConditions.InspectionOverdueDays + 1,
                                        ShiftConditions.OpenActionLimit, true);

            Assert.That(ShiftAssessment.ExplainBreaches(all).Count, Is.EqualTo(3));
        }
    }
}
