using System;
using System.Collections.Generic;
using System.Linq;

namespace WAMining.ShiftSupervisorDemo
{
    /// <summary>Which rule a site's readings breached, if any.</summary>
    [Flags]
    public enum BreachKind
    {
        None = 0,
        InspectionOverdue = 1,
        TooManyOpenActions = 2,
        EquipmentFault = 4,
    }

    /// <summary>
    /// What a supervisor can observe at one site on one shift. These are the
    /// cues a call is made from, generated per run rather than baked into the
    /// site data.
    ///
    /// This replaces the original win condition -- "flag the site whose stage
    /// is Care and Maintenance" -- which had two faults a training studio would
    /// spot immediately. The troubled site was always the same one in the same
    /// position, so a second playthrough tested memory rather than judgement;
    /// and the stage is printed in the decision prompt, so the answer was
    /// already on screen. A scenario whose answer is visible is a quiz, not
    /// training.
    /// </summary>
    public sealed class SiteCondition
    {
        public SiteCondition(int daysSinceInspection, int openSafetyActions, bool equipmentFault)
        {
            if (daysSinceInspection < 0)
                throw new ArgumentOutOfRangeException(nameof(daysSinceInspection));
            if (openSafetyActions < 0)
                throw new ArgumentOutOfRangeException(nameof(openSafetyActions));

            DaysSinceInspection = daysSinceInspection;
            OpenSafetyActions = openSafetyActions;
            EquipmentFault = equipmentFault;
        }

        public int DaysSinceInspection { get; }
        public int OpenSafetyActions { get; }
        public bool EquipmentFault { get; }

        /// <summary>
        /// Every rule this site breaches. Flags rather than prose so the core
        /// stays free of presentation -- the view phrases them for the debrief.
        /// </summary>
        public BreachKind Breaches
        {
            get
            {
                var breaches = BreachKind.None;
                if (DaysSinceInspection > ShiftConditions.InspectionOverdueDays)
                    breaches |= BreachKind.InspectionOverdue;
                if (OpenSafetyActions >= ShiftConditions.OpenActionLimit)
                    breaches |= BreachKind.TooManyOpenActions;
                if (EquipmentFault)
                    breaches |= BreachKind.EquipmentFault;
                return breaches;
            }
        }

        public bool IsTroubled => Breaches != BreachKind.None;
    }

    /// <summary>
    /// One shift's conditions across every site, generated from a seed.
    ///
    /// Seeded rather than random so a run is reproducible: the same seed always
    /// produces the same shift. That is what makes a failure demonstrable, the
    /// generation EditMode-testable, and a specific shift replayable -- the seed
    /// travels on the summary for exactly that reason.
    /// </summary>
    public sealed class ShiftConditions
    {
        /// <summary>An inspection older than this many days is overdue.</summary>
        public const int InspectionOverdueDays = 90;

        /// <summary>This many open safety actions is a breach.</summary>
        public const int OpenActionLimit = 3;

        private readonly Dictionary<string, SiteCondition> _byCode;

        private ShiftConditions(int seed, Dictionary<string, SiteCondition> byCode)
        {
            Seed = seed;
            _byCode = byCode;
        }

        public int Seed { get; }

        /// <summary>Whether a condition was generated for this site.</summary>
        public bool Has(string siteCode) =>
            siteCode != null && _byCode.ContainsKey(siteCode);

        public SiteCondition For(string siteCode)
        {
            if (siteCode == null) throw new ArgumentNullException(nameof(siteCode));
            if (!_byCode.TryGetValue(siteCode, out var condition))
                throw new KeyNotFoundException($"No condition generated for site '{siteCode}'.");
            return condition;
        }

        public IReadOnlyList<string> TroubledSiteCodes =>
            _byCode.Where(entry => entry.Value.IsTroubled)
                   .Select(entry => entry.Key)
                   .OrderBy(code => code, StringComparer.Ordinal)
                   .ToList();

