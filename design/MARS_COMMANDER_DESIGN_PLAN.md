# Mars Commander — design plan

Design only; no application implementation. Created 13 November 2026.

Figma: https://www.figma.com/design/k5njYduNxFJTkyITCiqeD8

## Challenge alignment

Source: https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/?tab=details

The official challenge asks for an interactive outpost simulation for ages 7–12, teaching trade-offs in life support, radiation shielding, power, food production and communication delay. Our requested audience is 8–14: simple core play supports the younger group; optional science explanations serve older learners. A working prototype is ultimately required; this deliverable covers its visual design.

The challenge encourages real NASA data, source attribution, replayability, plain language and a browser experience without accounts. Archived data is acceptable when labeled honestly. It warns against cost-free safe choices and excessive simultaneous systems.

## Game concept

Keep three astronauts supported through seven Mars days. A Mars day is called a sol; explain this in context. Check supplies, choose one improvement, preview its effect, advance the day, then read a short cause-and-effect explanation. Resource numbers in this design are illustrative game points, not measurements or a validated simulation.

Show oxygen, water and food together as life support, energy as power, and shielding as an event readiness state. This preserves the four requested meters while limiting the number of decision groups. Reveal build choices progressively. Pause during decisions; no countdown pressure.

Examples: improve water recycling at an energy cost; grow food using water and energy; store solar power for darkness; shelter during a radiation alert and lose research time. Sending a message to Earth provides help later, never an instant rescue. Avoid depicting dust as Earth-strength hurricane winds or a DONKI event as a direct measured Mars radiation dose.

## Screen structure

1. Welcome: mission identity, cute crew, colony illustration, Start mission, How to play, no sign-in.
2. Briefing: seven-day objective, three crew members, three action steps, life support / power / protection introduction, communication-delay lesson, launch CTA.
3. Gameplay: large illustrated colony, resource numbers and trends, mission progress, crew guidance, building choices with costs, Next day. All map actions have equivalent labeled cards.
4. Emergency: calm radiation alert, two options with explicit costs, delayed Earth advice, a short science explanation. Frame freezes play; no default action.
5. Results: supportive outcome, mission badges, two concrete decision explanations, learning recap, replay CTA. A retry is a new experiment, never a punishment.

## Visual system

Warm cream #FFF9EF; deep purple ink #30204F; Mars orange #F47847; cyan #38C8DE; yellow #FFD45C; lilac #EEE7FA. Purple text on light bright surfaces, white on deep purple only. Fredoka SemiBold for friendly headings and Nunito Regular/Bold for readable UI. Body 20px, labels 18px, small text 16px. Rounded 16/24/32px geometry, gently raised buttons, playful vector colony art.

Reusable elements: button styles and states, resource cards, building cards, badges, crew guide, colony artwork. Design tokens bind colors, spacing and corners. Actual UI remains editable text, frames, vectors and component instances.

## Accessibility and motion handoff

Use 48–60px controls, visible purple focus rings, text plus icons for status, clear action verbs, no color-only resource warnings, no hover-only information, no timed decisions. Modal must contain keyboard focus and restore it on close; Escape can dismiss the explanation without committing a choice. Announce resource changes in a polite live region. Include accessible names and numeric meter values. Honor reduced motion; optional 150–250ms lift/pop animations must not carry essential meaning. Provide sound and read-aloud controls only when those features are actually implemented. At narrow widths stack resource groups and action cards; preserve all actions and text at zoom. These are implementation requirements, not a claim that Figma itself verifies screen-reader behavior.

## Science and data plan

- DONKI: https://ccmc.gsfc.nasa.gov/tools/DONKI/ — archived solar-event context for a radiation decision. Label the archive date and source. Do not imply a live alert or direct Mars dosimetry.
- OSDR: https://osdr.nasa.gov/bio/repo/ — age-appropriate biological research facts with specific study attribution once selected.
- RadLab: https://visualization.osdr.nasa.gov/radlab/gui/data-api/ — real ISS radiation measurements, with location and limitations explicit; not interchangeable with Mars surface exposure.
- Mars Trek: https://trek.nasa.gov/mars/ — site and terrain reference.

No live dataset is connected in this design. Before implementation, select a small archived dataset, document units and transformations, calibrate the simplified resource model, and preserve source links in the experience. Design previews must remain labeled as practice scenarios.

## Verification scope

Check Figma file access, reusable component instances, editable text/vector layers, font families, image-fill inventory, bounds and composition screenshots. No React code, deployment or existing Figma project modification is part of this task.

## Completed design and verification

- Authentication verified through Figma whoami; student team with Full seat. New file creation, reads and edits succeeded. No setup was needed and no previous project was edited.
- Five requested 1440 × 1024 screens plus an upgrade consequence preview. Frame IDs: Welcome 4:2; Briefing 4:191; Gameplay 4:382; Emergency 4:623; Results 4:671; Upgrade preview 7:633.
- Reusable button variants (default, hover, focus, disabled, secondary), four resource components, three building components, learning badge and editable colony component. Figma vector generation used AI credits; its response timed out, but subsequent inspection confirmed the completed artwork with 124 vector nodes.
- The five requested screens were visually inspected. Revised screens and the upgrade preview passed the final bounds audit with no overflowing auto-layout children. Text uses Fredoka and Nunito. No image-filled nodes occur in the screens; UI and illustration are editable layers.
- Checked contrast: ink on cream 13.87:1; muted text on cream 6.40:1 and lilac 5.57:1; ink on yellow 10.26:1. Oxygen/energy meter colors were strengthened to #137D91 / #B7471F (4.29:1 / 4.72:1 against their tracks). These are targeted visual checks, not a certification of an implemented app.
- Nine prototype navigation links and the Welcome starting point were read back successfully. The demo moves through the five screens; the recycler opens a consequence preview and returns to the base. Battery and greenhouse remain visual concepts. Emergency choices both lead to the illustrative learning summary; the prototype does not calculate a full mission or persist choices.
- Recycler preview arithmetic: build costs 10 energy (58 → 48); recycling adds 12 water per day against 8 consumption (net +4); upkeep adds 4 energy consumption (10 → 14). Next day preview: oxygen 76, water 69, food 69, energy 34.
- Science source links and implementation accessibility notes are included in the Figma handoff frame. Live data, responsive application behavior and screen-reader support remain implementation work.
