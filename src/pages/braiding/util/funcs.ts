export const newArr = (n: number, v: any) => (new Array(n)).fill(v);
export const asWord = (isOver: any) => (isOver && 'o') || 'u';
export const asValue = (word: string) => {
  word = word.trim();
  if (word.includes(' ')) {
    return [].concat(...word.split(' ').map(asValue));
  }
  let n = 1;
  let isOver = true;
  try {
    const [ matchedNum ] = (word.match(/\d+/) || []);
    n = Number(matchedNum || 1);
    isOver = /^o/.test(word);
  } catch (error) { /* */ }
  return newArr(n, isOver);
};
export const asString = (bin: string) => {
  const overUnders = bin.split('').map(Number).map(asWord);
  // @ts-ignore
  overUnders.push('f');
  let p = overUnders.shift();
  let same = 1;
  overUnders.forEach(ou => {
    if (p.slice(-1) === ou) {
      same += 1;
    } else {
      p += `${same > 1 ? same : ''} ${ou}`;
      same = 1;
    }
  });
  return p.replace(/ f/g, '');
}
export const compressPattern = (rows, left, right, leftClr, rightClr, matrix) => [
  rows,
  left,
  right,
  leftClr,
  rightClr,
  matrix.map(
    r => r.map(
      c => parseInt(c.map(v => v && 1 || 0).join(''), 2).toString(36)
    ).join('|')
  ).join(';')
].join(',');
export const decompressPattern = (str: string) => {
  const [ rows, left, right, leftClr, rightClr, patternStr ] = str.split(',');
  const len = [ Number(left), Number(right) ];
  return {
    rows,
    left, right, leftClr, rightClr,
    pattern: patternStr
      .split(';')
      .map(row => row
        .split('|')
        .map((side, i) => parseInt(side, 36)
          .toString(2)
          .padStart(len[i], '0')
          .split('')
          .map(nub => !!parseInt(nub, 2))
        )
      )
  }
};
