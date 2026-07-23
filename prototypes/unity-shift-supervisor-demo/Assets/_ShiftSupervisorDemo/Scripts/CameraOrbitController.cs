using UnityEngine;
using UnityEngine.EventSystems;

namespace WAMining.ShiftSupervisorDemo
{
    /// <summary>
    /// Minimal orbit camera for looking around the site layout: left-mouse
    /// drag to rotate, scroll wheel to zoom. No physics, no VR/XR headset
    /// input -- just enough to explore a small scene from a desktop.
    ///
    /// Ignores input while the pointer is over UI: without that guard,
    /// every scenario-button click also spun the world behind the panels
    /// (found by the I2 WebGL click-through, not in the Editor).
    /// </summary>
    public class CameraOrbitController : MonoBehaviour
    {
        [SerializeField] private Transform target;
        [SerializeField] private float rotateSpeed = 120f;
        [SerializeField] private float zoomSpeed = 5f;
        [SerializeField] private float minDistance = 3f;
        [SerializeField] private float maxDistance = 25f;

        private float _distance = 10f;
        private float _yaw;
        private float _pitch = 30f;

        private void Start()
        {
            if (target == null)
            {
                target = new GameObject("OrbitTarget").transform;
            }
            UpdateCameraTransform();
        }

        private void Update()
        {
            bool pointerOverUi = EventSystem.current != null
                && EventSystem.current.IsPointerOverGameObject();
            if (pointerOverUi) return;

            if (Input.GetMouseButton(0))
            {
                _yaw += Input.GetAxis("Mouse X") * rotateSpeed * Time.deltaTime;
                _pitch -= Input.GetAxis("Mouse Y") * rotateSpeed * Time.deltaTime;
                _pitch = Mathf.Clamp(_pitch, 5f, 80f);
            }

            _distance -= Input.mouseScrollDelta.y * zoomSpeed;
            _distance = Mathf.Clamp(_distance, minDistance, maxDistance);

            UpdateCameraTransform();
        }

        private void UpdateCameraTransform()
        {
            var rotation = Quaternion.Euler(_pitch, _yaw, 0f);
            var position = target.position + rotation * new Vector3(0f, 0f, -_distance);
            transform.SetPositionAndRotation(position, Quaternion.LookRotation(target.position - position));
        }
    }
}