        /// <summary>Explicit conditions, for tests and for authored scenarios.</summary>
        public static ShiftConditions FromMap(int seed, IDictionary<string, SiteCondition> byCode)
        {
            if (byCode == null) throw new ArgumentNullException(nameof(byCode));
            if (byCode.Count == 0)
                throw new ArgumentException("Conditions cannot be empty.", nameof(byCode));
            return new ShiftConditions(seed, new Dictionary<string, SiteCondition>(byCode, StringComparer.Ordinal));
        }

        /// <summary>
        /// Generate one shift. Guarantees at least one troubled site and never
        /// more than two: a shift with none is vacuous because every call is
        /// "log OK", and a shift where everything is broken is just as
        /// uninformative in the other direction.
        /// </summary>
        public static ShiftConditions Generate(IReadOnlyList<SiteInfo> sites, int seed)
        {
            if (sites == null) throw new ArgumentNullException(nameof(sites));
            if (sites.Count == 0)
                throw new ArgumentException("Need at least one site.", nameof(sites));
            if (sites.Any(site => site == null || string.IsNullOrEmpty(site.siteCode)))
                throw new ArgumentException("Every site needs a siteCode.", nameof(sites));

            // Rank by a stable hash of (seed, code) and trouble the top one or
            // two. Ranking rather than sampling keeps generation
            // order-independent: reordering the input list cannot change which
            // sites end up troubled, only the order they are visited in.
            var ranked = sites
                .Select(site => new { Site = site, Key = Hash(seed, site.siteCode) })
                .OrderBy(entry => entry.Key)
                .ThenBy(entry => entry.Site.siteCode, StringComparer.Ordinal)
                .ToList();

            int troubledCount = sites.Count >= 2 && (Hash(seed, "#count") & 1u) == 1u ? 2 : 1;

            var map = new Dictionary<string, SiteCondition>(StringComparer.Ordinal);
            for (int i = 0; i < ranked.Count; i++)
            {
                var site = ranked[i].Site;
                uint readings = Hash(seed, site.siteCode + "#readings");
                map[site.siteCode] = i < troubledCount ? Troubled(readings) : Clean(readings);
            }

            return new ShiftConditions(seed, map);
        }

        private static SiteCondition Troubled(uint hash)
        {
            // One breach at a time. A site failing on every count is obvious,
            // and obvious cases do not train anyone.
            switch (hash % 3u)
            {
                case 0:
                    return new SiteCondition(
                        daysSinceInspection: (int)(InspectionOverdueDays + 1 + hash % 120u),
                        openSafetyActions: (int)(hash % (uint)OpenActionLimit),
                        equipmentFault: false);
                case 1:
                    return new SiteCondition(
                        daysSinceInspection: (int)(hash % (uint)InspectionOverdueDays),
                        openSafetyActions: (int)(OpenActionLimit + hash % 3u),
                        equipmentFault: false);
                default:
                    return new SiteCondition(
                        daysSinceInspection: (int)(hash % (uint)InspectionOverdueDays),
                        openSafetyActions: (int)(hash % (uint)OpenActionLimit),
                        equipmentFault: true);
            }
        }

        private static SiteCondition Clean(uint hash)
        {
            // Deliberately lands near the thresholds sometimes. An 85-day-old
            // inspection is fine, but it should make the player check -- that
            // gap is the difference between a judgement and a glance.
            return new SiteCondition(
                daysSinceInspection: (int)(hash % (uint)(InspectionOverdueDays + 1)),
                openSafetyActions: (int)(hash % (uint)OpenActionLimit),
                equipmentFault: false);
        }

        /// <summary>
        /// FNV-1a, hand-rolled on purpose: string.GetHashCode is randomised per
        /// process on .NET Core, so building a "seeded" shift on it would give a
        /// different scenario every run -- reproducibility that silently isn't.
        /// </summary>
        private static uint Hash(int seed, string text)
        {
            unchecked
            {
                uint hash = 2166136261u;
                hash = (hash ^ (uint)seed) * 16777619u;
                foreach (char c in text)
                {
                    hash = (hash ^ c) * 16777619u;
                }
                return hash;
            }
        }
    }
}
