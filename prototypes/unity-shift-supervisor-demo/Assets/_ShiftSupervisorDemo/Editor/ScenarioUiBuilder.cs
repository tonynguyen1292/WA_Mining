using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;

namespace WAMining.ShiftSupervisorDemo.EditorTools
{
    /// <summary>
    /// Builds the Inspection Round UI (spec F2–F6) into the demo scene and
    /// wires the scenario controllers — the same executable-steps-not-mouse-
    /// clicks philosophy as the original SceneBuilder (see DECISIONS.md).
    /// Unlike that one-shot script, this one is committed and idempotent
    /// (it replaces its own previous output), because v2's increments keep
    /// iterating the scene: I3 re-runs and extends it.
    ///
    /// Headless: -executeMethod WAMining.ShiftSupervisorDemo.EditorTools.ScenarioUiBuilder.Build
    /// </summary>
    public static class ScenarioUiBuilder
    {
        private const string ScenePath =
            "Assets/_ShiftSupervisorDemo/Scenes/ShiftSupervisorDemo.unity";

        private const string UiRootName = "ScenarioUI";
        private const string ControllerName = "ScenarioController";

        [MenuItem("Tools/WA Mining Demo/Build Scenario UI")]
        public static void Build()
        {
            try
            {
                BuildInternal();
            }
            catch (System.Exception ex)
            {
                Debug.LogError($"[ScenarioUiBuilder] FAILED: {ex}");
                if (Application.isBatchMode) EditorApplication.Exit(1);
                throw;
            }
        }

        private static void BuildInternal()
        {
            var scene = EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);

            // Idempotency: replace any previous output wholesale.
            foreach (var name in new[] { UiRootName, ControllerName })
            {
                var existing = GameObject.Find(name);
                if (existing != null) Object.DestroyImmediate(existing);
            }

            var canvas = Object.FindFirstObjectByType<Canvas>();
            if (canvas == null) throw new System.InvalidOperationException("Scene has no Canvas.");
            var database = Object.FindFirstObjectByType<SiteDatabase>();
            if (database == null) throw new System.InvalidOperationException("Scene has no SiteDatabase.");

            var font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            var uiSprite = AssetDatabase.GetBuiltinExtraResource<Sprite>("UI/Skin/UISprite.psd");
            var bgSprite = AssetDatabase.GetBuiltinExtraResource<Sprite>("UI/Skin/Background.psd");

            var root = CreateRect(UiRootName, canvas.transform);
            Stretch(root);

            // --- HUD (F4): top-center strip -----------------------------
            var hud = CreatePanel("Hud", root, bgSprite, new Color(0.10f, 0.12f, 0.11f, 0.85f));
            Anchor(hud, new Vector2(0.5f, 1f), new Vector2(0, -28), new Vector2(640, 36));
            var hudText = CreateText("HudText", hud.transform, font, 18, TextAnchor.MiddleCenter, Color.white);
            Stretch((RectTransform)hudText.transform);

            // --- Briefing card (F2): center -----------------------------
            var briefing = CreatePanel("BriefingPanel", root, bgSprite, new Color(0.13f, 0.15f, 0.14f, 0.96f));
            Anchor(briefing, new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(560, 260));
            var bTitle = CreateText("Title", briefing.transform, font, 22, TextAnchor.MiddleCenter, Color.white);
            bTitle.fontStyle = FontStyle.Bold;
            bTitle.text = "Shift briefing";
            Anchor((RectTransform)bTitle.transform, new Vector2(0.5f, 1f), new Vector2(0, -34), new Vector2(480, 34));
            var bBody = CreateText("Body", briefing.transform, font, 15, TextAnchor.UpperCenter, new Color(0.9f, 0.92f, 0.9f));
            bBody.text = "Visit every site in order and log its status.\nFlag anything that is not operating cleanly —\nthe shift report will show what you caught.";
            Anchor((RectTransform)bBody.transform, new Vector2(0.5f, 0.5f), new Vector2(0, 14), new Vector2(490, 100));
            var startBtn = CreateButton("StartButton", briefing.transform, uiSprite, font, "Start shift",
                new Color(0.17f, 0.45f, 0.75f), Color.white);
            Anchor((RectTransform)startBtn.transform, new Vector2(0.5f, 0f), new Vector2(0, 56), new Vector2(200, 48));

