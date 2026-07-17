using UnityEngine;

namespace WAMining.ShiftSupervisorDemo
{
    /// <summary>
    /// Loads the bundled sample site JSON at startup. No networking, no
    /// backend calls -- intentionally static for this prototype.
    /// </summary>
    public class SiteDatabase : MonoBehaviour
    {
        [Tooltip("Assign Assets/_ShiftSupervisorDemo/Data/sites_sample.json")]
        [SerializeField] private TextAsset sitesJson;

        public SiteInfo[] Sites { get; private set; } = System.Array.Empty<SiteInfo>();

        private void Awake()
        {
            if (sitesJson == null)
            {
                Debug.LogWarning($"{nameof(SiteDatabase)}: no sitesJson assigned; no sites will be loaded.");
                return;
            }

            var collection = JsonUtility.FromJson<SiteInfoCollection>(sitesJson.text);
            Sites = collection?.sites ?? System.Array.Empty<SiteInfo>();
        }
    }
}
