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
        description: "Light-colored, felsic intrusive rock largely made up of quartz and feldspar. It's commonly found in the continental crust.",
        texture: "Coarse-grained",
    },
    {
        name: "Diorite",
        composition: "intermediate",
        origin: "intrusive",
        description: "Intermediate intrusive rock that's composed of roughly equal parts of light and dark minerals (often described as looking like salt and pepper).",
        texture: "Coarse-grained",
    },
    {
        name: "Gabbro",
        composition: "mafic",
        origin: "intrusive",
        description: "Dark-colored, mafic intrusive rock rich in iron and magnesium.",
        texture: "Coarse-grained",
    },
    {
        name: "Peridotite",
        composition: "ultramafic",
        origin: "intrusive",
        description: "Ultramafic intrusive rock that's mostly olivine (a common green silicate mineral containing iron and magnesium). It's commonly found in the Earth's mantle.",
        texture: "Coarse-grained",
    },
    {
        name: "Rhyolite",
        composition: "felsic",
        origin: "extrusive",
        description: "Light-colored, felsic extrusive rock that's rich in silica. Often considered the fine-grained, extrusive equivalent of granite.",
        texture: "Fine-grained, sometimes bubbly",
    },
    {
        name: "Andesite",
        composition: "intermediate",
        origin: "extrusive",
        description: "Intermediate extrusive rock that's most commonly found in volcanic arcs, such as those along the Pacific Ring of Fire.",
        texture: "Fine-grained",
    },
    {
        name: "Basalt",
        composition: "mafic",
        origin: "extrusive",
        description: "Dark, mafic extrusive rock that makes up most of the bedrock in the Earth's ocean basins and many volcanic areas.",
        texture: "Fine-grained, sometimes bubbly",
    },
    {
        name: "Komatiite",
        composition: "ultramafic",
        origin: "extrusive",
        description: "Rare ultramfic extrusive rock that forms from extremely hot lava. Considered one of the oldest rocks on Earth, dating back to over ~3.8 billion years ago.",
        texture: "Fine-grained, spinifex",
    },
];

export const origins: OriginInfo[] = [
    {
        origin: "intrusive",
        description: "Intrusive (or Plutonic) rocks form when magma traps deep within the Earth's crust and gradually solidifies over thousands to millions of years."
    },
    {
        origin: "extrusive",
        description: "Extrusive (or Volcanic) rocks form when lava cools and solidifies on the Earth's surface."
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