            // --- Decision panel (F3): bottom-center ---------------------
            var decision = CreatePanel("DecisionPanel", root, bgSprite, new Color(0.13f, 0.15f, 0.14f, 0.96f));
            Anchor(decision, new Vector2(0.5f, 0f), new Vector2(0, 110), new Vector2(760, 140));
            var prompt = CreateText("Prompt", decision.transform, font, 15, TextAnchor.MiddleCenter, Color.white);
            Anchor((RectTransform)prompt.transform, new Vector2(0.5f, 1f), new Vector2(0, -24), new Vector2(720, 30));

            var choiceRow = CreateRect("ChoiceRow", decision.transform);
            Stretch(choiceRow);
            var okBtn = CreateButton("LogOkButton", choiceRow, uiSprite, font, "Log OK",
                new Color(0.20f, 0.55f, 0.30f), Color.white);
            Anchor((RectTransform)okBtn.transform, new Vector2(0.5f, 0f), new Vector2(-100, 30), new Vector2(180, 44));
            var flagBtn = CreateButton("FlagIssueButton", choiceRow, uiSprite, font, "Flag issue...",
                new Color(0.75f, 0.50f, 0.12f), Color.white);
            Anchor((RectTransform)flagBtn.transform, new Vector2(0.5f, 0f), new Vector2(100, 30), new Vector2(180, 44));

            var reasonRow = CreateRect("ReasonRow", decision.transform);
            Stretch(reasonRow);
            var safetyBtn = CreateButton("ReasonSafety", reasonRow, uiSprite, font, "Safety",
                new Color(0.72f, 0.25f, 0.20f), Color.white);
            Anchor((RectTransform)safetyBtn.transform, new Vector2(0.5f, 0f), new Vector2(-248, 30), new Vector2(150, 40));
            var equipBtn = CreateButton("ReasonEquipment", reasonRow, uiSprite, font, "Equipment",
                new Color(0.72f, 0.45f, 0.15f), Color.white);
            Anchor((RectTransform)equipBtn.transform, new Vector2(0.5f, 0f), new Vector2(-83, 30), new Vector2(150, 40));
            var outputBtn = CreateButton("ReasonOutput", reasonRow, uiSprite, font, "Output",
                new Color(0.55f, 0.45f, 0.20f), Color.white);
            Anchor((RectTransform)outputBtn.transform, new Vector2(0.5f, 0f), new Vector2(83, 30), new Vector2(150, 40));
            var backBtn = CreateButton("ReasonBack", reasonRow, uiSprite, font, "< Back",
                new Color(0.35f, 0.38f, 0.36f), Color.white);
            Anchor((RectTransform)backBtn.transform, new Vector2(0.5f, 0f), new Vector2(248, 30), new Vector2(150, 40));
            reasonRow.gameObject.SetActive(false);

            // --- Summary (F5/F6): center card ---------------------------
            var summary = CreatePanel("SummaryPanel", root, bgSprite, new Color(0.13f, 0.15f, 0.14f, 0.97f));
            Anchor(summary, new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(640, 460));
            var sTitle = CreateText("Title", summary.transform, font, 22, TextAnchor.MiddleCenter, Color.white);
            sTitle.fontStyle = FontStyle.Bold;
            sTitle.text = "End of shift";
            Anchor((RectTransform)sTitle.transform, new Vector2(0.5f, 1f), new Vector2(0, -34), new Vector2(560, 34));
            var sBody = CreateText("Body", summary.transform, font, 14, TextAnchor.UpperLeft, new Color(0.92f, 0.94f, 0.92f));
            Anchor((RectTransform)sBody.transform, new Vector2(0.5f, 0.5f), new Vector2(0, 5), new Vector2(560, 310));
            var restartBtn = CreateButton("RestartButton", summary.transform, uiSprite, font, "Restart shift",
                new Color(0.17f, 0.45f, 0.75f), Color.white);
            Anchor((RectTransform)restartBtn.transform, new Vector2(0.5f, 0f), new Vector2(0, 30), new Vector2(200, 48));

