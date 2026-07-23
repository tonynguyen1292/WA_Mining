using System;
using System.Collections.Generic;
using System.Linq;

namespace WAMining.ShiftSupervisorDemo
{
    /// <summary>
    /// The inspection-round scenario core: site sequencing, decisions,
    /// timing, and the end-of-shift summary (spec F1/F3/F5/F10).
    ///
    /// Deliberately plain C# with zero UnityEngine dependencies (spec N1):
    /// time arrives via <see cref="Tick"/> from whoever drives the round
    /// (Time.deltaTime in play mode, fixed numbers in tests), so every rule
    /// in here is EditMode-testable without a scene. Presentation lives in
    /// the I2 controllers; this class never knows a GameObject exists.
    /// </summary>
    public sealed class InspectionRound
    {
        /// <summary>
        /// The stage value that marks a site as genuinely troubled -- the
        /// round's win condition is flagging every site carrying it. Matches
        /// the seeded data's "Care And Maintenance" entry (spec F5); Proposed
        /// sites are not-yet-operating, not troubled, and stay excluded.
        /// </summary>
        public const string TroubledStage = "Care And Maintenance";

        private readonly IReadOnlyList<SiteInfo> _sites;
        private readonly List<SiteDecision> _decisions = new List<SiteDecision>();
        private readonly HashSet<int> _decidedIndexes = new HashSet<int>();

        private double _elapsedSeconds;
        private int _currentIndex = -1;

        public InspectionRound(IReadOnlyList<SiteInfo> sites)
        {
            if (sites == null) throw new ArgumentNullException(nameof(sites));
            if (sites.Count == 0)
                throw new ArgumentException("An inspection round needs at least one site.", nameof(sites));
            if (sites.Any(s => s == null))
                throw new ArgumentException("Site list contains a null entry.", nameof(sites));
            _sites = sites;
        }

        public RoundPhase Phase { get; private set; } = RoundPhase.Briefing;

        public int SitesTotal => _sites.Count;

        public int DecidedCount => _decidedIndexes.Count;

        public double ElapsedSeconds => _elapsedSeconds;

        /// <summary>Index of the site under inspection; -1 outside Inspecting.</summary>
        public int CurrentIndex => Phase == RoundPhase.Inspecting ? _currentIndex : -1;

        /// <summary>The site under inspection; null outside Inspecting.</summary>
        public SiteInfo CurrentSite => Phase == RoundPhase.Inspecting ? _sites[_currentIndex] : null;

        /// <summary>Briefing -> Inspecting at the first site (F2's Start button).</summary>
        public void Begin()
        {
            if (Phase != RoundPhase.Briefing)
                throw new InvalidOperationException($"Begin() is only valid in Briefing (phase: {Phase}).");
            _currentIndex = 0;
            Phase = RoundPhase.Inspecting;
        }

        /// <summary>
        /// Advances the shift clock. Only counts while inspecting -- the
        /// briefing read and the summary screen are not shift time (F4/F5).
        /// </summary>
        public void Tick(double deltaSeconds)
        {
            if (deltaSeconds < 0)
                throw new ArgumentOutOfRangeException(nameof(deltaSeconds), "Time cannot run backwards.");
            if (Phase == RoundPhase.Inspecting)
                _elapsedSeconds += deltaSeconds;
        }

        /// <summary>
        /// Records the call for the current site and advances (F3). Flagging
        /// demands a reason; logging OK forbids one -- both directions are
        /// enforced so the UI cannot silently mis-wire its buttons.
        /// </summary>
        public void Decide(DecisionKind kind, FlagReason reason = FlagReason.None)
        {
            if (Phase != RoundPhase.Inspecting)
                throw new InvalidOperationException($"Decide() is only valid while Inspecting (phase: {Phase}).");
            if (kind == DecisionKind.FlagIssue && reason == FlagReason.None)
                throw new ArgumentException("Flagging an issue requires a reason.", nameof(reason));
            if (kind == DecisionKind.LogOk && reason != FlagReason.None)
                throw new ArgumentException("Logging OK cannot carry a flag reason.", nameof(reason));

            _decisions.Add(new SiteDecision(_sites[_currentIndex], kind, reason, _elapsedSeconds));
            _decidedIndexes.Add(_currentIndex);

            int next = NextUndecidedIndex(_currentIndex);
            if (next == -1)
            {
                _currentIndex = -1;
                Phase = RoundPhase.Summary;
            }
            else
            {
                _currentIndex = next;
            }
        }

        /// <summary>
        /// Free-roam tolerance (F10): jump to any not-yet-decided site and
        /// the round re-sequences around the detour.
        /// </summary>
        public void JumpTo(int siteIndex)
        {
            if (Phase != RoundPhase.Inspecting)
                throw new InvalidOperationException($"JumpTo() is only valid while Inspecting (phase: {Phase}).");
            if (siteIndex < 0 || siteIndex >= _sites.Count)
                throw new ArgumentOutOfRangeException(nameof(siteIndex));
            if (_decidedIndexes.Contains(siteIndex))
                throw new InvalidOperationException($"Site index {siteIndex} has already been decided.");
            _currentIndex = siteIndex;
        }

        /// <summary>The end-of-shift report (F5); Summary phase only.</summary>
        public RoundSummary BuildSummary()
        {
            if (Phase != RoundPhase.Summary)
                throw new InvalidOperationException($"BuildSummary() is only valid in Summary (phase: {Phase}).");

            var troubled = _sites
                .Where(s => string.Equals(s.stage, TroubledStage, StringComparison.Ordinal))
                .Select(s => s.siteCode)
                .ToList();

            bool caught = troubled.All(code => _decisions.Any(d =>
                d.Site.siteCode == code && d.Kind == DecisionKind.FlagIssue));

            return new RoundSummary(
                _decisions.ToList(),
                _elapsedSeconds,
                troubled,
                caught);
        }

        /// <summary>Back to the briefing with a clean slate (F6's restart).</summary>
        public void Reset()
        {
            _decisions.Clear();
            _decidedIndexes.Clear();
            _elapsedSeconds = 0;
            _currentIndex = -1;
            Phase = RoundPhase.Briefing;
        }

        private int NextUndecidedIndex(int after)
        {
            // First pass: forward from the site just decided; second pass:
            // wrap to the start -- covers the JumpTo detour case where
            // earlier sites are still waiting.
            for (int i = after + 1; i < _sites.Count; i++)
                if (!_decidedIndexes.Contains(i)) return i;
            for (int i = 0; i < after; i++)
                if (!_decidedIndexes.Contains(i)) return i;
            return -1;
        }
    }
}
