import { Tetrimino } from "./base/Tetrimino.ts";
import json from './ListTetrimino.json' with { type: "json" }

export default  function (): Tetrimino[]{
    const listJson = json;
    let list: Tetrimino[] = [];

    if(!Array.isArray(listJson)){
        throw new Error('Error con el archivo ListTerimino, no existe lista');
    }

    list = listJson.map(el => {
        const tetrimino = new Tetrimino({name: el.name, map: el.map, weight: el.weightProbability});

        return tetrimino;
    });

    return list;
}