            // --- View component on the UI root, fields wired ------------
            var view = root.gameObject.AddComponent<ScenarioUIController>();
            var so = new SerializedObject(view);
            so.FindProperty("briefingPanel").objectReferenceValue = briefing.gameObject;
            so.FindProperty("startButton").objectReferenceValue = startBtn;
            so.FindProperty("hudRoot").objectReferenceValue = hud.gameObject;
            so.FindProperty("hudText").objectReferenceValue = hudText;
            so.FindProperty("decisionPanel").objectReferenceValue = decision.gameObject;
            so.FindProperty("decisionPrompt").objectReferenceValue = prompt;
            so.FindProperty("choiceRow").objectReferenceValue = choiceRow.gameObject;
            so.FindProperty("logOkButton").objectReferenceValue = okBtn;
            so.FindProperty("flagIssueButton").objectReferenceValue = flagBtn;
            so.FindProperty("reasonRow").objectReferenceValue = reasonRow.gameObject;
            so.FindProperty("reasonSafetyButton").objectReferenceValue = safetyBtn;
            so.FindProperty("reasonEquipmentButton").objectReferenceValue = equipBtn;
            so.FindProperty("reasonOutputButton").objectReferenceValue = outputBtn;
            so.FindProperty("reasonBackButton").objectReferenceValue = backBtn;
            so.FindProperty("summaryPanel").objectReferenceValue = summary.gameObject;
            so.FindProperty("summaryBody").objectReferenceValue = sBody;
            so.FindProperty("restartButton").objectReferenceValue = restartBtn;
            so.ApplyModifiedPropertiesWithoutUndo();

            // Panels start hidden; the controller decides what shows.
            briefing.gameObject.SetActive(false);
            hud.gameObject.SetActive(false);
            decision.gameObject.SetActive(false);
            summary.gameObject.SetActive(false);

            // --- Bridge controller --------------------------------------
            var controllerGo = new GameObject(ControllerName);
            var bridge = controllerGo.AddComponent<ShiftScenarioController>();
            var bridgeSo = new SerializedObject(bridge);
            bridgeSo.FindProperty("siteDatabase").objectReferenceValue = database;
            bridgeSo.FindProperty("view").objectReferenceValue = view;
            bridgeSo.ApplyModifiedPropertiesWithoutUndo();

            EditorSceneManager.MarkSceneDirty(scene);
            if (!EditorSceneManager.SaveScene(scene))
                throw new System.InvalidOperationException("SaveScene failed.");

            // Verification, not assumption (house rule): re-check a wired
            // reference actually resolved before declaring success.
            var check = new SerializedObject(view).FindProperty("restartButton").objectReferenceValue;
            if (check == null) throw new System.InvalidOperationException("Wiring check failed: restartButton is null.");

            Debug.Log("[ScenarioUiBuilder] Scenario UI built and wired; scene saved.");
            if (Application.isBatchMode) EditorApplication.Exit(0);
        }

        // --- helpers ----------------------------------------------------

        private static RectTransform CreateRect(string name, Transform parent)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return (RectTransform)go.transform;
        }

        private static RectTransform CreatePanel(string name, Transform parent, Sprite sprite, Color color)
        {
            var rect = CreateRect(name, parent);
            var image = rect.gameObject.AddComponent<Image>();
            image.sprite = sprite;
            image.type = Image.Type.Sliced;
            image.color = color;
            return rect;
        }

        private static Text CreateText(string name, Transform parent, Font font, int size, TextAnchor align, Color color)
        {
            var rect = CreateRect(name, parent);
            var text = rect.gameObject.AddComponent<Text>();
            text.font = font;
            text.fontSize = size;
            text.alignment = align;
            text.color = color;
            return text;
        }

        private static Button CreateButton(string name, Transform parent, Sprite sprite, Font font,
            string label, Color background, Color textColor)
        {
            var rect = CreatePanel(name, parent, sprite, background);
            var button = rect.gameObject.AddComponent<Button>();
            button.targetGraphic = rect.GetComponent<Image>();
            var text = CreateText("Label", rect, font, 16, TextAnchor.MiddleCenter, textColor);
            Stretch((RectTransform)text.transform);
            text.text = label;
            return button;
        }

        private static void Anchor(RectTransform rect, Vector2 anchor, Vector2 position, Vector2 size)
        {
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = anchor;
            rect.anchoredPosition = position;
            rect.sizeDelta = size;
        }

        private static void Stretch(RectTransform rect)
        {
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
        }
    }
}
