// Warna chip/ikon dari Figma: navy, forest, olive, plum, maroon (teks selalu #f1efe7)

export type Tint = "navy" | "forest" | "olive" | "plum" | "maroon"

export const TINTS: Tint[] = ["navy", "forest", "olive", "plum", "maroon"]

export const tintBg: Record<Tint, string> = {
    navy: "bg-navy",
    forest: "bg-forest",
    olive: "bg-olive",
    plum: "bg-plum",
    maroon: "bg-maroon"
}

/** Warna tetap untuk nama skill yang sama di seluruh aplikasi */
export function tintFor(key: string | number): Tint {
    const s = String(key).toLowerCase()
    let h = 0
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
    return TINTS[h % TINTS.length]
}

export function tintAt(index: number): Tint {
    return TINTS[index % TINTS.length]
}
