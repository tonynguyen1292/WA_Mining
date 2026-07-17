using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace WAMining.ShiftSupervisorDemo
{
    /// <summary>
    /// Spawns one SiteMarker per entry in SiteDatabase and shows a simple
    /// info panel (legacy UGUI Text, not TextMeshPro -- no extra package
    /// import needed) when one is clicked.
    /// </summary>
    public class ShiftSupervisorUIController : MonoBehaviour
    {
        [Header("Data / Spawning")]
        [SerializeField] private SiteDatabase siteDatabase;
        [SerializeField] private SiteMarker siteMarkerPrefab;
        [SerializeField] private Transform siteMarkerParent;
        [SerializeField] private float spacing = 3f;

        [Header("Info Panel")]
        [SerializeField] private GameObject infoPanel;
        [SerializeField] private Text titleText;
        [SerializeField] private Text detailsText;

        private readonly List<SiteMarker> _spawnedMarkers = new List<SiteMarker>();

        private void Start()
        {
            if (infoPanel != null) infoPanel.SetActive(false);
            SpawnMarkers();
        }

        private void SpawnMarkers()
        {
            if (siteDatabase == null || siteMarkerPrefab == null)
            {
                Debug.LogWarning($"{nameof(ShiftSupervisorUIController)}: siteDatabase or siteMarkerPrefab not assigned.");
                return;
            }

            var sites = siteDatabase.Sites;
            for (int i = 0; i < sites.Length; i++)
            {
                var marker = Instantiate(siteMarkerPrefab, siteMarkerParent);
                marker.transform.localPosition = new Vector3(i * spacing, 0f, 0f);
                marker.Configure(sites[i]);
                marker.onSelected.AddListener(ShowSiteInfo);
                _spawnedMarkers.Add(marker);
            }
        }

        private void ShowSiteInfo(SiteInfo info)
        {
            if (infoPanel == null) return;

            infoPanel.SetActive(true);
            if (titleText != null) titleText.text = info.title;
            if (detailsText != null)
            {
                detailsText.text =
                    $"Site code: {info.siteCode}\n" +
                    $"Type: {info.siteType}\n" +
                    $"Stage: {info.stage}\n" +
                    $"Commodity: {info.commodity}\n" +
                    $"Region: {info.region}";
            }
        }
    }
}
