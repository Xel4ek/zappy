export class Noise {
  static diamondSquare(resolution: number, multiplier: number) {
    const gridSize = resolution - 1;
    const rows = [];
    let columns = [];
    let subdivisions = 1;

    //initialize the grid
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        columns[x] = 0;
      }
      rows[y] = columns;
      columns = [];
    }

    //set corner values
    rows[0][0] = Math.random() / multiplier;
    rows[0][gridSize] = Math.random() / multiplier;
    rows[gridSize][0] = Math.random() / multiplier;
    rows[gridSize][gridSize] = Math.random() / multiplier;

    let loopBreak = 0;
    while (loopBreak != 1) {
      subdivisions = subdivisions * 2;
      const distance = gridSize / subdivisions;

      //diamond step
      for (
        let rowNumber = distance;
        rowNumber < resolution;
        rowNumber += distance * 2
      ) {
        for (
          let columnNumber = distance;
          columnNumber < resolution;
          columnNumber += distance * 2
        ) {
          rows[rowNumber][columnNumber] = Noise.diamond(
            rows,
            distance,
            rowNumber,
            columnNumber,
            subdivisions,
            multiplier
          );
        }
      }

      //square step
      for (let rowNumber = 0; rowNumber < resolution; rowNumber += distance) {
        for (
          let columnNumber = 0;
          columnNumber < resolution;
          columnNumber += distance
        ) {
          if (rows[rowNumber][columnNumber] == 0) {
            rows[rowNumber][columnNumber] = Noise.square(
              rows,
              distance,
              rowNumber,
              columnNumber,
              subdivisions,
              multiplier
            );
          }
        }
      }

      loopBreak = 1;
      for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
          if (rows[y][x] == 0) {
            loopBreak = 0;
          }
        }
      }
    }
    //Create a Uint8Array, convert nested row/column array to Uint8Array, multiply by 255 for color.
    const dataArray = new Uint8Array(resolution * resolution * 3);
    let rowCounter = 0;
    let columnCounter = 0;
    let adjustedNoiseValue = 0;
    for (let i = 0; i < dataArray.length; i += 3) {
      adjustedNoiseValue = rows[rowCounter][columnCounter] * 255;
      adjustedNoiseValue = Math.min(255, Math.max(0, adjustedNoiseValue));
      dataArray[i] = adjustedNoiseValue;
      dataArray[i + 1] = adjustedNoiseValue;
      dataArray[i + 2] = adjustedNoiseValue;
      columnCounter++;
      if (columnCounter == resolution) {
        columnCounter = 0;
        rowCounter++;
      }
    }

    return dataArray;
  }

  private static diamond(
    rows: number[][],
    distance: number,
    rowNumber: number,
    columnNumber: number,
    subdivisions: number,
    multiplier: number
  ) {
    const diamondAverageArray = [];
    if (rows[rowNumber - distance][columnNumber - distance] != null) {
      diamondAverageArray.push(
        rows[rowNumber - distance][columnNumber - distance]
      );
    }
    if (rows[rowNumber - distance][columnNumber + distance] != null) {
      diamondAverageArray.push(
        rows[rowNumber - distance][columnNumber + distance]
      );
    }
    if (rows[rowNumber + distance][columnNumber - distance] != null) {
      diamondAverageArray.push(
        rows[rowNumber + distance][columnNumber - distance]
      );
    }
    if (rows[rowNumber + distance][columnNumber + distance] != null) {
      diamondAverageArray.push(
        rows[rowNumber + distance][columnNumber + distance]
      );
    }
    let diamondValue = 0;
    for (let i = 0; i < diamondAverageArray.length; i++) {
      diamondValue += diamondAverageArray[i];
    }

    diamondValue =
      diamondValue / diamondAverageArray.length +
      (Math.random() - 0.5) / multiplier / subdivisions;

    return diamondValue;
  }

  private static square(
    rows: number[][],
    distance: number,
    rowNumber: number,
    columnNumber: number,
    subdivisions: number,
    multiplier: number
  ) {
    const squareAverageArray = [];
    if (
      rows[rowNumber - distance] != null &&
      rows[rowNumber - distance][columnNumber] != null
    ) {
      squareAverageArray.push(rows[rowNumber - distance][columnNumber]);
    }
    if (rows[rowNumber][columnNumber + distance] != null) {
      squareAverageArray.push(rows[rowNumber][columnNumber + distance]);
    }
    if (
      rows[rowNumber + distance] != null &&
      rows[rowNumber + distance][columnNumber] != null
    ) {
      squareAverageArray.push(rows[rowNumber + distance][columnNumber]);
    }
    if (rows[rowNumber][columnNumber - distance] != null) {
      squareAverageArray.push(rows[rowNumber][columnNumber - distance]);
    }
    let squareValue = 0;
    for (let i = 0; i < squareAverageArray.length; i++) {
      squareValue += squareAverageArray[i];
    }

    squareValue =
      squareValue / squareAverageArray.length +
      (Math.random() - 0.5) / multiplier / subdivisions;

    return squareValue;
  }
}
