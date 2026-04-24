// Declaring types for the props that will be used to distinguish between different rocks in the application. These types will help ensure that the correct values are used when categorizing rocks based on their origin and composition.
export type Origin = "intrusive" | "extrusive";
export type Composition = "felsic" | "intermediate" | "mafic" | "ultramafic";

// Rock interface that defines the structure of a rock object, will be used to make the cards for each rock.
export interface Rock {
    name: string;
    composition: Composition;
    origin: Origin;
    description: string;
    texture: string;
}

export interface OriginInfo {
    origin: Origin;
    description: string;
}

// Actual data for the rock objects.
export const rocks: Rock[] = [
    {
        name: "Granite",
        composition: "felsic",
        origin: "intrusive",
        description: "",
        texture: "",
    },
    {
        name: "Diorite",
        composition: "intermediate",
        origin: "intrusive",
        description: "",
        texture: "",
    },
    {
        name: "Gabbro",
        composition: "mafic",
        origin: "intrusive",
        description: "",
        texture: "",
    },
    {
        name: "Peridotite",
        composition: "ultramafic",
        origin: "intrusive",
        description: "",
        texture: "",
    },
    {
        name: "Rhyolite",
        composition: "felsic",
        origin: "extrusive",
        description: "",
        texture: "",
    },
    {
        name: "Andesite",
        composition: "intermediate",
        origin: "extrusive",
        description: "",
        texture: "",
    },
    {
        name: "Basalt",
        composition: "mafic",
        origin: "extrusive",
        description: "",
        texture: "",
    },
    {
        name: "Komatiite",
        composition: "ultramafic",
        origin: "extrusive",
        description: "",
        texture: "",
    },
];

export const origins: OriginInfo[] = [
    {
        origin: "intrusive",
        description: "Rocks that form when magma cools and solidifies beneath the Earth's surface."
    },
    {
        origin: "extrusive",
        description: "Rocks that form when lava cools and solidifies on the Earth's surface."
    }
];

// This array defines the order of rock compositions to define the sequence in which rocks will be displayed.
export const compositionOrder: Composition[] = [
    "felsic",
    "intermediate",
    "mafic",
    "ultramafic",
];

export function getRocksByOrigin(origin: Origin): Rock[] {
    return rocks.filter(rock => rock.origin === origin);
}

export function groupByComposition(rockList: Rock[]): Record<Composition, Rock[]> {
    return compositionOrder.reduce((acc, comp) => {
        acc[comp] = rockList.filter((rock) => rock.composition === comp);
        return acc;
    }, {} as Record<Composition, Rock[]>);
}
