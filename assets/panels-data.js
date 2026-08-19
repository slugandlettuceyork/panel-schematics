/**
 * PANELS-DATA.JS
 * ----------------------------------------------------------------
 * This file is the master list of boards and circuits (breakers).
 * It is edited BY A DEVELOPER (not through the site's password),
 * because it defines the physical schematic layout.
 *
 * Day-to-day "where does this go / what's on it" notes are stored
 * in Supabase and edited on the live site with the shared password
 * — see assets/app.js and supabase-schema.sql.
 *
 * TO ADD A NEW PANEL LATER:
 *   1. Copy one of the blocks below (e.g. PANELS['bar-kitchen'])
 *   2. Give it a new unique slug (the object key), a title, and
 *      circuits[]
 *   3. It will automatically appear on index.html and be reachable
 *      at panel.html?p=your-new-slug — no other file needs to change.
 *
 * FIELD NOTES:
 *   position     - the number/ID printed or handwritten by the breaker
 *   label        - the printed/typed label as read from the photo
 *   phase        - 'R' | 'Y' | 'B' | null  (colour-coded phase marker)
 *   side         - 'L' | 'R' (which physical column, for layout only)
 *   flag         - true if the reading is uncertain / handwritten /
 *                  overlapping text and should be double-checked
 *   flagNote     - what's uncertain about it
 */

