//@ts-check
import { Tetrimino } from "./Tetriminio/base/Tetrimino.ts";
import getTetriminos from "./Tetriminio/getTetriminos.ts";

enum Cell {
  "empty" = 1,
  "not_fixed" = 2,
  "fixed" = 3
}

type Direction = "down" | "left" | "right";

const config = {
  DROP_INTERVAL: 1000,
  POINTS: 0,
  LEVEL: 1,
  LINES_CLEARED: 0,
  LINES_TO_NEXT_LEVEL: 10
}


class Tetris {
  private readonly rowsCount: number = 20; //cantidad de filas
  private readonly columnsCount: number = 10; //cantidad de columnas
  private table: number[][] = []; //para administrar la tabla
  private gameOver: boolean = false //esta en juego o no
  private stateLoop: boolean = false
  private tetriminos: Tetrimino[] = [];
  private currentTetrimino: Tetrimino | undefined;
  private forceLoop: boolean = false;
  private points: number = config.POINTS;
  private dropInterval = config.DROP_INTERVAL; // Intervalo inicial en milisegundos
  private level = config.LEVEL;
  private linesCleared = config.LINES_CLEARED;
  private linesToNextLevel = config.LINES_TO_NEXT_LEVEL
  private listenKeys = false
  private stopGame = false
  private resetGame = false

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

    this.lowerTetrimino()

    if(!this.currentTetrimino){
      this.currentTetrimino = this.getRandomTetrimino()
      this.currentTetrimino.posY += 1
      if(this.isCollision()){
        this.stateLoop = false
      }
      this.currentTetrimino.posY -=1
    }

