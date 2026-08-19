/**
 * AREA-TAGS.JS
 * ----------------------------------------------------------------
 * Predefined location tags shown as tappable tiles when editing a
 * note, so everyone tags circuits consistently and search actually
 * works ("bar" finds every bar circuit, not just ones where someone
 * happened to type the word "bar").
 *
 * TO ADD/EDIT TAGS: just edit this array. Each tag needs an id
 * (stored in the database — don't change an existing id once it's
 * in use, or old notes will show as untagged) and a label (what's
 * shown on the tile). Add `subOptions` for tags that need a second
 * choice, like Customer Area needing a section number.
 */

const AREA_TAGS = [
  { id: "bar",           label: "Bar" },
  { id: "kitchen",       label: "Kitchen" },
  { id: "cellar",        label: "Cellar" },
  { id: "staff-room",    label: "Staff Room" },
  { id: "office",        label: "Office" },
  {
    id: "toilets", label: "Toilets",
    subOptions: [
      { id: "gents",      label: "Gents" },
      { id: "ladies",     label: "Ladies" },
      { id: "accessible", label: "Accessible" },
    ]
  },
  {
    id: "customer-area", label: "Customer Area",
    subOptions: [
      { id: "section-1", label: "Section 1" },
      { id: "section-2", label: "Section 2" },
      { id: "section-3", label: "Section 3" },
      { id: "section-4", label: "Section 4" },
    ]
  },
  { id: "outside",       label: "Outside" },
  { id: "hvac-plant",    label: "HVAC / Plant" },
];

function findAreaTag(id){
  return AREA_TAGS.find(a => a.id === id) || null;
}
