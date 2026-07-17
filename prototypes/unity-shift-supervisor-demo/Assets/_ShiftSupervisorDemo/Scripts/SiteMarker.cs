using UnityEngine;
using UnityEngine.Events;

namespace WAMining.ShiftSupervisorDemo
{
    /// <summary>
    /// A single clickable site marker in the scene. Color reflects stage,
    /// matching the same idea as the Dashboard's stage breakdown chart in
    /// the main app -- just rendered spatially instead of as a bar chart.
    ///
    /// Click detection uses Unity's built-in OnMouseDown (requires a
    /// Collider on this object) rather than a hand-rolled raycast --
    /// there's no reason to reimplement what the engine already does.
    /// </summary>
    [RequireComponent(typeof(Renderer))]
    [RequireComponent(typeof(Collider))]
    public class SiteMarker : MonoBehaviour
    {
        [SerializeField] private SiteInfo siteInfo;

        /// <summary>Raised with this marker's SiteInfo when clicked.</summary>
        public UnityEvent<SiteInfo> onSelected = new UnityEvent<SiteInfo>();

        private Renderer _renderer;

        private static readonly Color OperatingColor = new Color(0.2f, 0.7f, 0.3f);
        private static readonly Color CareAndMaintenanceColor = new Color(0.9f, 0.7f, 0.1f);
        private static readonly Color OtherStageColor = new Color(0.6f, 0.2f, 0.2f);

        public SiteInfo Info => siteInfo;

        private void Awake()
        {
            _renderer = GetComponent<Renderer>();
        }

        public void Configure(SiteInfo info)
        {
            siteInfo = info;
            gameObject.name = $"SiteMarker_{info.siteCode}";
            ApplyStageColor();
        }

        private void ApplyStageColor()
        {
            if (_renderer == null || siteInfo == null) return;

            Color color = siteInfo.stage switch
            {
                "Operating" => OperatingColor,
                "Care And Maintenance" => CareAndMaintenanceColor,
                _ => OtherStageColor,
            };

            _renderer.material.color = color;
        }

        private void OnMouseDown()
        {
            onSelected.Invoke(siteInfo);
        }
    }
}
