export default function gcd(x: number,y: number): number {
  if( y === 0 ) return x;

  return gcd(y, x % y);
}
