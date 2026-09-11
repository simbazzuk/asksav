export type SubjectType = "PROPERTY" | "VEHICLE";

export type InspectionTemplate = {
  type: SubjectType;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  identifierLabel: string;
  areas: Array<{
    name: string;
    items: string[];
  }>;
};

export const INSPECTION_TEMPLATES: Record<SubjectType, InspectionTemplate> = {
  PROPERTY: {
    type: "PROPERTY",
    label: "Property / Site",
    shortLabel: "Property",
    description: "Buildings, rental properties, accommodation and facilities.",
    icon: "P",
    identifierLabel: "Property",
    areas: [
      { name: "Hallway", items: ["Wall", "Ceiling", "Floor", "Door"] },
      { name: "Kitchen", items: ["Wall", "Ceiling", "Floor", "Window", "Units"] },
      { name: "Bedroom", items: ["Wall", "Ceiling", "Floor", "Window", "Door"] },
      { name: "Bathroom", items: ["Wall", "Ceiling", "Floor", "Fixtures"] },
    ],
  },
  VEHICLE: {
    type: "VEHICLE",
    label: "Vehicle",
    shortLabel: "Vehicle",
    description: "Rental, fleet and leased vehicle checkout and return inspections.",
    icon: "V",
    identifierLabel: "Vehicle",
    areas: [
      { name: "Front", items: ["Bumper", "Bonnet", "Windscreen", "Headlights"] },
      { name: "Driver side", items: ["Front door", "Rear door", "Front wheel", "Rear wheel", "Mirror"] },
      { name: "Passenger side", items: ["Front door", "Rear door", "Front wheel", "Rear wheel", "Mirror"] },
      { name: "Rear", items: ["Bumper", "Boot", "Rear lights", "Rear window"] },
      { name: "Interior", items: ["Dashboard", "Front seats", "Rear seats", "Load area"] },
    ],
  },
};

export function isSubjectType(value: unknown): value is SubjectType {
  return value === "PROPERTY" || value === "VEHICLE";
}