    this.updateTableWithTetrimino(this.currentTetrimino, false)
    this.verifyAndDeleteLine();
  }

  /*
    Función que se encarga de verificar si es que hay linea, si las hay que las destruya
  */
  private verifyAndDeleteLine(){
    const indexRowsToDelete = []
    for (let i = 0; i < this.rowsCount; i++) { // Recorro las filas
      if (!this.table[i]) {
          this.table[i] = [];
      }
      let lineComplete = true
      for (let j = 0; j < this.columnsCount; j++) { // Recorro las columnas
        if(this.table[i][j] == Cell.empty || this.table[i][j] == Cell.not_fixed){
          lineComplete = false
        }
      }

      if(lineComplete){
        indexRowsToDelete.push(i)
      }
    }

    for (let i = 0; i < indexRowsToDelete.length; i++) {
      const index = indexRowsToDelete[i];
      this.table.splice(index, 1) 
      this.table.unshift(new Array(10).fill(1))   
    }
    this.linesCleared += indexRowsToDelete.length  

    if(this.linesCleared > this.linesToNextLevel){
      this.linesCleared -= this.linesToNextLevel
      this.level++
      this.dropInterval = Math.max(100, this.dropInterval - 100)
      if(this.dropInterval < 0.2){
        this.dropInterval = 0.2
      }
    }

    if(indexRowsToDelete.length == 1){
      this.points += 40 * (this.level * 0.1)
    }
    if(indexRowsToDelete.length == 2){
      this.points += 100 * (this.level * 0.1)
    }
    if(indexRowsToDelete.length == 3){
      this.points += 300 * (this.level * 0.1)
    }
    if(indexRowsToDelete.length == 4){
      this.points += 1200 * (this.level * 0.1)
    }
  }

  /*
    Se encarga de manejar el loop del juego
  */
  private async listenForKeyPresses() {
    const buffer = new Uint8Array(3); // Aumentamos el tamaño del buffer para manejar secuencias de escape
    Deno.stdin.setRaw(true);
    
    try {
      while ((this.stateLoop || this.listenKeys) && !this.stopGame) {
        const bytesRead = await Deno.stdin.read(buffer);
        if (bytesRead !== null) {
          const key = new TextDecoder().decode(buffer.slice(0, bytesRead));

          // Manejar secuencias de escape para teclas especiales
          switch (key) {
            case "\x1b[A": // Flecha arriba
                this.currentTetrimino?.rotate()
                if(this.isCollision()) this.currentTetrimino?.reverse()
                this.updateTableWithTetrimino(this.currentTetrimino as Tetrimino, false)
                break;
            case "\x1b[B": // Flecha abajo
                this.moveTetriminio('down')
                this.updateTableWithTetrimino(this.currentTetrimino as Tetrimino, false)
                break;
            case "\x1b[C": // Flecha derecha
                this.moveTetriminio('right')
                this.updateTableWithTetrimino(this.currentTetrimino as Tetrimino, false)
                break;
            case "\x1b[D": // Flecha izquierda
                this.moveTetriminio('left')
                this.updateTableWithTetrimino(this.currentTetrimino as Tetrimino, false)
                break;
            case "z":
                this.stateLoop = false
                this.stopGame = true
                break;
            case "r":
                console.log("reiniciando...")
                this.stateLoop = false
                this.stopGame = true
                this.resetGame = true
                break;
            default:
                console.log(``);
                break;
          }
        }
      }
    } finally {
        Deno.stdin.setRaw(false); // Restaurar el modo de consola cuando termine
    }
  }

  private reset(){
    this.points = config.POINTS;
    this.dropInterval = config.DROP_INTERVAL; // Intervalo inicial en milisegundos
    this.level = config.LEVEL;
    this.linesCleared = config.LINES_CLEARED;
    this.linesToNextLevel = config.LINES_TO_NEXT_LEVEL
    this.currentTetrimino = undefined
    this.fillTable(Cell.empty)
    this.listenKeys = false
    this.resetGame = false
    this.stopGame = false
    this.loop()
  }
  
  
  private async loop() {
      this.stateLoop = true;
      let time = new Date().getTime(); // Variable para guardar el tiempo actual
  
      // Iniciar la escucha de teclas en paralelo
      this.listenForKeyPresses();
  
      while (this.stateLoop) { // Mientras no sea gameOver que loopee
          const currentTime = new Date().getTime() - time; // Obtengo cuánto tiempo pasó
          if (currentTime > this.dropInterval || this.forceLoop) { // Si pasó más del tiempo estimado entonces ejecuto
              if(!this.forceLoop){
                time = new Date().getTime(); // Reseteo el tiempo
              }
              this.forceLoop = false;
  
              this.mainLoop();
          }
  
          // Liberar el event loop temporalmente para permitir que otras tareas se procesen
          await new Promise(resolve => setTimeout(resolve, 0));
      }
  
      console.log("Game Over");
      this.listenKeys = true
      this.listenForKeyPresses()

      if(this.resetGame){
        this.reset()
      }
  }  

  /*
    Mueve para abajo al tetrimino
    si el tetrimino choca contra algo o se sale del mapa, lo devuelve a su posición sino lo baja
  */
  private lowerTetrimino(){
    if(!this.currentTetrimino) return

    this.currentTetrimino.posY += 1
    if(this.isCollision()){
      if(this.currentTetrimino.posY <= 0){
        this.stateLoop = false
      }
      this.currentTetrimino.posY -= 1
      this.updateTableWithTetrimino(this.currentTetrimino, true)
      this.currentTetrimino = undefined
    }

    if(this.currentTetrimino){
      this.updateTableWithTetrimino(this.currentTetrimino, false)
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
      this.updateTableWithTetrimino(this.currentTetrimino, false)
    }
    
  }

  /*
    Función para saber si la pieza en juego chocó contra algo o se salió del mapa
    return boolean
  */
  private isCollision(): boolean{
    let collision: boolean = false;

    if(!this.currentTetrimino) return collision

    if(this.currentTetrimino.posY < 0) return collision

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

  // Función que dibuja la tabla
  //   valores posibles de la celda
  //   0 = espacio vacio
  //   1 = bloque no fijado
  //   2 = bloque fijado
  private updateTableWithTetrimino(_T: Tetrimino, fixed: boolean) {
    try {
      let text = ''; // Variable para el output en la consola

      for (let i = 0; i < this.rowsCount; i++) { // Recorro las filas
          if (!this.table[i]) {
              this.table[i] = [];
          }

          for (let j = 0; j < this.columnsCount; j++) { // Recorro las columnas

              // 1. Actualizar valores existentes en la tabla
              if (this.table[i][j] === 2) {
                  // Si el valor actual es 2 (no fijado), se debe limpiar a 1 (vacío)
                  this.table[i][j] = 1;
              }

              // 2. Colocar el Tetrimino basado en la posición del _T
              const TValue = _T.map[i - _T.posY] && _T.map[i - _T.posY][j - _T.posX];
              if (TValue === 1) {
                  // Si el Tetrimino tiene una parte activa aquí, establecerla como 2 o 3
                  this.table[i][j] = fixed ? 3 : 2;
              }

              // 3. Generar el texto para la visualización en consola
              if (j === 0) { // Si es el primero agrego estructura visual
                  text += '<';
                  text += '!';
              }

              // Añadir contenido según el estado de la celda
              if (this.table[i][j] === 1) {
                  text += '--'; // Vacío
              } else if (this.table[i][j] === 2 || this.table[i][j] === 3) {
                  text += '[]'; // Tetrimino no fijado o fijado
              }

              if (j === (this.columnsCount - 1)) { // Si es el último agrego estructura visual
                  text += '!';
                  text += '>';
              }
          }
          text += '\n';
      }

      // Estructura visual de la parte inferior
      text += '<!';
      for (let i = 0; i < this.columnsCount; i++) {
          text += '==';
      }
      text += '!>';
      text += '\n';
      text += 'Points: '+this.points;

      // Imprimir en la consola
      this.printConsole(text);
    } catch (error) {
      // console.log("error:  ",error)
    }
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