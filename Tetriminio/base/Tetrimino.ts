//@ts-check

import type { ITetrimino } from "./ITetrimino.ts";

export type PropsTetrimino = {
  name: string
  map: number[][]
  weight: number
}

export class Tetrimino implements ITetrimino{
  name: string;
  map: number[][];
  weight: number;
  posX: number;
  posY: number;

  constructor(props: PropsTetrimino){
    this.name = props.name;
    this.map = props.map;
    this.weight = props.weight;
    this.posX = 0;
    this.posY = -1;
  }

  public rotate(){
    const newMap: number[][] = []

    // [1,1,1],
    // [0,1,0]

    // [0,1]
    // [1,1]
    // [0,1]
    
    // [0,1,0],
    // [1,1,1]


    let indexRow = 0
    for (let i = this.map.length-1; i >= 0; i--) {      
      for (let j = 0; j < this.map[i].length; j++) {
        if(!newMap[j]) newMap[j] = []

        // console.log(`map row:${i} col:${j}`)
        // console.log(`new map row:${j} col:${indexRow}`)

        newMap[j][indexRow] = this.map[i][j]
        
      }
      indexRow++
      // indexRow = 0
    }

    this.map = newMap
  }

  public reverse(){
    const newMap: number[][] = []

    // [1,1,1],
    // [0,1,0]

    // [0,1]
    // [1,1]
    // [0,1]
    
    // [0,1,0],
    // [1,1,1]


    let indexRow = 0
    for (let i = 0; i < this.map.length; i++) {      
      for (let j = this.map[i].length-1; j >= 0; j--) {
        if(!newMap[j]) newMap[j] = []

        // console.log(`map row:${i} col:${j}`)
        // console.log(`new map row:${j} col:${indexRow}`)

        newMap[j][indexRow] = this.map[i][j]
        
      }
      indexRow++
      // indexRow = 0
    }

    this.map = newMap
  }
}