const PANELS = {

  "bar-kitchen": {
    title: "Bar & Kitchen Distribution Board",
    subtitle: "MERLIN GERIN — 400V — read from panel photo 1",
    photoRef: "1000031774.jpg",
    circuits: [
      { position: "L1",  side: "L", phase: "R", label: "Staff Room Lights" },
      { position: "L2",  side: "L", phase: "Y", label: "Bar Power" },
      { position: "L3",  side: "L", phase: "B", label: "Staff Room Sockets" },
      { position: "L4",  side: "L", phase: "R", label: "(no printed label)", flag: true, flagNote: "Handwritten 'MICROWAVE' near this breaker — position uncertain, verify which breaker it refers to." },
      { position: "L5",  side: "L", phase: "Y", label: "Bar Power" },
      { position: "L6",  side: "L", phase: "B", label: "Corridor Lights" },
      { position: "L6b", side: "L", phase: "R", label: "(no printed label)" },
      { position: "L7",  side: "L", phase: "Y", label: "Spot Lights", flag: true, flagNote: "Handwritten note nearby: 'IN LINE COOLER SKT'S' — may relate to this or a neighbouring circuit." },
      { position: "L8",  side: "L", phase: "B", label: "EMG Lights — Main Bar", flag: true, flagNote: "Handwritten overlay partly illegible." },
      { position: "L9",  side: "L", phase: "R", label: "Gents + Ladies Lights" },
      { position: "L10", side: "L", phase: "Y", label: "(no printed label)", flag: true, flagNote: "Handwritten 'MICROWAVE 2' near this breaker — verify." },
      { position: "L11", side: "L", phase: "B", label: "Kitchen Lights", flag: true, flagNote: "Printed label partly crossed out / overwritten by hand." },
      { position: "L12", side: "L", phase: "R", label: "Cellar Lights" },
      { position: "L13", side: "L", phase: "Y", label: "Spot Lights" },
      { position: "L14", side: "L", phase: "B", label: "EMG Lights", flag: true, flagNote: "Handwritten annotation above label is illegible." },
      { position: "L15", side: "L", phase: "R", label: "Dishwasher" },
      { position: "L16", side: "L", phase: "Y", label: "Dishwasher" },
      { position: "L17", side: "L", phase: "B", label: "Dishwasher" },

      { position: "R0",  side: "R", phase: "R", label: "(no printed label)" },
      { position: "R1",  side: "R", phase: "Y", label: "Signs" },
      { position: "R2",  side: "R", phase: "B", label: "Lighting" },
      { position: "R2b", side: "R", phase: "R", label: "(no printed label)" },
      { position: "R3",  side: "R", phase: "Y", label: "Hand Dryer — Ladies" },
      { position: "R4",  side: "R", phase: "B", label: "Hand Dryer — Gents" },
      { position: "R5",  side: "R", phase: "R", label: "Coffee Grinder" },
      { position: "R6",  side: "R", phase: "Y", label: "Coffee Grinder" },
      { position: "R7",  side: "R", phase: "B", label: "Coffee Grinder" },
      { position: "R8",  side: "R", phase: "R", label: "Glasswash" },
      { position: "R9",  side: "R", phase: "Y", label: "Contactor for Signs" },
      { position: "R10", side: "R", phase: "B", label: "Insectocutors" },
      { position: "R11", side: "R", phase: "R", label: "Kitchen Ring" },
      { position: "R12", side: "R", phase: "Y", label: "Kitchen Ring" },
      { position: "R13", side: "R", phase: "B", label: "Bottle Room Ring" },
      { position: "R14", side: "R", phase: "R", label: "Bar Ring" },
      { position: "R15", side: "R", phase: "Y", label: "Bar Ring" },
      { position: "R16", side: "R", phase: "B", label: "EMG Lights" },
    ]
  },

  "cellar-b": {
    title: "Distribution Board B — Cellar Plant",
    subtitle: "MERLIN GERIN — 400V — read from panel photo 2. Handwritten top-right: \"NEW CELLAR 'DB' 'E'\" — may be an alternate name for this board.",
    photoRef: "1000031777.jpg",
    circuits: [
      { position: "L1", side: "L", phase: "R", label: "Distribution Board B (incomer)", flag: true, flagNote: "Handwritten note: 'CLEAN POWER' — verify this is the correct description." },
      { position: "L2", side: "L", phase: "Y", label: "Walk In Freezer", flag: true, flagNote: "Handwritten note: 'Walk in Fridge, Kitchen +' — may feed more than the freezer." },
      { position: "L3", side: "L", phase: "B", label: "Mealstream", flag: true, flagNote: "Handwritten note: 'Millstream +, Cellar' — spelling/scope uncertain." },
      { position: "L4", side: "L", phase: "R", label: "Beer Master" },
      { position: "L5", side: "L", phase: "Y", label: "Beer Master" },
      { position: "L6", side: "L", phase: "B", label: "Beer Master" },
      { position: "L7", side: "L", phase: "R", label: "Beer Master" },

      { position: "R1", side: "R", phase: "R", label: "Supply to 100A HVAC Panel MCB" },
      { position: "R2", side: "R", phase: "Y", label: "Supply to 100A HVAC Panel MCB" },
      { position: "R3", side: "R", phase: "B", label: "Supply to 100A HVAC Panel MCB" },
      { position: "R4", side: "R", phase: "R", label: "Supply to 100A DB A MCB" },
      { position: "R5", side: "R", phase: "Y", label: "Supply to 100A DB A MCB" },
      { position: "R6", side: "R", phase: "B", label: "Supply to 100A DB A MCB" },
    ]
  },

  "office-comms": {
    title: "Office / Comms Distribution Board",
    subtitle: "Multi 9 disconnector 100A — read from panel photo 3. Board name not clearly visible in photo (top-right shows partial 'COMS CAB' label) — please confirm/rename.",
    photoRef: "1000031775.jpg",
    circuits: [
      { position: "1",  side: "L", phase: null, label: "Office Ring" },
      { position: "2",  side: "L", phase: null, label: "Cct. Unidentified", flag: true, flagNote: "Handwritten above label: 'FIRE ALARM' — conflicts with typed 'unidentified', and with position 6 below also reading Fire Alarm. Verify which breaker is actually the fire alarm." },
      { position: "3",  side: "L", phase: null, label: "Cct. Unidentified" },
      { position: "4",  side: "L", phase: null, label: "Cct. Unidentified", flag: true, flagNote: "Handwritten note, possibly '1 no.' or similar — illegible." },
      { position: "5",  side: "L", phase: null, label: "Cct. Unidentified" },
      { position: "6",  side: "L", phase: null, label: "Fire Alarm" },
      { position: "7",  side: "L", phase: null, label: "Music Power" },
      { position: "8",  side: "L", phase: null, label: "Cct. Unidentified", flag: true, flagNote: "Handwritten note, partly illegible (looks like a name/initials)." },
      { position: "9",  side: "L", phase: null, label: "Kitchen Sockets on Canopy x2" },
      { position: "10", side: "L", phase: null, label: "Kitchen Ceiling Sockets x2" },
      { position: "11", side: "L", phase: null, label: "Cct. Single Sockets — Office Radial" },
      { position: "12", side: "L", phase: null, label: "Office EPOS Power" },
    ]
  },

  "mains-hvac-dba": {
    title: "Mains Incomers — HVAC Panel & Distribution Board A",
    subtitle: "MERLIN GERIN — read from panel photo 4. Inspected by heb Group (Sheffield), last inspection 6-2-19.",
    photoRef: "1000031776.jpg",
    circuits: [
      { position: "1", side: "L", phase: null, label: "HVAC Panel — 100A triple-pole incomer" },
      { position: "2", side: "L", phase: null, label: "Distribution Board A — 100A triple-pole incomer" },
      { position: "3", side: "L", phase: null, label: "Kitchen Fryer", flag: true, flagNote: "Two breakers (C16 + C40) grouped under one 'Kitchen Fryer' label, plus illegible handwritten notes alongside — verify which pole does what." },
    ]
  },

};

// Helper: flat list of every circuit across every panel, for global search
function getAllCircuitsFlat() {
  const out = [];
  Object.keys(PANELS).forEach(slug => {
    PANELS[slug].circuits.forEach(c => {
      out.push({ panelSlug: slug, panelTitle: PANELS[slug].title, ...c });
    });
  });
  return out;
}
