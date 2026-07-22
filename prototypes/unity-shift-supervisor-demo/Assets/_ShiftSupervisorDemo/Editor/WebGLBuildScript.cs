using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace WAMining.ShiftSupervisorDemo.EditorTools
{
    /// <summary>
    /// Headless WebGL build entry point, so the shareable build is produced
    /// by a repeatable command instead of remembered Editor clicks:
    ///
    ///   Unity.exe -batchmode -nographics -quit
    ///             -projectPath &lt;this folder&gt;
    ///             -buildTarget WebGL
    ///             -executeMethod WAMining.ShiftSupervisorDemo.EditorTools.WebGLBuildScript.Build
    ///
    /// Lives in an Editor/ folder, so none of this ships in the player.
    /// </summary>
    public static class WebGLBuildScript
    {
        // Kept out of Assets/ so Unity never tries to import the build
        // output as assets; .gitignore already excludes Builds/.
        private const string OutputDir = "Builds/WebGL";

        private const string ScenePath =
            "Assets/_ShiftSupervisorDemo/Scenes/ShiftSupervisorDemo.unity";

        public static void Build()
        {
            // Uncompressed output on purpose: Brotli/gzip-compressed WebGL
            // files need exact Content-Encoding headers from the host to
            // load at all, which couples the build to hosting config. The
            // whole demo is a few MB -- reliability beats transfer size.
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;

            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = OutputDir,
                target = BuildTarget.WebGL,
                options = BuildOptions.None,
            });

            BuildSummary summary = report.summary;
            Debug.Log(
                $"[WebGLBuildScript] result={summary.result} " +
                $"totalSize={summary.totalSize} bytes " +
                $"errors={summary.totalErrors} " +
                $"duration={summary.totalTime}");

            // Non-zero exit so a failed build fails the invoking command,
            // rather than only whispering into the log file.
            if (summary.result != BuildResult.Succeeded)
            {
                EditorApplication.Exit(1);
            }
        }
    }
}
