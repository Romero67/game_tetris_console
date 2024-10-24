//@ts-check
import { Tetrimino } from "./Tetriminio/base/Tetrimino.ts";
import getTetriminos from "./Tetriminio/getTetriminos.ts";

enum Cell {
  "empty" = 1,
  "not_fixed" = 2,
  "fixed" = 3
}

type Direction = "down" | "left" | "right";

class Tetris {
  private readonly rowsCount: number = 20; //cantidad de filas
  private readonly columnsCount: number = 10; //cantidad de columnas
  private table: number[][] = []; //para administrar la tabla
  private gameOver: boolean = false //esta en juego o no
  private stateLoop: boolean = false
  private tetriminos: Tetrimino[] = [];
  private currentTetrimino: Tetrimino | undefined;
  private forceLoop: boolean = false;

  constructor() {}

  public initGame() {
    this.tetriminos = getTetriminos()
    this.fillTable(Cell.empty); //inicializo la tabla
    this.loop()
    
  }

  /*
    Aqui va toda la lógica del juego dentro del loop
  */
  private mainLoop(){
    
    this.clearTable()

    this.lowerTetrimino()

    if(!this.currentTetrimino){
      this.currentTetrimino = this.getRandomTetrimino()
    }
    // console.log("main loop")
    this.drawTable(); //dibujo la tabla
  }

  /*
    Se encarga de manejar el loop del juego
  */
  private async listenForKeyPresses() {
    const buffer = new Uint8Array(3); // Aumentamos el tamaño del buffer para manejar secuencias de escape
    Deno.stdin.setRaw(true);
    
    try {
      while (this.stateLoop) {
        const bytesRead = await Deno.stdin.read(buffer);
        if (bytesRead !== null) {
          const key = new TextDecoder().decode(buffer.slice(0, bytesRead));

          // Manejar secuencias de escape para teclas especiales
          switch (key) {
            case "\x1b[A": // Flecha arriba
                this.currentTetrimino?.rotate()
                if(this.isCollision()) this.currentTetrimino?.reverse()
                this.clearTable()
                this.drawTable()
                break;
            case "\x1b[B": // Flecha abajo
                this.moveTetriminio('down')
                break;
            case "\x1b[C": // Flecha derecha
                this.moveTetriminio('right')
                break;
            case "\x1b[D": // Flecha izquierda
                this.moveTetriminio('left')
                break;
            case "z":
                this.stateLoop = false; // Cambiar estado para salir del bucle principal
                break;
            default:
                console.log(`Tecla "${key}" detectada.`);
                break;
          }
        }
      }
    } finally {
        Deno.stdin.setRaw(false); // Restaurar el modo de consola cuando termine
    }
  }
  
  
  private async loop() {
      this.stateLoop = true;
      let time = new Date().getTime(); // Variable para guardar el tiempo actual
  
      // Iniciar la escucha de teclas en paralelo
      this.listenForKeyPresses();
  
      while (this.stateLoop) { // Mientras no sea gameOver que loopee
          const currentTime = new Date().getTime() - time; // Obtengo cuánto tiempo pasó
          if (currentTime > 1000 || this.forceLoop) { // Si pasó más del tiempo estimado entonces ejecuto
              time = new Date().getTime(); // Reseteo el tiempo
              if(this.forceLoop){
                // console.log("por event loop...")
              }
              this.forceLoop = false;
  
              this.mainLoop();
          }
  
          // Liberar el event loop temporalmente para permitir que otras tareas se procesen
          await new Promise(resolve => setTimeout(resolve, 0));
      }
  
      console.log("Saliendo del bucle principal.");
  }  

  /*
    Aqui limpia las celdas de la tabla
    @param notFixed: boolean -> Para saber si ignoro las celdas fijas o no
  */
  private clearTable(notFixed = false){
    this.iterateTable((value: number) => {
      if(notFixed){
        return Cell.empty
      }
      if(value == Cell.empty){
        return Cell.empty
      }
      if(value == Cell.fixed){
        return Cell.fixed
      }
      return Cell.empty
    },true)
  }

  /*
    Mueve para abajo al tetrimino
    si el tetrimino choca contra algo o se sale del mapa, lo devuelve a su posición sino lo baja
  */
  private lowerTetrimino(){
    if(!this.currentTetrimino) return

    this.currentTetrimino.posY += 1
    if(this.isCollision()){
      this.currentTetrimino.posY -= 1
      this.clearTable()
      this.setFixTetrimino(this.currentTetrimino, 0.5)
      this.currentTetrimino = undefined
      this.drawTable()
    }

    if(this.currentTetrimino){
      this.setNotFixedTetrimino(this.currentTetrimino)
    }
    
  }
  /*
    Mueve en diferentes direcciones al tetrimino
    si el tetrimino choca contra algo o se sale del mapa, lo devuelve a su posición
    @param direction: Direction
  */
  private moveTetriminio(direction: Direction){
    if(!this.currentTetrimino) return

    switch(direction){
      case 'down':
        this.currentTetrimino.posY += 1
        if(this.isCollision()){
          this.currentTetrimino.posY -= 1
        }
      break;
      case 'left':
        this.currentTetrimino.posX -= 1
        if(this.isCollision()){
          this.currentTetrimino.posX += 1
        }
      break;
      case 'right':
        this.currentTetrimino.posX += 1
        if(this.isCollision()){
          this.currentTetrimino.posX -= 1
        }
      break;
    }

    if(this.currentTetrimino){
      this.clearTable()
      this.setNotFixedTetrimino(this.currentTetrimino)
      this.drawTable()
    }
    
  }

