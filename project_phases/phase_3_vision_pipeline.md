# Phase 3: Multimodal Vision Pipeline (Optional)

**Timeline:** 1-2 weeks (after Phase 2)
**Priority:** Low — only pursue if targeting vision-heavy roles or if momentum is strong
**Status:** Not Started
**Depends On:** Phase 1 (Phase 2 recommended but not required)

---

## Objective

Add a computer vision defect detection pipeline as another tool available to the agent system. This creates a true multimodal system where the agent can reason across both time-series sensor data and visual inspection data. A simulated "video stream" from image sequences feeds detection results into the same agent framework.

## Honest Assessment

This phase uses a **different dataset** (MVTec Anomaly Detection) — not C-MAPSS. It's architecturally a bolt-on, not a natural extension of the turbofan monitoring system. The narrative is: "the same agent framework can also process visual inspection data from the manufacturing floor." This is defensible but less cohesive than Phases 1-2.

**Do this phase if:** You're targeting roles that specifically call out multimodal vision (like Serious AI's "YOLO / segmentation" requirement on line 45) and you have the time.

**Skip this phase if:** Your interview pipeline doesn't emphasize vision, or you'd rather invest the time in polishing Phases 1-2 and the dashboard.

---

## Dataset: MVTec Anomaly Detection

- **Source:** MVTec AD (free for research, widely cited)
- **Contents:** 5,354 high-resolution images across 15 object/texture categories
- **Normal + anomalous:** Each category has defect-free training images and test images with various defect types
- **Use:** Train/evaluate anomaly detection and defect localization models
- **Categories relevant to industrial setting:** metal_nut, screw, grid, tile, transistor

---

## Architecture Addition

### New Agent: Vision Quality Agent

```
[Supervisor Agent]
    |          |          |
    v          v          v
[Diagnostic] [Ops Planning] [Vision Quality
  Agent]      Agent]         Agent]  <-- NEW
                              |
                              v
                           Tools:
                           - defect_detection
                           - inspection_summary
                           - visual_anomaly_history
```

The supervisor gains a third routing option. When the user asks about visual inspections or surface quality, it routes to the Vision Quality Agent.

### New Tools

#### 1. Defect Detection

```python
def defect_detection(image_path: str, component_type: str = "metal_nut") -> dict:
    """
    Runs YOLOv8 detection on an inspection image.
    Output: {
        "image_path": str,
        "component_type": str,
        "defects_found": list[dict],   # [{type, confidence, bbox, area}, ...]
        "is_defective": bool,
        "severity": str,               # "none", "minor", "major", "critical"
        "annotated_image_path": str     # image with bounding boxes
    }
    """
```

#### 2. Inspection Summary

```python
def inspection_summary(unit_id: int, n_recent: int = 10) -> dict:
    """
    Aggregates recent visual inspection results for a unit.
    Output: {
        "unit_id": int,
        "total_inspections": int,
        "defect_rate": float,
        "trend": str,                  # "improving", "stable", "worsening"
        "common_defect_types": list[str],
        "last_inspection": dict
    }
    """
```

#### 3. Visual Anomaly History

```python
def visual_anomaly_history(component_type: str, defect_type: str) -> dict:
    """
    Retrieves historical defect patterns for a component type.
    Output: {
        "component_type": str,
        "defect_type": str,
        "historical_rate": float,
        "typical_severity": str,
        "correlated_sensor_patterns": list[str],  # links back to sensor data
        "recommended_action": str
    }
    """
```

---

## Simulated Video Stream

Instead of actual RTSP infrastructure:

1. MVTec images are organized into sequences simulating an inspection timeline
2. A `StreamSimulator` class yields images at configurable intervals
3. The agent can request "latest inspection frame" or "run batch inspection"
4. Results are stored in PostgreSQL and linked to the knowledge graph (if Phase 2 is done)

```python
class InspectionStreamSimulator:
    """Simulates a visual inspection stream from image sequences."""

    def __init__(self, image_dir: str, interval_seconds: float = 1.0):
        self.images = sorted(Path(image_dir).glob("*.png"))
        self.interval = interval_seconds
        self.current_idx = 0

    def get_next_frame(self) -> tuple[str, dict]:
        """Returns (image_path, metadata) for the next inspection frame."""

    def get_batch(self, n: int) -> list[tuple[str, dict]]:
        """Returns n frames for batch processing."""
```

---

## Model Training

### YOLOv8 Approach
- Use `ultralytics` library for YOLOv8
- Fine-tune on MVTec categories relevant to industrial setting
- Training: ~2 hours on a GPU, or use pre-trained weights with transfer learning
- Evaluation: mAP, precision/recall on MVTec test set

### Alternative: Anomaly Detection Approach
- If YOLOv8 training is too heavy, use a simpler approach:
- PatchCore or similar unsupervised anomaly detection (train on normal images only)
- Advantages: no labeling needed, better matches "anomaly detection" framing
- `anomalib` library provides multiple methods out of the box

---

## Day-by-Day Plan

### Day 1-2: Dataset + Model
- [ ] Download MVTec AD dataset
- [ ] Exploratory analysis: visualize defect types, class distribution
- [ ] Train YOLOv8 (or PatchCore) on selected categories
- [ ] Evaluate detection performance

### Day 3-4: Tool Functions + Stream Simulator
- [ ] Implement `defect_detection()` wrapping the trained model
- [ ] Implement `inspection_summary()` and `visual_anomaly_history()`
- [ ] Build `InspectionStreamSimulator`
- [ ] Add `inspection_results` table to PostgreSQL
- [ ] Unit tests

### Day 5-6: Agent Integration
- [ ] Create Vision Quality Agent
- [ ] Update supervisor routing to include vision intent
- [ ] Link visual inspections to knowledge graph (if Phase 2 done)
- [ ] Cross-modal reasoning: correlate visual defects with sensor anomalies
- [ ] Integration tests

### Day 7: Polish
- [ ] Update README and architecture diagram
- [ ] Demo showing multimodal agent interaction
- [ ] Notebook with model evaluation and example detections

---

## Tech Stack Additions

| Component | Technology |
|-----------|-----------|
| Object Detection | YOLOv8 (ultralytics) |
| Alternative | PatchCore (anomalib) |
| Image Processing | OpenCV, Pillow |

---

## Resume Bullet (What This Phase Adds)

> Integrated a multimodal vision pipeline using YOLOv8 for manufacturing defect detection, enabling the agent to reason across both time-series sensor data and visual inspection results

---

## JD Requirements Addressed

| JD Line | Requirement | How Phase 3 Addresses It |
|---------|------------|--------------------------|
| 31 | "Built multimodal AI pipelines combining vision with structured operational data" | Core deliverable |
| 41 | "Vision Quality... agents" | Vision Quality Agent |
| 45 | "YOLO / segmentation" | YOLOv8 defect detection |
