using System;

namespace WAMining.ShiftSupervisorDemo
{
    /// <summary>
    /// Minimal, flat representation of a mining site for the demo.
    /// Deliberately mirrors a handful of fields from the real `sites` table
    /// (see backend/app/models/site.py) for narrative continuity only --
    /// this is a static local snapshot, not a live sync with that API.
    /// </summary>
    [Serializable]
    public class SiteInfo
    {
        public string siteCode;
        public string title;
        public string siteType;
        public string stage;
        public string commodity;
        public string region;
    }

    /// <summary>Wrapper so JsonUtility can parse a top-level JSON array.</summary>
    [Serializable]
    public class SiteInfoCollection
    {
        public SiteInfo[] sites;
    }
}
