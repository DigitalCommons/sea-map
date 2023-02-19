

export function arrayMax(array: number[]) {
  return array.reduce((a, b) => Math.max(a ?? Number.NEGATIVE_INFINITY, b ?? Number.NEGATIVE_INFINITY));
}

export function arrayMin(array: number[]) {
  return array.reduce((a, b) => Math.min(a ?? Number.POSITIVE_INFINITY, b ?? Number.POSITIVE_INFINITY));
}
