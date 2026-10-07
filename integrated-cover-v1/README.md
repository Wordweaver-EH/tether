# Integrated Cover 2026-10-07 original retained outputs

The fixed run logged 40 per-bout metric records, aggregate totals, up to five short decision examples per bout, source hashes, and hashes of each complete command stream and final world. It did NOT retain raw per-tick percepts, input frames, world frames, or full mind traces. These cannot be reconstructed from hashes alone; the pinned deterministic source and runner can rerun the experiment. summary.json is the full original retained result, not the reduced publication summary. No missing frames are implied.

Protocol fixed locally before inspecting outcomes; not Git-preregistered. Runtime bytes match code checkpoint 240c84451b23dd1ef0c853d764dd2d09d940488c. No runtime edits followed outcome inspection.

The transport is lossless base64 of a deterministic gzip-compressed tar archive. Decode TRANSPORT.base64.txt, verify transport archive SHA-256 in MANIFEST.json, then extract and verify every member. Source identities are also included inside the run output.
