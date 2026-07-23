using System;
using System.Collections.Generic;

namespace WAMining.ShiftSupervisorDemo
{
    /// <summary>Where an inspection round currently is in its life cycle.</summary>
    public enum RoundPhase
    {
        Briefing,
        Inspecting,
        Summary,
    }

    /// <summary>The call a supervisor makes at each site.</summary>
    public enum DecisionKind
    {
        LogOk,
        FlagIssue,
    }

    /// <summary>
    /// Why a site was flagged. <see cref="None"/> is only valid alongside
    /// <see cref="DecisionKind.LogOk"/> -- a flag without a reason is not a
    /// decision, it's a shrug, and the core refuses to record it.
    /// </summary>
    public enum FlagReason
    {
        None,
        Safety,
        Equipment,
        Output,
    }

    /// <summary>One recorded call for one site, immutable once made.</summary>
    public sealed class SiteDecision
    {
        public SiteDecision(SiteInfo site, DecisionKind kind, FlagReason reason, double atSeconds)
        {
            Site = site ?? throw new ArgumentNullException(nameof(site));
            Kind = kind;
            Reason = reason;
            AtSeconds = atSeconds;
        }

        public SiteInfo Site { get; }
        public DecisionKind Kind { get; }
        public FlagReason Reason { get; }

        /// <summary>Shift-elapsed seconds at the moment of the decision.</summary>
        public double AtSeconds { get; }
    }

    /// <summary>The end-of-shift report the summary screen renders.</summary>
    public sealed class RoundSummary
    {
        public RoundSummary(
            IReadOnlyList<SiteDecision> decisions,
            double durationSeconds,
            IReadOnlyList<string> troubledSiteCodes,
            bool caughtEveryTroubledSite)
        {
            Decisions = decisions ?? throw new ArgumentNullException(nameof(decisions));
            DurationSeconds = durationSeconds;
            TroubledSiteCodes = troubledSiteCodes ?? throw new ArgumentNullException(nameof(troubledSiteCodes));
            CaughtEveryTroubledSite = caughtEveryTroubledSite;
        }

        /// <summary>Every call made this round, in the order it was made.</summary>
        public IReadOnlyList<SiteDecision> Decisions { get; }

        public double DurationSeconds { get; }

        /// <summary>Site codes whose stage marks them genuinely troubled.</summary>
        public IReadOnlyList<string> TroubledSiteCodes { get; }

        /// <summary>
        /// The round's win condition: every troubled site received a
        /// FlagIssue call. Vacuously true when no site is troubled.
        /// </summary>
        public bool CaughtEveryTroubledSite { get; }
    }
}
