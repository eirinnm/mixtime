# Mixtime

A browser-based DJ set duration calculator for [rekordbox](https://rekordbox.com/) collections.

**[Open Mixtime → eirinnm.github.io/mixtime](https://eirinnm.github.io/mixtime/)**

No installation required — runs entirely in your browser.

## Usage

1. Go to **[eirinnm.github.io/mixtime](https://eirinnm.github.io/mixtime/)**.
2. Export your rekordbox collection: **File → Export Collection in xml format**.
3. Drag and drop the exported XML file onto the Mixtime window, or click **Browse for file**.
4. Browse your playlists in the left panel and click one to view its tracks.
5. Check the tracks you plan to play in your set.
6. The summary bar at the bottom shows the estimated duration of your selection.

## Duration estimates

Three duration values are shown for the selected tracks:

| Metric | Description |
|---|---|
| **Total duration** | Simple sum of full track lengths, ignoring any cue points. |
| **Active duration** | Sum of each track's *active section* (between its entry and exit marks — see below). This is the best estimate of how long you will actually play each track. |
| **Performance BPM duration** | The active duration adjusted for the tempo at which you intend to play the set. Enter your target BPM in the field on the right. Tracks are scaled proportionally: a track with an average BPM of 120 played at a performance BPM of 130 will last approximately 120/130 × its active duration. Tracks with no BPM data are included at their native active duration. |

## Entry and exit mark logic

The *active section* of a track is the portion between its **entry mark** and **exit mark**. These are derived from the cue points and loop markers you have set in rekordbox.

Both regular cue points (`Type 0`) and loop markers (`Type 4`) are considered. As in rekordbox, a **memory marker** has no colour slot assigned (internal `Num = -1`), while a **hot cue** occupies a labelled slot (A–H, internal `Num = 0–7`).

### Entry mark

The entry mark represents the point where you would typically bring the track in during a mix.

1. Find all memory markers in the **first half** of the track. If any exist, the entry mark is the **earliest** one.
2. If there are no memory markers in the first half, find all hot cues in the first half. The entry mark is the **earliest** one.
3. If neither is found, the entry mark is the **start of the track** (0:00).

### Exit mark

The exit mark represents the point by which you would typically have transitioned out of the track.

1. Find all memory markers in the **second half** of the track. If any exist, the exit mark is the **last** one.
2. If there are no memory markers in the second half, find all hot cues in the second half. The exit mark is the **first** one.
3. If neither is found, the exit mark is the **end of the track**.

### Track view

Each track row displays a horizontal bar showing the structure of the track at a fixed scale of 12 minutes:

- **Red** — the section before the entry mark
- **Green** — the active section (entry to exit)
- **Red** — the section after the exit mark

This gives a quick visual sense of how much of each track is "used" and how track lengths compare to one another.

## Notes

- All processing happens locally in your browser. No data is uploaded anywhere.
- Tracks that appear in multiple playlists share the same parsed cue data from the collection.
- A track may appear more than once in a single rekordbox playlist; Mixtime handles this correctly.
