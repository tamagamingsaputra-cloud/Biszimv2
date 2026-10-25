# Changelog — BizSim v8.1.0

- Creator production now records its start simulation day and cannot progress or charge costs until a later day tick.
- Added real `uploading` engine stage after review; it stays in the active production queue until complete.
- Added video duration selection and duration-aware production time.
- Added stage-specific icon timeline and progress colors: editing red with scissors; uploading teal with upload-cloud; review amber; completed green.
- Improved mobile overflow behavior for the production timeline.
- Removed redundant Creator Studio “Fitur Lama” tab.
- Added regression tests for day-gated progress, editing/uploading transitions, duration scaling, and duration validation.
- Kept global navigation and other simulation engines intact.