  /*
    Coloca en la tabla las celdas fijadas del tetrimino en juego
  */
  private setFixTetrimino(_T: Tetrimino, seconds: number){
    
    this.iterateTetriminoMap(_T, (tableValue, TValue) => {
      if(tableValue == Cell.fixed) return Cell.fixed
      return TValue === 1 ? Cell.fixed : Cell.empty;
    }, true)

  }
  
  /*
    Coloca en la tabla las celdas no fijadas del tetrimino en juego
  */
  private setNotFixedTetrimino(_T: Tetrimino){
    this.iterateTetriminoMap(_T, (tableValue, TValue) => {
      if(tableValue == Cell.fixed) return Cell.fixed
      else if(TValue == 1) return Cell.not_fixed
      else return Cell.empty
    }, true)
  }

  /*
    Función para saber si la pieza en juego chocó contra algo o se salió del mapa
    return boolean
  */
  private isCollision(): boolean{
    let collision: boolean = false;

    if(!this.currentTetrimino) return collision

    this.iterateTetriminoMap(this.currentTetrimino, (tableValue, tValue) => {
      //si la posición hace que salga de la tabla
      if(!tableValue){
        collision = true
      }
      //si la posición hace que esté sobre otro tetrimino
      if(tableValue == Cell.fixed && tValue == 1){
        collision = true
      }
    })

    return collision;
  }  

  /*
    Función que dibuja la tabla
    valores posibles de la celda
    0 = espacio vacio
    1 = bloque no fijado
    2 = bloque fijado
  */
  private drawTable() {
    let text = '' //variable para guardar el output a la consola
    for (let i = 0; i < this.rowsCount; i++) { //recorro las filas
      for (let j = 0; j < this.columnsCount; j++) { //recorro las columnas

        if (j == 0) { //si es el primero agrego estructura visual
          text += '<'
          text += '!'
        }

        if(this.table[i][j] == Cell.empty){
          text += "--"
        }
        if(this.table[i][j] == Cell.fixed || this.table[i][j] == Cell.not_fixed){
          text += "[]"
        }

        if (j == (this.columnsCount - 1)) { //si es el último agrego estructura visual
          text += '!'
          text += '>'
        }
      }
      text += '\n'
    }

    //antes de finalizar agrego estructura visual de abajo
    text += '<!'
    for (let i = 0; i < this.columnsCount; i++) {
      text += '=='
    }
    text += '!>'

    this.printConsole(text) //dibujo en consola
  }

  /*
    Rellena toda la tabla con un valor
  */
  private fillTable(value: number) {
    this.iterateTable(() => {
      return value
    }, true)
  }

  /*
    Devuelve un tetrimino random
    return Tetrimino
  */
  private getRandomTetrimino(): Tetrimino {
    const totalWeight = this.tetriminos.reduce((sum, item) => sum + item.weight, 0);
    const random = Math.random() * totalWeight;
    let accumulatedWeight = 0;

    for (let i = 0; i < this.tetriminos.length; i++) {
        accumulatedWeight += this.tetriminos[i].weight;
        if (random < accumulatedWeight) {
            return new Tetrimino({
                name: this.tetriminos[i].name,
                map: JSON.parse(JSON.stringify(this.tetriminos[i].map)), // Clonar para evitar referencias
                weight: this.tetriminos[i].weight,
            });
        }
    }

    // Fallback que garantiza retorno con una nueva instancia
    const lastTetrimino = this.tetriminos[this.tetriminos.length - 1];
    return new Tetrimino({
        name: lastTetrimino.name,
        map: JSON.parse(JSON.stringify(lastTetrimino.map)), // Clonar para evitar referencias
        weight: lastTetrimino.weight,
    });
  }
  

  /*
    Itera sobre la tabla en la posición del Tetriminio, también permite modificar los valores de la tabla
    @param T: Tetrimino -> Tetrimino a iterar
    @param callback: (tableValue: number, TValue: number) => number -> función que va a utilizar los valores de la celda
    @param set: boolean -> Esto es para modificar el valor de la celda o no
  */
  private iterateTetriminoMap(
    T:Tetrimino,
    callback: (tableValue: number | null, TValue: number) => number | void,
    set = false
  ){
    for (let row = 0; row < T.map.length; row++) {
      for (let column = 0; column < T.map[row].length; column++) {
        
        if(!this.table[T.posY+row] || !this.table[T.posY+row][T.posX+column]) callback(null, T.map[row][column])
        else if(!set){
          callback(this.table[T.posY+row][T.posX+column], T.map[row][column])
        }else{
          this.table[T.posY+row][T.posX+column] = callback(this.table[T.posY+row][T.posX+column], T.map[row][column]) || Cell.empty
        }
        
      }      
    }
  }

  /*
    Itera sobre la tabla, también permite modificar los valores de la misma
    @param callback: (tableValue: number) => number -> función que va a utilizar el valor de la celda
    @param set: boolean -> Esto es para modificar el valor de la celda o no
  */
  private iterateTable(callback: (tableValue: number) => number | void, set = false) {
    for (let i = 0; i < this.rowsCount; i++) {

      if (!this.table[i]) {
        this.table[i] = [];
      }

      for (let j = 0; j < this.columnsCount; j++) {

        if (set) {
          this.table[i][j] = callback(this.table[i][j]) || Cell.empty
        } else {
          callback(this.table[i][j])
        }

      }
    }
  }

  //HELPERS
  private printConsole(text: string) {
    console.clear()
    console.log(text)
  }

}


const TETRIS = new Tetris()

TETRIS.initGame()