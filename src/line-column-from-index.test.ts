import { LineColumnFinder } from './line-column-from-index'

const testString = [
  'ABCDEFG\n', // line:0, index:0
  'HIJKLMNOPQRSTU\n', // line:1, index:8
  'VWXYZ\n', // line:2, index:23
  '日本語の文字\n', // line:3, index:29
  'English words' // line:4, index:36
].join('') // length:49

describe('lineColumnFromIndex', () => {
  it('should return a line/column from an offset', () => {
    const finder = new LineColumnFinder(testString)
    expect(finder.index(0)).toStrictEqual({ line: 1, col: 1 })
  })
  it('returns line/index for the first line', () => {
    const finder = new LineColumnFinder(testString)
    expect(finder.index(3)).toStrictEqual({ line: 1, col: 4 })
  })
  it('returns line/index for the last line', () => {
    const finder = new LineColumnFinder(testString)
    expect(finder.index(36)).toStrictEqual({ line: 5, col: 1 })
  })
})
