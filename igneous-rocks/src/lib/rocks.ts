// Declaring types for the props that will be used to distinguish between different rocks in the application. These types will help ensure that the correct values are used when categorizing rocks based on their origin and composition.
export type Origin = "intrusive" | "extrusive";
export type Composition = "felsic" | "intermediate" | "mafic" | "ultramafic";
export type Texture = "coarse-grained" | "fine-grained" | "bubbly" | "spinifex";

// Rock interface that defines the structure of a rock object, will be used to make the cards for each rock.
export interface Rock {
    name: string;
    composition: Composition;
    origin: Origin;
    description: string;
    texture: Texture[];
}

// Interface for origin information, will be used in origin section headers.
export interface OriginInfo {
    origin: Origin;
    description: string;
}

// Interface for composition information, will be used to display info about compositions in the facts section.
export interface CompositionInfo {
    composition: Composition;
    description: string;
    minerals: string[];
}

// Interface for texture information, will be used to display info about textures in the facts section.
export interface TextureInfo {
    texture: Texture;
    description: string;
}

// Actual data for the rock objects.
export const rocks: Rock[] = [
    {
        name: "Granite",
        composition: "felsic",
        origin: "intrusive",
        description: "Light-colored, felsic intrusive rock largely made up of quartz and feldspar. It's commonly found in the continental crust.",
        texture: ["coarse-grained"],
    },
    {
        name: "Diorite",
        composition: "intermediate",
        origin: "intrusive",
        description: "Intermediate intrusive rock that's composed of roughly equal parts of light and dark minerals (often described as looking like salt and pepper).",
        texture: ["coarse-grained"],
    },
    {
        name: "Gabbro",
        composition: "mafic",
        origin: "intrusive",
        description: "Dark-colored, mafic intrusive rock rich in iron and magnesium.",
        texture: ["coarse-grained"],
    },
    {
        name: "Peridotite",
        composition: "ultramafic",
        origin: "intrusive",
        description: "Ultramafic intrusive rock that's mostly olivine (a common green silicate mineral containing iron and magnesium). It's commonly found in the Earth's mantle.",
        texture: ["coarse-grained"],
    },
    {
        name: "Rhyolite",
        composition: "felsic",
        origin: "extrusive",
        description: "Light-colored, felsic extrusive rock that's rich in silica. Often considered the fine-grained, extrusive equivalent of granite.",
        texture: ["fine-grained", "bubbly"],
    },
    {
        name: "Andesite",
        composition: "intermediate",
        origin: "extrusive",
        description: "Intermediate extrusive rock that's most commonly found in volcanic arcs, such as those along the Pacific Ring of Fire.",
        texture: ["fine-grained"],
    },
    {
        name: "Basalt",
        composition: "mafic",
        origin: "extrusive",
        description: "Dark, mafic extrusive rock that makes up most of the bedrock in the Earth's ocean basins and many volcanic areas.",
        texture: ["fine-grained", "bubbly"],
    },
    {
        name: "Komatiite",
        composition: "ultramafic",
        origin: "extrusive",
        description: "Rare ultramafic extrusive rock that forms from extremely hot lava. Considered one of the oldest rocks on Earth, dating back to over ~3.8 billion years ago.",
        texture: ["fine-grained", "spinifex"],
    },
];

// Actual data for origin information.
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

// Actual data for composition information.
export const compositions: CompositionInfo[] = [
    {
        composition: "felsic",
        description: "Felsic rocks are rich in silica (SiO2), typically containing more than 65% silica. They are composed of light-colored minerals that make them less dense and more buoyant than other igneous rocks.",
        minerals: ["Quartz", "Feldspar"]
    },
    {
        composition: "intermediate",
        description: "Intermediate rocks have a silica content between felsic and mafic rocks, typically ranging from 52% to 65% silica. They appear as a mixture of light and dark minerals.",
        minerals: ["Plagioclase Feldspar", "Amphibole", "Biotite"]
    },
    {
        composition: "mafic",
        description: "Mafic rocks are rich in magnesium (Mg) and iron (Fe), with a silica content typically ranging from 45% to 52%. As a result, they're usually darker in color.",
        minerals: ["Pyroxene", "Plagioclase Feldspar", "Olivine"]
    },
    {
        composition: "ultramafic",
        description: "Ultramafic rocks are composed almost entirely of ferromagnesian minerals, with a silica content typically less than 45%. This means they're quite dense and very dark in color.",
        minerals: ["Olivine", "Pyroxene"]
    }
];

// Actual data for texture information.
export const textures: TextureInfo[] = [
    {
        texture: "coarse-grained",
        description: "Coarse-grained texture means that the rock's crystals are large enough to be seen with the naked eye. Additionally, coarse texture indicates that the rock cooled slowly. ",
    },
    {
        texture: "fine-grained",
        description: "Fine-grained texture means that the rock's crystals are miniscule, resulting in the rock appearing as a smooth, glassy surface. Smaller crystals indicate that the rock cooled too fast for them to grow larger. ",
    },
    {
        texture: "bubbly",
        description: "Bubbly texture is characterized as porous and vesicular, which is when holes are formed as a result of gases escaping from the magma as it rapidly depressurizes during eruption.",
    },
    {
        texture: "spinifex",
        description: "Spinifex texture consists of large, blade-like crystals of olivine that form due to the rapid crystallization that occurs when molten magma is supercooled while it flows.",
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