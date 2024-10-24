export interface ITetrimino {
    name: string
    map: number[][]
    weight: number
    posX: number;
    posY: number;
    rotate(): void
    reverse(): void
}