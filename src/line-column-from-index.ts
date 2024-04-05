// vendored from https://github.com/io-monad/line-column/blob/master/lib/line-column.js
// and converted to TypeScript.

export interface LineColumn {
  line: number
  col: number
}

export class LineColumnFinder {
  private origin = 1
  private lineToIndex: number[]

  constructor(private str: string) {
    this.lineToIndex = buildLineToIndex(str)
  }

  index(index: number): LineColumn {
    if (index < 0) {
      throw new Error(`invalid index: ${index}: index cannot be negative`)
    }

    if (isNaN(index)) {
      throw new Error(`invalid index: ${index}: index is NaN`)
    }

    if (index > this.str.length) {
      throw new Error(
        `invalid index: ${index}: index is greater than string length (${this.str.length} characters)`
      )
    }

    const line = findLowerIndexInRangeArray(index, this.lineToIndex)
    return {
      line: line + this.origin,
      col: index - this.lineToIndex[line] + this.origin
    }
  }
}

/**
 * Find a lower-bound index of a value in a sorted array of ranges.
 *
 * Assume `arr = [0, 5, 10, 15, 20]` and
 * this returns `1` for `value = 7` (5 <= value < 10),
 * and returns `3` for `value = 18` (15 <= value < 20).
 *
 * @private
 * @param  arr   {number[]} An array of values representing ranges.
 * @param  value {number}   A value to be searched.
 * @return {number} Found index. If not found `-1`.
 */
function findLowerIndexInRangeArray(value: number, arr: number[]): number {
  if (value >= arr[arr.length - 1]) {
    return arr.length - 1
  }

  let min = 0
  let max = arr.length - 2
  let mid = 0
  while (min < max) {
    mid = min + ((max - min) >> 1)

    if (value < arr[mid]) {
      max = mid - 1
    } else if (value >= arr[mid + 1]) {
      min = mid + 1
    } else {
      // value >= arr[mid] && value < arr[mid + 1]
      min = mid
      break
    }
  }
  return min
}

/**
 * Build an array of indexes of each line from a string.
 *
 * @private
 * @param   str {string}  An input string.
 * @return  {number[]}    Built array of indexes. The key is line number.
 */
function buildLineToIndex(str: string): number[] {
  const lines = str.split('\n')
  const lineToIndex = new Array(lines.length)
  let index = 0

  for (let i = 0, l = lines.length; i < l; i++) {
    lineToIndex[i] = index
    index += lines[i].length + /* "\n".length */ 1
  }
  return lineToIndex
}
